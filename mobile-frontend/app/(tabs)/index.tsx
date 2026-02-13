import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { getAllReports, getScrapedReports, Report, ScrapedReport } from '../../src/lib/api';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import { mapStyle } from '../../src/lib/map-style';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

interface SimpleCoords {
  latitude: number;
  longitude: number;
}

// This will be our unified type for map display
type MapReport = {
  id: string; // Unique ID for the map marker: 'user-1' or 'scraped-1'
  type: 'user' | 'scraped';
  latitude: number;
  longitude: number;
  issue_type: string;
  address?: string;
  details?: string;
  image_url?: string; // Only for user reports
  status?: string; // Only for scraped reports
  thumbnail_url?: string;
  timeAgo: string;
  pinColor: string;
  // Keep original data for navigation
  originalReport: Report | ScrapedReport;
};

export default function FeedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ latitude?: string, longitude?: string, refresh?: string, id?: string, reportType?: 'user' | 'scraped' }>();
  const [reports, setReports] = useState<MapReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<SimpleCoords | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  // Use ReturnType<typeof setTimeout> to get the correct timer ID type
  // for the environment (number in RN/web, NodeJS.Timeout in Node).
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);
  const markerRefs = useRef<Map<string, Marker | null>>(new Map());
  const requestCounter = useRef(0); // Used to prevent race conditions
  const [isTracking, setIsTracking] = useState(false); // State to control marker tracking

  const calculateTimeAgo = (dateString?: string): string => {
    if (!dateString) return '';
    
    const reportDate = new Date(dateString);
    if (isNaN(reportDate.getTime())) return '';
  
    const now = new Date();
    const diffMs = now.getTime() - reportDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    // Per your request, any report over 30 days old will show "30+ days ago"
    if (diffDays > 30) return '>30d ago';
    
    return `${diffDays}d ago`;
  };

  const getPinColor = (status?: string): string => {
    if (!status) {
      return 'red'; // Default color for reports without a status
    }
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('close')) {
      return 'green';
    }
    if (lowerStatus.includes('progress') || lowerStatus.includes('inprocess') || lowerStatus.includes('onhold')) {
      return 'orange';
    }
    if (lowerStatus.includes('submit') || lowerStatus.includes('receive')) {
      return 'teal';
    }
    return 'red'; // Default for any other status
  };

  const loadReportsForRegion = useCallback((region: Region) => {
    // Guard against the region being undefined, which can happen in some edge cases.
    if (!region) {
      return;
    }
    setLoading(true);

    const currentRequest = ++requestCounter.current;

    setCurrentRegion(region);
    const bounds = {
      sw_lat: region.latitude - region.latitudeDelta / 2,
      sw_lng: region.longitude - region.longitudeDelta / 2,
      ne_lat: region.latitude + region.latitudeDelta / 2,
      ne_lng: region.longitude + region.longitudeDelta / 2,
    };

    Promise.all([getAllReports(bounds, statusFilter), getScrapedReports(bounds, statusFilter)])
      .then(([userReports, scrapedReports]) => {
        // If another request has been made since this one started, ignore this result.
        // This prevents stale data from overwriting fresh data.
        if (currentRequest !== requestCounter.current) {
          return;
        }

        const mappedUserReports: MapReport[] = userReports.map((r) => ({
          id: `user-${r.id}`,
          type: 'user',
          latitude: r.latitude,
          longitude: r.longitude,
          issue_type: r.issue_type ?? 'Unknown',
          address: r.address,
          details: r.details,
          image_url: r.image_url,
          status: r.status,
          thumbnail_url: r.thumbnail_url,
          timeAgo: calculateTimeAgo(r.timestamp),
          pinColor: getPinColor(r.status),
          originalReport: r,
        }));

        const mappedScrapedReports: MapReport[] = scrapedReports.map((r) => ({
          id: `scraped-${r.id}`,
          type: 'scraped',
          latitude: r.latitude,
          longitude: r.longitude,
          issue_type: r.issue_type,
          address: r.address,
          details: r.details,
          image_url: r.image_url,
          status: r.status,
          thumbnail_url: r.image_url, // Scraped reports don't have thumbs, so we use the main image
          timeAgo: calculateTimeAgo(r.date_created),
          pinColor: getPinColor(r.status),
          originalReport: r,
        }));

        setReports([...mappedUserReports, ...mappedScrapedReports]);
        setIsTracking(true); // Enable tracking now that new reports are ready to be rendered
      })
      .catch((e) => {
        if (currentRequest === requestCounter.current) {
          setError(e.message ?? String(e));
        }
      })
      .finally(() => {
        if (currentRequest === requestCounter.current) {
          // Give the UI a moment to process the new reports before turning off loading
          setTimeout(() => setLoading(false), 50);
        }
      });
  }, [statusFilter]); // Re-fetch when the status filter changes

  const handleRegionChangeComplete = useCallback((region: Region) => {
    // This is the debounced handler. It waits for the user to stop moving the map
    // for a brief moment before fetching new data.
    if (!region) {
      return;
    }
    // Clear any pending fetch request.
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    // Set a new timer to fetch data after a short delay.
    debounceTimeout.current = setTimeout(() => {
      loadReportsForRegion(region); // Debounce is now 500ms
    }, 500); // 250ms delay
  }, [loadReportsForRegion]);

  useEffect(() => {
    (async () => {
      // This effect handles both initial load and navigation from a detail screen.
      // It prioritizes navigation params over the user's current location.
      if (params.latitude && params.longitude) {
        const lat = parseFloat(params.latitude);
        const lon = parseFloat(params.longitude);

        if (!isNaN(lat) && !isNaN(lon)) {
          // Define the region we want to animate to (very zoomed in).
          const animationRegion = {
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.001, // Zoom in way further
            longitudeDelta: 0.001,
          };
          // Define a slightly larger region for fetching data to ensure the target marker is included.
          const fetchRegion = {
            ...animationRegion,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          // Set the userLocation state to this point. This ensures that if the map is mounting
          // for the first time, it uses these coordinates for its initialRegion.
          setUserLocation({ latitude: lat, longitude: lon });
          // Load reports for this specific region
          loadReportsForRegion(fetchRegion);

          // Set the ID of the report to focus on.
          if (params.id && params.reportType) {
            setFocusedReportId(`${params.reportType}-${params.id}`);
          }

          // Animate to the region for a smooth transition if the map is already mounted
          // Use a short timeout to ensure the map component has had a chance to update
          // with the new userLocation before we try to animate it. This prevents a race condition.
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.animateToRegion(animationRegion, 500);
            }
          }, 100);
          return; // IMPORTANT: Stop execution to prevent fetching user's current location.
        }
      }

      // If no params are present, proceed with finding the user's current location.
      let { status } = await Location.requestForegroundPermissionsAsync();
      const initialRegion: Region = {
        latitude: 29.6516, // Gainesville default
        longitude: -82.325,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied', 'The map will default to a central location.');
        setUserLocation({ latitude: initialRegion.latitude, longitude: initialRegion.longitude });
      } else {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
        initialRegion.latitude = location.coords.latitude;
        initialRegion.longitude = location.coords.longitude;
      }

      loadReportsForRegion(initialRegion);
    })();

    // Cleanup function to clear any pending timeout when the component unmounts.
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [params.latitude, params.longitude, params.id, params.reportType, loadReportsForRegion]);

  useFocusEffect(
    useCallback(() => {
      if (params.refresh && currentRegion) {
        loadReportsForRegion(currentRegion);
      }
    }, [params.refresh, currentRegion, loadReportsForRegion])
  );

  useEffect(() => {
    // When the filter changes, reload reports for the current map view.
    if (currentRegion) {
      loadReportsForRegion(currentRegion);
    }
  }, [statusFilter, currentRegion, loadReportsForRegion]);

  useEffect(() => {
    // This effect turns off tracking after a short delay, once markers have rendered.
    if (isTracking) {
      const timer = setTimeout(() => setIsTracking(false), 500); // Track for half a second
      return () => clearTimeout(timer);
    }
  }, [isTracking]);

  const [focusedReportId, setFocusedReportId] = useState<string | null>(null);

  useEffect(() => {
    // This effect programmatically opens a marker's callout when navigated to from another screen.
    if (focusedReportId && reports.length > 0) {
      const marker = markerRefs.current.get(focusedReportId);
      if (marker) {
        // The map animation is now 500ms. We wait just a little longer to ensure
        // the animation is complete and the marker is ready before showing the callout. This
        // makes the callout appear much more quickly.
        setTimeout(() => {
          marker.showCallout();
          setFocusedReportId(null); // Reset to prevent re-triggering
        }, 600);
      }
    }
  }, [focusedReportId, reports]); // This effect depends on the focused ID and the list of reports.

  if (!userLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Finding your location...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingIndicator}>
          <ActivityIndicator size="large" />
        </View>
      )}
      <ClusteredMapView
        ref={mapRef}
        showsUserLocation
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        clusterColor="#FB8C00" // Use brand orange for clusters
        clusterTextColor="#FFFFFF" // White text for the number inside the cluster
        // --- Clustering Performance Optimizations ---
        // Disable animations for a snappier feel when clusters break apart or form.
        animationEnabled={false}
        // Increase the radius (default is 40) to create larger, more stable clusters.
        // This reduces the frequency of re-clustering on small map movements.
        radius={60}
        // customMapStyle is for Google Maps (Android), showsPointsOfInterest is for Apple Maps (iOS)
        showsPointsOfInterest={false}
        customMapStyle={mapStyle}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {reports.map((report) => (
          <Marker
            pinColor={report.pinColor}
            ref={(el) => markerRefs.current.set(report.id, el)}
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            // This is a key performance optimization. It tells the map that the
            // marker's view is static and does not need to be re-rendered on every frame.
            // We now use a dedicated `isTracking` state for more precise control.
            tracksViewChanges={isTracking}
          >
            {/* The marker is now always the default pin */}
            <Callout
              tooltip
              onPress={() =>
                router.push({
                  // The detail screen is at the root, so we need to go up one level from '(tabs)'
                  pathname: '../reportDetail',
                  // Pass only the ID and type. The detail screen will fetch the rest.
                  params: {
                    id: report.originalReport.id.toString(),
                    reportType: report.type,
                  },
                })
              }
            >
              <View style={styles.calloutContainer}>
                {report.thumbnail_url && !report.thumbnail_url.includes('no-image.jpg') && (
                  <Image
                    source={{ uri: report.thumbnail_url }}
                    style={styles.calloutImage}
                    transition={300} // Fade in animation
                  />
                )}
                <View style={styles.metaContainer}>
                  <Text style={styles.timeAgoText}>{report.timeAgo}</Text>
                  {report.status && (() => {
                    const lowerStatus = report.status.toLowerCase();
                    const chipStyle = lowerStatus.includes('close')
                      ? styles.statusChipClosed
                      : (lowerStatus.includes('progress') || lowerStatus.includes('inprocess') || lowerStatus.includes('onhold'))
                        ? styles.statusChipOpen
                        : styles.statusChipSubmitted; // Default to blue

                    return (
                      <View style={[styles.statusChip, chipStyle]}>
                        <Text style={styles.statusChipText}>{report.status}</Text>
                      </View>
                    );
                  })()}
                </View>
                <Text style={styles.calloutText}>{report.issue_type === 'other' && (report.originalReport as Report).user_defined_issue_type ? (report.originalReport as Report).user_defined_issue_type : report.issue_type}</Text>
                <Text style={styles.calloutSubtext}>Tap to see details</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </ClusteredMapView>
     
      {/* Use a relative path for consistency */}
      <Pressable style={styles.newBtn} onPress={() => router.push('./camera')}>
        <Text style={styles.newBtnText}>+ New Report</Text>
      </Pressable>

      <View style={styles.bottomLeftContainer}>
        {isFilterMenuVisible && (
          <View style={styles.filterMenu}>
            <Pressable
              style={[styles.filterMenuItem, statusFilter === 'all' && styles.filterMenuItemSelected]}
              onPress={() => { setStatusFilter('all'); setIsFilterMenuVisible(false); }}>
              <Text style={[styles.filterMenuItemText, statusFilter === 'all' && styles.filterMenuItemTextSelected]}>All Reports</Text>
            </Pressable>
            <Pressable
              style={[styles.filterMenuItem, statusFilter === 'open' && styles.filterMenuItemSelected]}
              onPress={() => { setStatusFilter('open'); setIsFilterMenuVisible(false); }}>
              <Text style={[styles.filterMenuItemText, statusFilter === 'open' && styles.filterMenuItemTextSelected]}>Open</Text>
            </Pressable>
            <Pressable
              style={[styles.filterMenuItem, statusFilter === 'closed' && styles.filterMenuItemSelected]}
              onPress={() => { setStatusFilter('closed'); setIsFilterMenuVisible(false); }}>
              <Text style={[styles.filterMenuItemText, statusFilter === 'closed' && styles.filterMenuItemTextSelected]}>Closed</Text>
            </Pressable>
          </View>
        )}
        <Pressable
          style={styles.filterFab}
          onPress={() => setIsFilterMenuVisible(!isFilterMenuVisible)}
        >
          <Ionicons
            name={isFilterMenuVisible ? 'close' : 'filter'}
            size={24} color="white"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingIndicator: {
    position: 'absolute',
    top: 60,
    left: '50%',
    marginLeft: -20, // Half of width
    zIndex: 10,
  },
  error: { color: 'red', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  newBtn: {
    position: 'absolute',
    bottom: 34,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 99,
    backgroundColor: '#FB8C00', // Use brand orange
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newBtnText: { fontWeight: '700', fontSize: 16, color: '#fff' },
  calloutContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderColor: '#ddd',
    borderWidth: 1,    width: 150, // Set a fixed width to prevent text from wrapping incorrectly
  },
  calloutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 5,
    flexShrink: 1, // Allow text to shrink if status chip is long
  },
  calloutSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },
  timeAgoText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  statusChipOpen: {
    backgroundColor: '#FF9800', // Orange for open/in-progress
  },
  statusChipSubmitted: {
    backgroundColor: '#2196F3', // Blue for submitted/new
  },
  statusChipClosed: {
    backgroundColor: '#4CAF50', // Green for closed
  },
  statusChipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
   calloutImage: {
    width: 130,
    height: 90,
    marginTop: 5,
    borderRadius: 4,
    alignSelf: 'center',
  },
  calloutAddress: { fontSize: 12, color: '#333', marginTop: 3 },

  bottomLeftContainer: {
    position: 'absolute',
    bottom: 34,
    left: 24,
    alignItems: 'center',
  },
  filterFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FB8C00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filterMenu: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden', // Ensures children conform to rounded corners
  },
  filterMenuItem: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterMenuItemSelected: {
    backgroundColor: '#FB8C001A', // A light orange tint
  },
  filterMenuItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterMenuItemTextSelected: {
    color: '#FB8C00',
  },
});
