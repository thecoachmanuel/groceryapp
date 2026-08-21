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
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  getStores,
  createSellerAccount,
  updateStoreStatus,
  processSellerPayout,
  getSellerPayoutLogs,
} from '@/lib/appwrite'
import { images } from '@/constants'



export default function AdminSellers() {
  const router = useRouter()
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Create Seller Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Seller Form Fields
  const [sellerName, setSellerName] = useState('')
  const [sellerEmail, setSellerEmail] = useState('')
  const [sellerPassword, setSellerPassword] = useState('')
  const [storeName, setStoreName] = useState('')
  const [phone, setPhone] = useState('')

  // Edit Status / Commission Modal
  const [editStoreModal, setEditStoreModal] = useState<any>(null)
  const [commissionRate, setCommissionRate] = useState('10.0')

  const fetchStores = async () => {
    try {
      setLoading(true)
      const data = await getStores()
      setStores(data)
    } catch (err) {
      console.error('Error fetching stores:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStores()
  }, [])

  const handleCreateSeller = async () => {
    if (!sellerName.trim() || !sellerEmail.trim() || !sellerPassword.trim() || !storeName.trim()) {
      return Alert.alert('Validation Error', 'Please fill in all required fields (Name, Email, Password, Store Name).')
    }

    try {
      setSubmitting(true)
      await createSellerAccount({
        name: sellerName.trim(),
        email: sellerEmail.trim().toLowerCase(),
        password: sellerPassword,
        storeName: storeName.trim(),
        phone: phone.trim(),
      })

      Alert.alert('Seller Profile Created', `Store "${storeName}" & Seller Account created successfully! Admin session remains active.`)
      setCreateModalVisible(false)
      setSellerName('')
      setSellerEmail('')
      setSellerPassword('')
      setStoreName('')
      setPhone('')
      fetchStores()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create seller profile.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStore = async (status: string) => {
    if (!editStoreModal) return
    try {
      const rate = parseFloat(commissionRate) || 10.0
      await updateStoreStatus(editStoreModal.$id, status, rate)
      Alert.alert('Updated', `Store status changed to "${status}"`)
      setEditStoreModal(null)
      fetchStores()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update store.')
    }
  }

  // Payout Settlement Modal State
  const [payoutModalStore, setPayoutModalStore] = useState<any>(null)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutLogs, setPayoutLogs] = useState<any[]>([])
  const [payoutSubmitting, setPayoutSubmitting] = useState(false)

  const openPayoutModal = async (st: any) => {
    setPayoutModalStore(st)
    setPayoutAmount('')
    try {
      const logs = await getSellerPayoutLogs(st.userId || st.$id)
      setPayoutLogs(logs)
    } catch {
      setPayoutLogs([])
    }
  }

  const handleProcessPayout = async () => {
    const numAmt = parseFloat(payoutAmount)
    if (!numAmt || numAmt <= 0) {
      return Alert.alert('Invalid Amount', 'Please enter payout settlement amount.')
    }
    if (!payoutModalStore) return

    try {
      setPayoutSubmitting(true)
      const commission = (numAmt * (payoutModalStore.commissionRate || 10.0)) / 100
      const netPayout = numAmt - commission

      await processSellerPayout({
        sellerId: payoutModalStore.userId || payoutModalStore.$id,
        storeName: payoutModalStore.storeName,
        amount: netPayout,
        commissionDeducted: commission,
      })

      Alert.alert('Payout Processed', `Settled ₦${netPayout.toLocaleString()} to ${payoutModalStore.storeName} (₦${commission.toLocaleString()} commission retained).`)
      setPayoutModalStore(null)
      setPayoutAmount('')
      fetchStores()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Payout failed.')
    } finally {
      setPayoutSubmitting(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row justify-between items-center bg-white border-b border-primary/10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 bg-white border border-primary/15 rounded-2xl shadow-sm active:opacity-70"
        >
          <Image source={images.arrowBack} className="w-5 h-5" resizeMode="contain" />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-lg font-quicksand-bold text-dark-100">
            Sellers & Stores Control
          </Text>
          <Text className="text-[10px] text-primary font-quicksand-bold uppercase">
            Seller Management
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          className="bg-primary px-3 py-1.5 rounded-full flex-row items-center"
        >
          <Text className="text-white font-quicksand-bold text-xs">+ Create Seller</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.$id}
          contentContainerClassName="p-5 pb-32"
          ListEmptyComponent={() => (
            <View className="items-center mt-20 px-8">
              <Text className="text-4xl mb-3">🏪</Text>
              <Text className="text-xl font-quicksand-bold text-dark-100 mb-1">
                No Sellers Onboarded Yet
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-center text-sm mb-5">
                Customers can continue shopping global items. Click below to onboard your first seller/store partner.
              </Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(true)}
                className="bg-primary px-6 py-3 rounded-full shadow-lg shadow-primary/30"
              >
                <Text className="text-white font-quicksand-bold text-sm">+ Onboard First Seller</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => (
            <View className="bg-white rounded-[28px] p-5 mb-5 border border-primary/10 shadow-lg shadow-black/10">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-3">
                  <Text className="text-xl font-quicksand-bold text-dark-100">
                    {item.storeName}
                  </Text>
                  <Text className="text-gray-400 text-xs font-quicksand-medium mt-0.5">
                    📍 {item.address || 'Address not specified'}
                  </Text>
                  {item.phone ? (
                    <Text className="text-gray-400 text-xs font-quicksand-medium">
                      📞 {item.phone}
                    </Text>
                  ) : null}
                </View>

                <View
                  className={`px-3 py-1 rounded-full border ${
                    item.status === 'active'
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <Text
                    className={`font-quicksand-bold text-xs capitalize ${
                      item.status === 'active' ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {item.status || 'Active'}
                  </Text>
                </View>
              </View>

              <View className="bg-gray-50 rounded-2xl p-3 mb-4 flex-row justify-between items-center border border-gray-100">
                <Text className="text-gray-500 font-quicksand-medium text-xs">
                  Commission Rate:
                </Text>
                <Text className="text-primary font-quicksand-bold text-sm">
                  {item.commissionRate || 10.0}%
                </Text>
              </View>

              <View className="flex-row justify-end gap-2 pt-2 border-t border-gray-100">
                <TouchableOpacity
                  onPress={() => openPayoutModal(item)}
                  className="bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-xl"
                >
                  <Text className="text-green-700 font-quicksand-bold text-xs">
                    💵 Payout Settlement
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setEditStoreModal(item)
                    setCommissionRate((item.commissionRate || 10.0).toString())
                  }}
                  className="bg-primary/10 border border-primary/20 px-3 py-2 rounded-xl"
                >
                  <Text className="text-primary font-quicksand-bold text-xs">
                    ⚙️ Manage Status
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}


      {/* Modal: Create Seller Account */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[32px] p-6 max-h-[90%] shadow-2xl">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-quicksand-bold text-dark-100">
                Onboard New Seller Profile
              </Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-xl active:opacity-80"
              >
                <Text className="text-primary font-quicksand-bold text-xs">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Seller Full Name *
              </Text>
              <TextInput
                placeholder="e.g. John Seller"
                value={sellerName}
                onChangeText={setSellerName}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold mb-4"
              />

              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Store Name *
              </Text>
              <TextInput
                placeholder="e.g. Fresh Bites Grocery"
                value={storeName}
                onChangeText={setStoreName}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold mb-4"
              />

              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Seller Email Address *
              </Text>
              <TextInput
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="seller@example.com"
                value={sellerEmail}
                onChangeText={setSellerEmail}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold mb-4"
              />

              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Temporary Password *
              </Text>
              <TextInput
                secureTextEntry
                placeholder="Minimum 8 characters"
                value={sellerPassword}
                onChangeText={setSellerPassword}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold mb-4"
              />

              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Phone Number (Optional)
              </Text>
              <TextInput
                keyboardType="phone-pad"
                placeholder="+234..."
                value={phone}
                onChangeText={setPhone}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold mb-6"
              />

              <TouchableOpacity
                onPress={handleCreateSeller}
                disabled={submitting}
                className="bg-primary py-4 rounded-2xl items-center shadow-lg shadow-primary/30"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-quicksand-bold text-base">
                    Create Seller Profile
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Edit Store Status / Commission */}
      <Modal visible={!!editStoreModal} animationType="fade" transparent>
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl">
            <Text className="text-2xl mb-1">⚙️</Text>
            <Text className="text-xl font-quicksand-bold text-dark-100 mb-1">
              Store Control
            </Text>
            <Text className="text-gray-400 font-quicksand-medium text-xs text-center mb-2">
              Manage status & commission for {editStoreModal?.storeName}
            </Text>
            <View className="bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">
              <Text className="text-primary font-quicksand-bold text-[10px]">
                🌐 All Categories Enabled for Seller
              </Text>
            </View>

            <Text className="self-start font-quicksand-bold text-xs text-gray-500 mb-1">
              Commission Percentage (%)
            </Text>
            <TextInput
              keyboardType="numeric"
              value={commissionRate}
              onChangeText={setCommissionRate}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-center text-lg font-bold mb-4"
            />

            <View className="w-full gap-2 mb-4">
              <TouchableOpacity
                onPress={() => handleUpdateStore('active')}
                className="bg-green-500/10 border border-green-500/30 py-3 rounded-2xl items-center"
              >
                <Text className="text-green-700 font-quicksand-bold">Set Active 🟢</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleUpdateStore('suspended')}
                className="bg-red-500/10 border border-red-500/30 py-3 rounded-2xl items-center"
              >
                <Text className="text-red-700 font-quicksand-bold">Suspend Store 🛑</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setEditStoreModal(null)}
              className="bg-gray-200 py-3 px-6 rounded-full w-full items-center"
            >
              <Text className="text-gray-700 font-quicksand-bold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Payout Settlement */}
      <Modal visible={!!payoutModalStore} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[36px] p-6 max-h-[85%] shadow-2xl">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-xl font-quicksand-bold text-dark-100">
                  {payoutModalStore?.storeName} Payouts
                </Text>
                <Text className="text-xs text-primary font-quicksand-semibold">
                  Commission & Settlement Manager
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPayoutModalStore(null)}
                className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-xl active:opacity-80"
              >
                <Text className="text-primary font-quicksand-bold text-xs">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4">
                <Text className="text-xs font-quicksand-medium text-gray-500 mb-1">
                  Configured Store Commission Rate:
                </Text>
                <Text className="text-primary font-quicksand-bold text-base">
                  {payoutModalStore?.commissionRate || 10.0}% Platform Fee
                </Text>
              </View>

              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Process Gross Sales Payout (₦) *
              </Text>
              <TextInput
                keyboardType="numeric"
                placeholder="Gross Sales Amount (e.g. 50000)"
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-semibold mb-4"
              />

              <TouchableOpacity
                onPress={handleProcessPayout}
                disabled={payoutSubmitting}
                className="bg-green-600 py-3.5 rounded-2xl items-center shadow-lg shadow-green-600/30 mb-6"
              >
                {payoutSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-quicksand-bold text-sm">
                    Settle Net Payout to Seller 💵
                  </Text>
                )}
              </TouchableOpacity>

              <Text className="font-quicksand-bold text-sm text-dark-100 mb-2">
                Payout Settlement History
              </Text>
              {payoutLogs.length === 0 ? (
                <Text className="text-gray-400 font-quicksand-medium text-xs py-4 text-center">
                  No prior payouts recorded for this store.
                </Text>
              ) : (
                payoutLogs.map((p) => (
                  <View key={p.$id} className="bg-gray-50 rounded-2xl p-3 mb-2 flex-row justify-between items-center border border-gray-200">
                    <View className="flex-1 pr-2">
                      <Text className="font-quicksand-bold text-dark-100 text-xs">
                        Net Payout: ₦{Number(p.amount).toLocaleString()}
                      </Text>
                      <Text className="text-gray-400 text-[10px]">
                        Commission: ₦{Number(p.commissionDeducted || 0).toLocaleString()} • {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}
                      </Text>
                    </View>
                    <View className="bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                      <Text className="text-green-700 font-bold text-[10px]">✓ Settled</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

