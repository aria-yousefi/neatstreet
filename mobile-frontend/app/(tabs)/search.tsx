import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { searchReports, SearchResult, getAllReports, getScrapedReports } from '../../src/lib/api';
import { Image } from 'expo-image';
import * as Location from 'expo-location';

interface SimpleCoords {
  latitude: number;
  longitude: number;
}

// Debounce hook to prevent API calls on every keystroke
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// By extracting the list item into its own memoized component, we prevent
// it from re-rendering unless its specific `item` prop changes. This is a
// key performance optimization for FlatList and resolves the VirtualizedList warning.
const SearchResultItem = React.memo(({ item }: { item: SearchResult }) => {
  const router = useRouter();
  const imageUrl = item.type === 'user' ? item.thumbnail_url : item.image_url;
  const issueType = item.type === 'user' && item.issue_type === 'other' ? item.user_defined_issue_type : item.issue_type;

  const hasRealImage = imageUrl && !imageUrl.includes('no-image.jpg');
  const imageSource = hasRealImage ? { uri: imageUrl } : require('../../assets/images/happy-city.png');

  return (
    <Pressable
      style={styles.resultItem}
      onPress={() =>
        router.push({
          pathname: '../reportDetail',
          params: { id: String(item.id), reportType: item.type },
        })
      }
    >
      <Image
        source={imageSource}
        style={styles.resultImage}
        transition={300}
      />
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultText} numberOfLines={1}>{issueType}</Text>
        <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
      </View>
    </Pressable>
  );
});

const renderItem = ({ item }: { item: SearchResult }) => <SearchResultItem item={item} />;

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<SimpleCoords | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const debouncedQuery = useDebounce(query, 400); // 400ms debounce delay

  // Effect to get user's location on mount
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to show nearby issues.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation(location.coords);
    })();
  }, []);

  const fetchNearbyReports = useCallback(async () => {
    if (!userLocation) return;

    setLoading(true);
    setError(null);
    try {
      const region = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      const bounds = {
        sw_lat: region.latitude - region.latitudeDelta / 2,
        sw_lng: region.longitude - region.longitudeDelta / 2,
        ne_lat: region.latitude + region.latitudeDelta / 2,
        ne_lng: region.longitude + region.longitudeDelta / 2,
      };
      const [userReports, scrapedReports] = await Promise.all([
        getAllReports(bounds),
        getScrapedReports(bounds),
      ]);

      const mappedUserReports: SearchResult[] = userReports.map(r => ({ ...r, type: 'user' }));
      const mappedScrapedReports: SearchResult[] = scrapedReports.map(r => ({ ...r, type: 'scraped' }));
      const combined = [...mappedUserReports, ...mappedScrapedReports];
      const sorted = combined.sort((a, b) => {
        const dateA = new Date(a.type === 'user' ? a.timestamp! : a.date_created).getTime();
        const dateB = new Date(b.type === 'user' ? b.timestamp! : b.date_created).getTime();
        return dateB - dateA;
      });
      setResults(sorted);
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch nearby reports.');
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  // Effect to handle searching or fetching nearby reports
  useEffect(() => {
    const performSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchResults = await searchReports(debouncedQuery);
        setResults(searchResults);
      } catch (e: any) {
        setError(e.message ?? 'Search failed.');
      } finally {
        setLoading(false);
      }
    };

    if (debouncedQuery.length >= 3) {
      performSearch();
    } else if (debouncedQuery.length === 0) {
      fetchNearbyReports();
    } else {
      setResults([]);
    }
  }, [debouncedQuery, fetchNearbyReports]);

  const handleCancel = () => {
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search by issue type or details..."
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoFocus
            clearButtonMode="while-editing"
          />
          {isFocused && <Pressable onPress={handleCancel} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></Pressable>}
        </View>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} size="large" />}
      
      {error && <Text style={styles.errorText}>{error}</Text>}

      {!loading && !error && results.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {debouncedQuery.length >= 3 ? `No results found for "${debouncedQuery}"` : 'Enter a search term to begin, or see nearby issues below.'}
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={renderItem}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 24 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchContainer: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
  },
  cancelButton: { padding: 8 },
  cancelButtonText: { color: '#FB8C00', fontSize: 16, fontWeight: '600' },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#666', textAlign: 'center' },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  resultImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: '#f0f0f0' },
  resultTextContainer: { flex: 1 },
  resultText: { fontSize: 16, fontWeight: '600' },
  resultAddress: { fontSize: 14, color: '#666', marginTop: 2 },
});