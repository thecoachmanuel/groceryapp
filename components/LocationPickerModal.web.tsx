import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocationStore } from '@/store/location.store'
import { images } from '@/constants'

const DEFAULT_COORDS = { latitude: 6.5244, longitude: 3.3792 }
const SEARCH_DEBOUNCE_MS = 300
const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBApA5GvxiEjCOHAoxfEPwwRDp0Djvifrs'

const POPULAR_LOCATIONS = [
  { name: 'Lekki Phase 1, Lagos', coords: { latitude: 6.4474, longitude: 3.4723 } },
  { name: 'Victoria Island, Lagos', coords: { latitude: 6.4281, longitude: 3.4219 } },
  { name: 'Ikeja GRA, Lagos', coords: { latitude: 6.5922, longitude: 3.3564 } },
  { name: 'Yaba, Lagos', coords: { latitude: 6.5095, longitude: 3.3711 } },
  { name: 'Surulere, Lagos', coords: { latitude: 6.4979, longitude: 3.3592 } },
  { name: 'Wuse 2, Abuja', coords: { latitude: 9.0765, longitude: 7.4721 } },
  { name: 'Garki, Abuja', coords: { latitude: 9.0333, longitude: 7.4833 } },
  { name: 'Port Harcourt GRA, Rivers', coords: { latitude: 4.8156, longitude: 7.0498 } },
]

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
    if (search.trim().length < 2) {
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
          const coords = { latitude: lat, longitude: lng }
          setCurrentCoords(coords)
          await reverseGeocode(lat, lng)
          setIsLocatingUser(false)
        },
        (error) => {
          setIsLocatingUser(false)
          Alert.alert('Location Notice', 'Could not access browser GPS. Please select an area below or search manually.')
        },
        { timeout: 8000, enableHighAccuracy: true }
      )
    } else {
      Alert.alert('Notice', 'Browser geolocation is not available on this device.')
    }
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'User-Agent': 'GroceryApp/1.0' } }
      )
      const data = await resp.json()
      if (data && data.display_name) {
        const parts = data.display_name.split(',').map((p: string) => p.trim())
        const shortAddr = parts.slice(0, 4).join(', ')
        setSelectedAddress(shortAddr || data.display_name)
        return
      }
      setSelectedAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    } catch {
      setSelectedAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    }
  }

  const fetchPredictions = async (queryText: string) => {
    try {
      setIsSearching(true)
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          queryText
        )}&format=json&addressdetails=1&limit=6`,
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
    const parts = place.display_name.split(',').map((p: string) => p.trim())
    const shortAddr = parts.slice(0, 4).join(', ')
    setSelectedAddress(shortAddr || place.display_name)
    setPredictions([])
    setSearch('')
  }

  const handleSelectPopular = (loc: typeof POPULAR_LOCATIONS[0]) => {
    setCurrentCoords(loc.coords)
    setSelectedAddress(loc.name)
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
  )}&zoom=14`

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* Header Bar */}
        <View className="pt-10 pb-3 px-5 border-b-2 border-primary/10 flex-row items-center justify-between bg-white z-10 max-w-2xl w-full mx-auto">
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-2 -ml-2">
            <Image source={images.arrowBack} className="size-5" resizeMode="contain" />
          </TouchableOpacity>

          <View className="items-center flex-1 mx-3">
            <Text className="text-lg font-quicksand-bold text-dark-100">
              Select Delivery Location
            </Text>
            <Text className="text-xs font-quicksand-medium text-gray-400">
              {titleNote || 'Search, tap popular zone, or use GPS'}
            </Text>
          </View>

          <TouchableOpacity onPress={onClose} className="p-1">
            <Text className="text-gray-400 font-bold text-sm">✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar Input */}
        <View className="p-4 bg-white z-20 shadow-sm border-b-2 border-primary/10 max-w-2xl w-full mx-auto">
          <View className="flex-row items-center bg-gray-50 border-2 border-primary/15 rounded-full px-4 py-2.5 shadow-sm">
            <Text className="text-base mr-2">🔍</Text>
            <TextInput
              placeholder="Search street, area, estate, city..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9CA3AF"
              className="flex-1 font-quicksand-semibold text-sm text-dark-100 outline-none"
            />
            {isSearching && <ActivityIndicator size="small" color="#53B175" className="mr-1" />}
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(''); setPredictions([]); }}>
                <Text className="text-gray-400 font-bold px-2">✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Predictions Dropdown */}
          {predictions.length > 0 && (
            <View className="mt-2 bg-white rounded-2xl border-2 border-primary/15 overflow-hidden shadow-2xl z-30 max-h-56">
              <FlatList
                data={predictions}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectPrediction(item)}
                    className="p-3 border-b border-gray-100 flex-row items-center active:bg-primary/10"
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

          {/* Quick Popular Zones */}
          <View className="mt-3">
            <Text className="text-[11px] font-quicksand-bold text-gray-400 uppercase tracking-wider mb-2">
              Popular Delivery Hubs:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {POPULAR_LOCATIONS.map((loc, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSelectPopular(loc)}
                  className={`mr-2 px-3 py-1.5 rounded-full border ${
                    selectedAddress === loc.name
                      ? 'bg-primary border-primary'
                      : 'bg-white border-gray-200'
                  }`}
                  style={selectedAddress === loc.name ? { backgroundColor: '#53B175', borderColor: '#53B175' } : {}}
                >
                  <Text
                    className={`text-xs font-quicksand-bold ${
                      selectedAddress === loc.name ? 'text-white' : 'text-dark-100'
                    }`}
                  >
                    📍 {loc.name.split(',')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Google Map Interactive Frame */}
        <View className="flex-1 w-full bg-gray-100 relative p-4 max-w-2xl mx-auto">
          <View className="flex-1 w-full rounded-3xl overflow-hidden border-2 border-primary/20 shadow-md shadow-black/10">
            <iframe
              title="Google Map Location"
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 240, width: '100%', height: '100%' }}
              loading="lazy"
              allowFullScreen
            />
          </View>

          {/* GPS Auto-Detect Floating Button */}
          <TouchableOpacity
            onPress={fetchGPSLocation}
            disabled={isLocatingUser}
            className="absolute bottom-7 right-7 bg-white border-2 border-primary/40 px-4 py-2.5 rounded-full flex-row items-center shadow-xl active:scale-95"
          >
            {isLocatingUser ? (
              <ActivityIndicator size="small" color="#53B175" className="mr-2" />
            ) : (
              <Text className="text-base mr-2">🎯</Text>
            )}
            <Text className="text-primary font-quicksand-bold text-xs" style={{ color: '#53B175' }}>
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
                Selected Address
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
              <Text className="text-primary font-quicksand-bold text-xs" style={{ color: '#53B175' }}>🏠 Save as Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSaveAsLabel('Work')}
              className="flex-1 bg-primary/10 border border-primary/30 py-2.5 rounded-full items-center"
            >
              <Text className="text-primary font-quicksand-bold text-xs" style={{ color: '#53B175' }}>💼 Save as Work</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleConfirm}
            className="bg-primary py-3.5 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:opacity-90"
            style={{ backgroundColor: '#53B175' }}
          >
            <Text className="text-white font-quicksand-bold text-base">
              Set Delivery Location
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
