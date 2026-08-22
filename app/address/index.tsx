import LocationPickerModal from '@/components/LocationPickerModal'
import { images } from '@/constants'
import { useLocationStore } from '@/store/location.store'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

export default function SavedAddressesScreen() {
  const router = useRouter()
  const {
    savedAddresses,
    address: activeAddress,
    addSavedAddress,
    deleteSavedAddress,
    selectSavedAddress,
  } = useLocationStore()

  const [addModalVisible, setAddModalVisible] = useState(false)
  const [mapPickerVisible, setMapPickerVisible] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<'Home' | 'Work' | 'Other'>('Home')
  const [newAddressText, setNewAddressText] = useState('')
  const [newLandmark, setNewLandmark] = useState('')
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 6.5244,
    longitude: 3.3792,
  })

  const handleSaveNewAddress = () => {
    if (!newAddressText.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid street address.')
      return
    }

    addSavedAddress({
      label: selectedLabel,
      address: newAddressText.trim(),
      landmark: newLandmark.trim(),
      latitude: coords.latitude,
      longitude: coords.longitude,
    })

    setAddModalVisible(false)
    setNewAddressText('')
    setNewLandmark('')
    Alert.alert('Address Saved!', `Your ${selectedLabel} address has been saved successfully.`)
  }

  const handleDelete = (id: string, label: string) => {
    Alert.alert('Delete Address', `Are you sure you want to remove this ${label} address?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteSavedAddress(id),
      },
    ])
  }

  const handleOpenMapPicker = () => {
    setAddModalVisible(false)
    setTimeout(() => {
      setMapPickerVisible(true)
    }, 200)
  }

  const handleMapPickerClose = () => {
    setMapPickerVisible(false)
    const currentStore = useLocationStore.getState()
    if (currentStore.address && currentStore.address !== 'Detecting location...') {
      setNewAddressText(currentStore.address)
      if (currentStore.latitude && currentStore.longitude) {
        setCoords({ latitude: currentStore.latitude, longitude: currentStore.longitude })
      }
    }
    setTimeout(() => {
      setAddModalVisible(true)
    }, 200)
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      <StatusBar barStyle="dark-content" backgroundColor="#E6F7EC" />

      {/* Header Bar - Route header with left-to-right slide back animation */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back()
            else router.replace('/(tabs)/profile' as any)
          }}
          activeOpacity={0.7}
          className="p-1"
        >
          <Image source={images.arrowBack} className="size-5" resizeMode="contain" />
        </TouchableOpacity>

        <Text className="text-xl font-quicksand-bold text-dark-100">
          Saved Delivery Addresses
        </Text>

        <TouchableOpacity
          onPress={() => setAddModalVisible(true)}
          className="bg-primary px-4 py-2 rounded-full shadow-sm shadow-primary/30"
        >
          <Text className="text-white font-quicksand-bold text-xs">+ Add New</Text>
        </TouchableOpacity>
      </View>

      {/* Saved Addresses List - Styled matching My Orders History */}
      <FlatList
        data={savedAddresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        ListEmptyComponent={() => (
          <View className="items-center mt-20 px-8">
            <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-4 border border-primary/20">
              <Text className="text-3xl">📍</Text>
            </View>
            <Text className="font-quicksand-bold text-dark-100 text-xl mb-2">
              No Saved Addresses Yet
            </Text>
            <Text className="text-gray-400 font-quicksand-medium text-center text-sm">
              Save your 🏠 Home or 💼 Work address for instant one-tap checkout.
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isSelected = activeAddress === item.address
          const icon = item.label === 'Home' ? '🏠' : item.label === 'Work' ? '💼' : '📍'

          return (
            <TouchableOpacity
              onPress={() => selectSavedAddress(item)}
              activeOpacity={0.8}
              className="bg-white rounded-[28px] p-5 mb-5 border-2 border-primary/10 shadow-lg shadow-black/10"
            >
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-2">{icon}</Text>
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    {item.label} Address
                  </Text>
                </View>

                {isSelected && (
                  <View className="px-3 py-1 rounded-full border bg-green-500/10 border-green-500/30">
                    <Text className="font-quicksand-bold text-xs uppercase text-green-700">
                      Active Location
                    </Text>
                  </View>
                )}
              </View>

              {/* Address Details Container */}
              <View className="bg-gray-50/50 rounded-2xl p-3.5 mb-3 border-2 border-primary/10">
                <Text className="text-dark-100 font-quicksand-bold text-sm mb-1">
                  📍 {item.address}
                </Text>
                {item.landmark ? (
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Landmark: {item.landmark}
                  </Text>
                ) : null}
              </View>

              {/* Actions Bar */}
              <View className="flex-row justify-end gap-3 pt-2 border-t-2 border-primary/10">
                <TouchableOpacity
                  onPress={() => selectSavedAddress(item)}
                  className="bg-primary/10 px-4 py-2 rounded-2xl border border-primary/30"
                >
                  <Text className="text-primary font-quicksand-bold text-xs">
                    {isSelected ? '✓ Selected' : 'Use Address'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.label)}
                  className="bg-red-500/10 px-4 py-2 rounded-2xl border border-red-500/30"
                >
                  <Text className="text-red-600 font-quicksand-bold text-xs">Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )
        }}
      />

      {/* Add Address Form Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss()
          setAddModalVisible(false)
        }}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-5">
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setAddModalVisible(false)
            }}
            className="absolute inset-0"
          />

          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border-2 border-primary/20 shadow-2xl z-10">
            <Text className="text-lg font-quicksand-bold text-dark-100 mb-4">
              Add New Delivery Address
            </Text>

            {/* Label Selector Pills */}
            <Text className="text-xs font-quicksand-bold text-gray-400 mb-2">Address Type</Text>
            <View className="flex-row gap-2 mb-4">
              {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                <TouchableOpacity
                  key={lbl}
                  onPress={() => setSelectedLabel(lbl)}
                  className={`flex-1 py-2.5 rounded-full items-center border-2 ${selectedLabel === lbl
                      ? 'bg-primary border-primary'
                      : 'bg-gray-50 border-gray-200'
                    }`}
                >
                  <Text
                    className={`font-quicksand-bold text-xs ${selectedLabel === lbl ? 'text-white' : 'text-gray-700'
                      }`}
                  >
                    {lbl === 'Home' ? '🏠 Home' : lbl === 'Work' ? '💼 Work' : '📍 Other'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">Street Address</Text>
            <TextInput
              value={newAddressText}
              onChangeText={setNewAddressText}
              placeholder="e.g. 12 Adeola Odeku Street, Victoria Island"
              className="bg-gray-50 border border-gray-300 rounded-2xl px-4 py-2.5 font-quicksand-semibold text-sm mb-3 text-dark-100"
            />

            <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">Landmark / Note (Optional)</Text>
            <TextInput
              value={newLandmark}
              onChangeText={setNewLandmark}
              placeholder="e.g. Opposite Central Park, Flat 4"
              className="bg-gray-50 border border-gray-300 rounded-2xl px-4 py-2.5 font-quicksand-semibold text-sm mb-4 text-dark-100"
            />

            <TouchableOpacity
              onPress={handleOpenMapPicker}
              className="bg-primary/5 p-3 rounded-2xl flex-row items-center justify-between mb-5 border-2 border-primary/10 active:opacity-80"
            >
              <Text className="text-xs font-quicksand-bold text-dark-100">
                🗺️ Pinpoint on Map (Select Location)
              </Text>
              <Text className="text-primary font-bold text-xs">→</Text>
            </TouchableOpacity>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                className="flex-1 bg-red-500/10 border-2 border-red-500/20 py-3 rounded-full items-center active:opacity-80"
              >
                <Text className="text-red-600 font-quicksand-bold text-xs">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveNewAddress}
                className="flex-1 bg-primary py-3 rounded-full items-center"
              >
                <Text className="text-white font-quicksand-bold text-xs">Save Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Map Picker Inner Modal */}
      <LocationPickerModal
        visible={mapPickerVisible}
        onClose={handleMapPickerClose}
        titleNote="Select location to save as address"
      />
    </SafeAreaView>
  )
}
