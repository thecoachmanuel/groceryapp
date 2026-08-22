import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import { useLocationStore } from '@/store/location.store'
import { images } from '@/constants'

const DEFAULT_COORDS = { latitude: 6.5244, longitude: 3.3792 } // Lagos, Nigeria fallback
const SEARCH_DEBOUNCE_MS = 400

interface LocationPickerModalProps {
  visible: boolean
  onClose: () => void
  titleNote?: string
}

class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn('MapView ErrorBoundary caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <View className="flex-1 items-center justify-center p-6 bg-gray-50">
            <Text className="text-4xl mb-2 font-quicksand-bold">📍</Text>
            <Text className="text-base font-quicksand-bold text-dark-100 text-center mb-1">
              Map View Unavailable
            </Text>
            <Text className="text-xs font-quicksand-medium text-gray-500 text-center">
              You can search for your area above or use GPS to set your delivery location.
            </Text>
          </View>
        )
      )
    }
    return this.props.children
  }
}

export default function LocationPickerModal({
  visible,
  onClose,
  titleNote,
}: LocationPickerModalProps) {
  const { address, latitude, longitude, setLocation } = useLocationStore()

  const [search, setSearch] = useState('')
  const [predictions, setPredictions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isLocatingUser, setIsLocatingUser] = useState(false)

  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: latitude || DEFAULT_COORDS.latitude,
    longitude: longitude || DEFAULT_COORDS.longitude,
  })

  const [selectedAddress, setSelectedAddress] = useState(address || 'Lagos, Nigeria')

  const mapRef = useRef<MapView>(null)

  useEffect(() => {
    if (visible) {
      if (latitude && longitude) {
        setCurrentCoords({ latitude, longitude })
        setTimeout(() => animateMapTo(latitude, longitude), 300)
      } else {
        fetchGPSLocation()
      }
    }
  }, [visible])

  useEffect(() => {
    if (search.trim().length < 3) {
      setPredictions([])
      return
    }
    const timer = setTimeout(() => {
      fetchPredictions(search)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  const animateMapTo = (lat: number, lng: number) => {
    try {
      mapRef.current?.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        500
      )
    } catch (e) {
      console.log('animateMapTo error:', e)
    }
  }

  const fetchGPSLocation = async () => {
    try {
      setIsLocatingUser(true)
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Location Access Required',
          'Please allow location access to auto-detect your delivery address, or search manually.'
        )
        return
      }

      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null)

      if (!loc) {
        loc = await Location.getLastKnownPositionAsync().catch(() => null)
      }

      if (loc?.coords) {
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
        setCurrentCoords(coords)
        animateMapTo(coords.latitude, coords.longitude)
        await reverseGeocode(coords.latitude, coords.longitude)
      }
    } catch (err) {
      console.log('GPS fetch error:', err)
    } finally {
      setIsLocatingUser(false)
    }
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true)
    try {
      // 1. Primary Expo Location Reverse Geocoding
      const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }).catch(
        () => [null]
      )
      if (geo) {
        const streetNumber = geo.streetNumber || ''
        const street = geo.street || geo.name || ''
        const streetLine = [streetNumber, street].filter(Boolean).join(' ').trim()

        const district = geo.district || geo.subregion || ''
        const city = geo.city || geo.region || ''
        const country = geo.country || ''

        const rawParts = [streetLine, district, city, country].filter(Boolean)
        const uniqueParts: string[] = []
        rawParts.forEach((part) => {
          if (!uniqueParts.includes(part)) uniqueParts.push(part)
        })

        const formatted = uniqueParts.join(', ')
        if (formatted && formatted.length > 3) {
          setSelectedAddress(formatted)
          return
        }
      }

      // 2. OpenStreetMap Nominatim Detailed Reverse Geocoding Fallback
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'User-Agent': 'GroceryApp/1.0' } }
      ).catch(() => null)

      if (resp && resp.ok) {
        const data = await resp.json().catch(() => null)
        if (data && data.address) {
          const a = data.address
          const houseNumber = a.house_number || a.building || ''
          const road = a.road || a.street || a.pedestrian || a.suburb || a.neighbourhood || ''
          const streetLine = [houseNumber, road].filter(Boolean).join(' ').trim()

          const suburb = a.suburb || a.neighbourhood || a.quarter || ''
          const city = a.city || a.town || a.county || a.state || ''
          const country = a.country || ''

          const fullParts = [streetLine, suburb, city, country].filter(Boolean)
          const uniqueOsmParts: string[] = []
          fullParts.forEach((p) => {
            if (!uniqueOsmParts.includes(p)) uniqueOsmParts.push(p)
          })

          const osmFormatted = uniqueOsmParts.join(', ')
          if (osmFormatted && osmFormatted.length > 3) {
            setSelectedAddress(osmFormatted)
            return
          }

          if (data.display_name) {
            setSelectedAddress(data.display_name)
            return
          }
        }
      }

      setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } catch {
      setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } finally {
      setIsGeocoding(false)
    }
  }

  const fetchPredictions = async (queryText: string) => {
    try {
      setIsSearching(true)
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          queryText
        )}&format=json&addressdetails=1&limit=5`,
        { headers: { 'User-Agent': 'GroceryApp/1.0' } }
      )
      const data = await resp.json()
      setPredictions(data || [])
    } catch {
      setPredictions([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectPrediction = (place: any) => {
    const lat = parseFloat(place.lat)
    const lng = parseFloat(place.lon)
    if (isNaN(lat) || isNaN(lng)) return
    const coords = { latitude: lat, longitude: lng }
    setCurrentCoords(coords)
    setSelectedAddress(place.display_name)
    setIsGeocoding(false)
    setPredictions([])
    setSearch('')
    animateMapTo(lat, lng)
  }

  const handleMarkerDragEnd = (e: any) => {
    const coord = e?.nativeEvent?.coordinate
    if (!coord || typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') return
    const { latitude: lat, longitude: lng } = coord
    setCurrentCoords({ latitude: lat, longitude: lng })
    reverseGeocode(lat, lng)
  }

  const handleConfirm = () => {
    setLocation(selectedAddress, currentCoords, true)
    onClose()
  }

  const handleSaveAsLabel = (label: 'Home' | 'Work') => {
    const { addSavedAddress } = useLocationStore.getState()
    addSavedAddress({
      label,
      address: selectedAddress,
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
    })
    setLocation(selectedAddress, currentCoords, true)
    onClose()
    Alert.alert('Address Saved!', `Location saved as your ${label} address.`)
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* Header Bar */}
        <View className="pt-12 pb-3 px-5 border-b-2 border-primary/10 flex-row items-center justify-between bg-white z-10">
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1">
            <Image source={images.arrowBack} className="size-5" resizeMode="contain" />
          </TouchableOpacity>

          <View className="items-center flex-1 mx-3">
            <Text className="text-lg font-quicksand-bold text-dark-100">
              Select Delivery Location
            </Text>
            {titleNote ? (
              <Text className="text-xs font-quicksand-medium text-primary">{titleNote}</Text>
            ) : (
              <Text className="text-xs font-quicksand-medium text-gray-400">
                Search or drag pin on map
              </Text>
            )}
          </View>

          <View className="size-5" />
        </View>

        {/* Search Bar Input */}
        <View className="p-4 bg-white z-20 shadow-sm border-b-2 border-primary/10">
          <View className="flex-row items-center bg-white border-2 border-primary/10 rounded-full px-4 py-2.5 shadow-md shadow-black/10">
            <Text className="text-base mr-2">🔍</Text>
            <TextInput
              placeholder="Search street, area, city or landmark..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9CA3AF"
              className="flex-1 font-quicksand-semibold text-sm text-dark-100"
            />
            {isSearching && <ActivityIndicator size="small" color="#16A34A" />}
            {search.length > 0 && !isSearching && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text className="text-gray-400 font-bold px-2">✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Predictions List */}
          {predictions.length > 0 && (
            <View className="bg-white rounded-3xl mt-2 border-2 border-primary/10 max-h-48 shadow-xl">
              <FlatList
                data={predictions}
                keyExtractor={(_, index) => index.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectPrediction(item)}
                    className="p-3.5 border-b border-gray-100 flex-row items-center"
                  >
                    <Text className="text-base mr-2">📍</Text>
                    <Text className="flex-1 font-quicksand-medium text-xs text-dark-100">
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* Interactive Map View with ErrorBoundary */}
        <View className="flex-1 relative bg-gray-100">
          <MapErrorBoundary>
            <MapView
              ref={mapRef}
              style={{ width: '100%', height: '100%' }}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              initialRegion={{
                latitude: currentCoords.latitude,
                longitude: currentCoords.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              onPress={(e) => handleMarkerDragEnd(e)}
            >
              <Marker
                coordinate={currentCoords}
                draggable
                onDragEnd={handleMarkerDragEnd}
                title="Delivery Location"
                description={selectedAddress}
              />
            </MapView>
          </MapErrorBoundary>

          {/* GPS Locate Button Overlay */}
          <TouchableOpacity
            onPress={fetchGPSLocation}
            disabled={isLocatingUser}
            className="absolute bottom-4 right-4 bg-white p-3.5 rounded-full shadow-lg border-2 border-primary/10 flex-row items-center justify-center active:opacity-80 z-10"
          >
            {isLocatingUser ? (
              <ActivityIndicator size="small" color="#16A34A" />
            ) : (
              <Text className="text-lg">🎯</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Selected Address Preview & Confirm Bar */}
        <View className="p-5 bg-white border-t-2 border-primary/10 shadow-2xl">
          <View className="flex-row items-start mb-3">
            <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3 mt-0.5 border border-primary/20">
              <Text className="text-base">📍</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-quicksand-semibold text-gray-400 uppercase tracking-wider">
                Selected Address
              </Text>
              {isGeocoding ? (
                <View className="flex-row items-center mt-1">
                  <ActivityIndicator size="small" color="#16A34A" className="mr-2" />
                  <Text className="text-gray-400 font-quicksand-medium text-sm">
                    Fetching address details...
                  </Text>
                </View>
              ) : (
                <Text
                  className="text-sm font-quicksand-bold text-dark-100 mt-0.5"
                  numberOfLines={2}
                >
                  {selectedAddress}
                </Text>
              )}
            </View>
          </View>

          {/* Quick Save Buttons */}
          <View className="flex-row gap-2 mb-3">
            <TouchableOpacity
              onPress={() => handleSaveAsLabel('Home')}
              className="flex-1 bg-primary/10 border border-primary/30 py-2.5 rounded-full items-center"
            >
              <Text className="text-primary font-quicksand-bold text-xs">🏠 Save as Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSaveAsLabel('Work')}
              className="flex-1 bg-primary/10 border border-primary/30 py-2.5 rounded-full items-center"
            >
              <Text className="text-primary font-quicksand-bold text-xs">💼 Save as Work</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleConfirm}
            className="bg-primary py-3.5 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:opacity-90"
          >
            <Text className="text-white font-quicksand-bold text-base">
              Use Current Location
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

