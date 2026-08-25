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
import * as Location from 'expo-location'
import { useLocationStore } from '@/store/location.store'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Searchbar from '@/components/SearchBar'
import { images } from '@/constants'

const DEFAULT_COORDS = { latitude: 6.5244, longitude: 3.3792 }
const SEARCH_DEBOUNCE_MS = 400

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
  const [isGeocoding, setIsGeocoding] = useState(false)
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

  const insets = useSafeAreaInsets()
  const topInset = Math.max(insets.top || 0, 0)
  const bottomInset = Math.max(insets.bottom || 0, 12)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* Header Bar */}
        <View
          style={{
            paddingTop: topInset,
            backgroundColor: '#ffffff',
            borderBottomColor: '#F1F1F1',
          }}
          className="bg-white z-10 border-b border-[#F1F1F1]"
        >
          <View className="py-3 px-5 flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1">
              <Image source={images.arrowBack} className="size-5" resizeMode="contain" />
            </TouchableOpacity>

            <View className="items-center flex-1 mx-3">
              <Text className="text-lg font-quicksand-bold text-dark-100">
                Select Delivery Location
              </Text>
              {titleNote ? (
                <Text className="text-xs font-quicksand-medium text-primary" style={{ color: '#53B175' }}>{titleNote}</Text>
              ) : (
                <Text className="text-xs font-quicksand-medium text-gray-400">
                  Search address or auto-detect location
                </Text>
              )}
            </View>

            <View className="size-5" />
          </View>
        </View>

        {/* Search Bar Input matching Home screen design */}
        <View className="px-5 py-3 bg-white z-20 shadow-sm border-b border-[#F1F1F1]" style={{ backgroundColor: '#ffffff', borderBottomColor: '#F1F1F1' }}>
          <Searchbar
            value={search}
            onChangeText={setSearch}
            placeholder="Search street, area, city or landmark..."
            isLoading={isSearching}
          />

          {/* Autocomplete Predictions List */}
          {predictions.length > 0 && (
            <View className="bg-white rounded-[24px] mt-2.5 border border-[#F1F1F1] max-h-56 shadow-2xl overflow-hidden" style={{ backgroundColor: '#ffffff', borderColor: '#F1F1F1' }}>
              <FlatList
                data={predictions}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectPrediction(item)}
                    activeOpacity={0.7}
                    className={`p-3.5 flex-row items-center ${index < predictions.length - 1 ? 'border-b border-[#F1F1F1]' : ''}`}
                    style={{ borderBottomColor: '#F1F1F1' }}
                  >
                    <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mr-3 border border-primary/20">
                      <Text className="text-base">📍</Text>
                    </View>
                    <Text className="flex-1 font-quicksand-semibold text-xs text-dark-100 leading-snug" numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* Web Location Display Card */}
        <View className="flex-1 items-center justify-center p-6 bg-gray-50">
          <View className="bg-white rounded-3xl p-6 border border-[#F1F1F1] items-center shadow-lg shadow-black/5 max-w-md w-full">
            <Text className="text-5xl mb-3">📍</Text>
            <Text className="text-lg font-quicksand-bold text-dark-100 text-center mb-1">
              Delivery Location Selected
            </Text>
            <Text className="text-xs font-quicksand-medium text-gray-500 text-center mb-4 leading-relaxed">
              {selectedAddress}
            </Text>

            <TouchableOpacity
              onPress={fetchGPSLocation}
              disabled={isLocatingUser}
              className="bg-primary/10 border border-primary/30 px-5 py-2.5 rounded-full flex-row items-center active:opacity-80 mb-2"
            >
              {isLocatingUser ? (
                <ActivityIndicator size="small" color="#53B175" className="mr-2" />
              ) : (
                <Text className="text-base mr-2">🎯</Text>
              )}
              <Text className="text-primary font-quicksand-bold text-xs" style={{ color: '#53B175' }}>
                Auto-Detect Current GPS Location
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Selected Address Preview & Confirm Bar */}
        <View
          style={{
            paddingBottom: bottomInset,
            backgroundColor: '#ffffff',
            borderTopColor: '#F1F1F1',
          }}
          className="bg-white border-t border-[#F1F1F1] shadow-2xl"
        >
          <View className="p-5">
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
                    <ActivityIndicator size="small" color="#53B175" className="mr-2" />
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
                Use Current Location
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
