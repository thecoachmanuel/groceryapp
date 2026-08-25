import { images } from '@/constants'
import * as Location from 'expo-location'
import React, { useEffect, useState } from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import { useLocationStore } from '@/store/location.store'
import LocationPickerModal from '@/components/LocationPickerModal'

const DeliverTo = () => {
  const {
    address,
    latitude,
    longitude,
    isCaptured,
    savedAddresses,
    setLocation,
    selectSavedAddress,
  } = useLocationStore()
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)

  useEffect(() => {
    // 1. Check if user already has a saved or last used address in storage
    if (isCaptured && address && address !== 'Detecting location...' && latitude && longitude) {
      // Saved / last used address is already loaded and ready!
      setLoading(false)
      return
    }

    // 2. If savedAddresses has an entry, activate the default or first saved address
    if (savedAddresses && savedAddresses.length > 0) {
      const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0]
      if (defaultAddr) {
        selectSavedAddress(defaultAddr)
        setLoading(false)
        return
      }
    }

    // 3. Only if no saved address or last used location exists, perform initial GPS fetch
    const getInitialLocation = async () => {
      try {
        setLoading(true)
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          setLocation('Lagos, Nigeria', { latitude: 6.5244, longitude: 3.3792 }, false)
          setLoading(false)
          return
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        })

        const streetNumber = geo?.streetNumber || ''
        const street = geo?.street || geo?.name || ''
        const streetLine = [streetNumber, street].filter(Boolean).join(' ').trim()
        const district = geo?.district || geo?.subregion || ''
        const city = geo?.city || geo?.region || ''

        const fullAddress = [streetLine, district, city].filter(Boolean).join(', ')

        setLocation(
          fullAddress || 'Current GPS Location',
          { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
          true
        )
      } catch {
        setLocation('Lagos, Nigeria', { latitude: 6.5244, longitude: 3.3792 }, false)
      } finally {
        setLoading(false)
      }
    }

    getInitialLocation()
  }, [])

  return (
    <View className="items-center justify-center">
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="flex-row items-center justify-center"
      >
        <Image
          source={images.location}
          className="w-4 h-4 mr-1.5"
          resizeMode="contain"
        />
        <Text className="paragraph-bold text-dark-100 max-w-[240px] text-center" numberOfLines={1}>
          {loading ? 'Fetching...' : address}
        </Text>
        <Image
          source={images.arrowDown}
          className="size-3 ml-1"
          resizeMode="contain"
        />
      </TouchableOpacity>

      <LocationPickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  )
}

export default DeliverTo