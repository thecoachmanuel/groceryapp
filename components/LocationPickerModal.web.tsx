import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocationStore } from '@/store/location.store'
import { images } from '@/constants'

const DEFAULT_COORDS = { latitude: 6.5244, longitude: 3.3792 }
const SEARCH_DEBOUNCE_MS = 350
const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBApA5GvxiEjCOHAoxfEPwwRDp0Djvifrs'

interface LocationPickerModalProps {
  visible: boolean
  onClose: () => void
  titleNote?: string
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
  const [isLocatingUser, setIsLocatingUser] = useState(false)

  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: latitude || DEFAULT_COORDS.latitude,
    longitude: longitude || DEFAULT_COORDS.longitude,
  })

  const [selectedAddress, setSelectedAddress] = useState(address || 'Lagos, Nigeria')

  useEffect(() => {
    if (visible) {
      if (latitude && longitude) {
        setCurrentCoords({ latitude, longitude })
      }
      if (address) {
        setSelectedAddress(address)
      }
    }
  }, [visible, latitude, longitude, address])

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

  const fetchGPSLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsLocatingUser(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setCurrentCoords({ latitude: lat, longitude: lng })
          await reverseGeocodeWithGoogle(lat, lng)
          setIsLocatingUser(false)
        },
        (error) => {
          setIsLocatingUser(false)
          Alert.alert('Location Notice', 'Could not get current GPS position. You can search your address directly.')
        },
        { timeout: 10000, enableHighAccuracy: true }
      )
    } else {
      Alert.alert('Location Not Supported', 'Browser geolocation is not available.')
    }
  }

  const reverseGeocodeWithGoogle = async (lat: number, lng: number) => {
    try {
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`
      )
      const data = await resp.json()
      if (data.results && data.results.length > 0) {
        const formatted = data.results[0].formatted_address
        setSelectedAddress(formatted)
        return
      }
      setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } catch {
      setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    }
  }

  const fetchPredictions = async (queryText: string) => {
    try {
      setIsSearching(true)
      // Use Google Maps Geocoding API for accurate search
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          queryText
        )}&key=${GOOGLE_MAPS_KEY}`
      )
      const data = await resp.json()
      if (data.results && data.results.length > 0) {
        setPredictions(
          data.results.map((r: any) => ({
            display_name: r.formatted_address,
            lat: r.geometry.location.lat,
            lon: r.geometry.location.lng,
          }))
        )
      } else {
        // Fallback to OpenStreetMap if Google returns no results
        const fallbackResp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            queryText
          )}&format=json&addressdetails=1&limit=5`,
          { headers: { 'User-Agent': 'GroceryApp/1.0' } }
        )
        const fallbackData = await fallbackResp.json()
        setPredictions(fallbackData || [])
      }
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
    setPredictions([])
    setSearch('')
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

  const mapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${encodeURIComponent(
    selectedAddress || `${currentCoords.latitude},${currentCoords.longitude}`
  )}&zoom=15`

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* Header Bar */}
        <View className="pt-10 pb-3 px-5 border-b-2 border-primary/10 flex-row items-center justify-between bg-white z-10">
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
                Google Map Location Picker
              </Text>
            )}
          </View>

          <View className="size-5" />
        </View>

        {/* Search Bar Input */}
        <View className="p-4 bg-white z-20 shadow-sm border-b-2 border-primary/10 max-w-2xl w-full mx-auto">
          <View className="flex-row items-center bg-white border-2 border-primary/15 rounded-full px-4 py-2.5 shadow-md shadow-black/10">
            <Text className="text-base mr-2">🔍</Text>
            <TextInput
              placeholder="Search address, landmark, area or city..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9CA3AF"
              className="flex-1 font-quicksand-semibold text-sm text-dark-100"
            />
            {isSearching && <ActivityIndicator size="small" color="#53B175" />}
            {search.length > 0 && !isSearching && (
              <TouchableOpacity onPress={() => { setSearch(''); setPredictions([]); }}>
                <Text className="text-gray-400 font-bold px-1">✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Predictions Dropdown */}
          {predictions.length > 0 && (
            <View className="mt-2 bg-white rounded-2xl border-2 border-primary/15 overflow-hidden shadow-2xl z-30">
              <FlatList
                data={predictions}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectPrediction(item)}
                    className="p-3.5 border-b border-gray-100 flex-row items-center hover:bg-gray-50"
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

        {/* Google Map Interactive Frame */}
        <View className="flex-1 w-full bg-gray-100 relative p-4 max-w-3xl mx-auto">
          <View className="flex-1 w-full rounded-3xl overflow-hidden border-2 border-primary/20 shadow-md shadow-black/10">
            <iframe
              title="Google Map"
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 300, width: '100%', height: '100%' }}
              loading="lazy"
              allowFullScreen
            />
          </View>

          {/* GPS Auto-Detect Floating Button */}
          <TouchableOpacity
            onPress={fetchGPSLocation}
            disabled={isLocatingUser}
            className="absolute bottom-8 right-8 bg-white border-2 border-primary/30 px-4 py-2.5 rounded-full flex-row items-center shadow-lg shadow-black/15 active:scale-95"
          >
            {isLocatingUser ? (
              <ActivityIndicator size="small" color="#53B175" className="mr-2" />
            ) : (
              <Text className="text-base mr-2">🎯</Text>
            )}
            <Text className="text-primary font-quicksand-bold text-xs">
              Detect GPS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selected Address Preview & Confirm Bar */}
        <View className="p-5 bg-white border-t-2 border-primary/10 shadow-2xl max-w-2xl w-full mx-auto">
          <View className="flex-row items-start mb-3">
            <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3 mt-0.5 border border-primary/20">
              <Text className="text-base">📍</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-quicksand-semibold text-gray-400 uppercase tracking-wider">
                Delivery Address Selected
              </Text>
              <Text
                className="text-sm font-quicksand-bold text-dark-100 mt-0.5"
                numberOfLines={2}
              >
                {selectedAddress}
              </Text>
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
            style={{ backgroundColor: '#53B175' }}
          >
            <Text className="text-white font-quicksand-bold text-base">
              Confirm Delivery Location
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
