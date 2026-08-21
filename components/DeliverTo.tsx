import { images } from '@/constants'
import * as Location from 'expo-location'
import React, { useEffect, useState } from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import { useLocationStore } from '@/store/location.store'
import LocationPickerModal from '@/components/LocationPickerModal'

const DeliverTo = () => {
  const { address, setLocation } = useLocationStore()
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)

  useEffect(() => {
    const getLocation = async () => {
      try {
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
    getLocation()
  }, [])

  return (
    <View className="flex-start">
      <Text className="small-bold text-primary">DELIVER TO</Text>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="flex-center flex-row gap-x-1 mt-0.5"
      >
        <Text className="paragraph-bold text-dark-100 max-w-[200px]" numberOfLines={1}>
          {loading ? 'Fetching...' : address}
        </Text>
        <Image
          source={images.arrowDown}
          className="size-3"
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