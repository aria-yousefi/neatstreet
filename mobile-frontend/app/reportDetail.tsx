// This is a new file
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Modal, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { getSingleUserReport, getSingleScrapedReport, Report, ScrapedReport } from '../src/lib/api';

export default function ReportDetailScreen() {
  const { id, reportType } = useLocalSearchParams<{ id: string; reportType: 'user' | 'scraped' }>();
  const [report, setReport] = useState<Report | ScrapedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!id || !reportType) {
      setError('Report information is missing.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const fetchedReport = reportType === 'user'
          ? await getSingleUserReport(id)
          : await getSingleScrapedReport(id);
        setReport(fetchedReport);
      } catch (e: any) {
        setError(e.message ?? 'Failed to fetch report details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, reportType]);

  function formatTimestamp(ts: any) {
    if (typeof ts !== 'string') {
      return 'Invalid date';
    }
    const date = new Date(ts);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    // Format date as MM/DD/YYYY
    const dateString = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // Format time as 12:00 AM/PM
    const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return `${dateString} at ${timeString}`;
  }

  const handleGoToMap = () => {
    if (!report) return;
    router.navigate({
      pathname: '/', // Navigate to the root of the app, which is the map screen. The map will handle the params.
      params: {
        latitude: String(report.latitude),
        longitude: String(report.longitude),
        // Also pass the ID and type so the map can find and open the correct callout.
        id: String(report.id),
        reportType: reportType,
      },
    });
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  if (error || !report) {
    return <View style={styles.center}><Text style={{ color: 'red' }}>{error || 'Report not found.'}</Text></View>;
  }

  // Differentiate between report types for properties
  const isUserReport = 'timestamp' in report;
  const displayDate = isUserReport ? report.timestamp : report.date_created;
  const displayIssueType = (isUserReport && report.issue_type === 'other' && report.user_defined_issue_type)
    ? report.user_defined_issue_type
    : report.issue_type;

  const imageUrl = report.image_url as string | undefined;
  // Check if there is a valid image URL that is not a placeholder.
  const hasRealImage = imageUrl && !imageUrl.includes('no-image.jpg');
  const imageSource = hasRealImage ? { uri: imageUrl } : require('../assets/images/happy-city.png');
  const placeholderSource = (isUserReport && (report as Report).thumbnail_url) ? { uri: (report as Report).thumbnail_url } : undefined;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => hasRealImage && setModalVisible(true)} disabled={!hasRealImage}>
        <Image
          source={imageSource}
          style={styles.hero}
          // Use 'contain' to ensure the entire image is visible without being cropped.
          // contentFit="contain"
          transition={300}
        />
      </Pressable>
      <View style={styles.section}>        
        <View style={styles.headerRow}>
          <Text style={styles.title}>{displayIssueType?.toString().toUpperCase()}</Text>
          {report.status && (() => {
            const lowerStatus = report.status.toString().toLowerCase();
            const chipStyle = lowerStatus.includes('close')
              ? styles.statusChipClosed
              : (lowerStatus.includes('progress') || lowerStatus.includes('inprocess'))
                ? styles.statusChipOpen
                : styles.statusChipSubmitted; // Default to blue

            return (
              <View style={[styles.statusChip, chipStyle]}>
                <Text style={styles.statusChipText}>{report.status.toString()}</Text>
              </View>
            );
          })()}
        </View>
        <Text style={styles.meta}>{formatTimestamp(displayDate)}</Text>
      </View>
      {report.details && (<View style={styles.section}><Text style={styles.label}>Details</Text><Text style={styles.value}>{report.details}</Text></View>)}
      <View style={styles.section}><Text style={styles.label}>Address</Text><Text style={styles.value}>{report.address}</Text></View>
      {/* <View style={styles.section}><Text style={styles.label}>Coordinates</Text><Text style={styles.value}>{report.latitude}, {report.longitude}</Text></View> */}

      <View style={styles.section}>
        <Pressable style={styles.mapButton} onPress={handleGoToMap}>
          <Text style={styles.mapButtonText}>Go to on Map</Text>
        </Pressable>
      </View>

      {/* <View style={styles.section}><Text style={styles.label}>Report ID</Text><Text style={styles.value}>{report.id}</Text></View> */}

      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView
            style={styles.zoomScrollViewContainer}
            contentContainerStyle={styles.zoomScrollView}
            maximumZoomScale={4} // Allow zooming up to 4x
            minimumZoomScale={1}
            centerContent
          >
            <Image
              source={imageSource}
              style={styles.fullscreenImage}
              contentFit="contain"
            />
          </ScrollView>
          <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Styles from your old ReportDetailScreen.js
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { width: '100%', height: 280, backgroundColor: '#f2f2f2' },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: { fontSize: 22, fontWeight: '800', flex: 1 },
  meta: { marginTop: 6, color: '#666' },
  label: { fontSize: 12, color: '#666', marginBottom: 6 },
  value: { fontSize: 16, fontWeight: '600' },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  statusChipOpen: {
    backgroundColor: '#FF9800', // Orange
  },
  statusChipSubmitted: {
    backgroundColor: '#2196F3', // Blue for submitted/new
  },
  statusChipClosed: {
    backgroundColor: '#4CAF50', // Green
  },
  statusChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomScrollViewContainer: {
    width: '100%',
    height: '100%',
  },
  zoomScrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FB8C00',
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
