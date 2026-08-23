import { images } from '@/constants'
import {
  creditCustomerWallet,
  debitCustomerWallet,
  getAllCustomers,
  getCustomerWallet,
  getWalletTransactions,
  updateUserAccountStatus,
} from '@/lib/appwrite'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function AdminCustomersScreen() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Wallet Modal State
  const [walletModalVisible, setModalVisible] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userWallet, setUserWallet] = useState<any>(null)
  const [userTxs, setUserTxs] = useState<any[]>([])
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchCustomerList = async () => {
    try {
      setLoading(true)
      const list = await getAllCustomers()
      setCustomers(list)

      // Concurrently fetch available wallet balance for all customers
      const balanceMap: Record<string, number> = {}
      await Promise.all(
        list.map(async (cust: any) => {
          try {
            const uId = cust.accountId || cust.$id
            const altId = cust.$id !== uId ? cust.$id : cust.accountId
            const w: any = await getCustomerWallet(uId, altId, cust.email)
            balanceMap[cust.$id] = Number(w?.balance || 0)
          } catch {
            balanceMap[cust.$id] = 0
          }
        })
      )
      setWalletBalances(balanceMap)
    } catch (err) {
      console.error('Error fetching customers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomerList()
  }, [])

  const handleToggleStatus = async (cust: any) => {
    const newStatus = cust.status === 'suspended' ? 'active' : 'suspended'
    Alert.alert(
      `${newStatus === 'suspended' ? 'Suspend' : 'Activate'} Account`,
      `Change status for ${cust.name} to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'suspended' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateUserAccountStatus(cust.$id, newStatus)
              fetchCustomerList()
            } catch (err: any) {
              Alert.alert('Error', err.message)
            }
          },
        },
      ],
    )
  }

  const openWalletModal = async (cust: any) => {
    setSelectedUser(cust)
    setAdjustmentAmount('')
    setAdjustmentReason('')
    setUserWallet(null)
    setUserTxs([])
    setModalVisible(true)

    try {
      const uId = cust.accountId || cust.$id
      const altId = cust.$id !== uId ? cust.$id : cust.accountId
      const email = cust.email

      const [w, txs] = await Promise.all([
        getCustomerWallet(uId, altId, email),
        getWalletTransactions(uId, altId, email),
      ])
      setUserWallet(w)
      setUserTxs(txs)
      if (w) {
        setWalletBalances((prev) => ({ ...prev, [cust.$id]: Number(w.balance || 0) }))
      }
    } catch (err) {
      console.error('Error loading customer wallet:', err)
    }
  }

  const handleAdjustWallet = async (type: 'credit' | 'debit') => {
    const numAmt = parseFloat(adjustmentAmount)
    if (!numAmt || numAmt <= 0) {
      return Alert.alert('Invalid Amount', 'Please enter a valid amount.')
    }
    if (!selectedUser) return

    try {
      setSubmitting(true)
      const uId = selectedUser.accountId || selectedUser.$id
      const altId = selectedUser.$id !== uId ? selectedUser.$id : selectedUser.accountId
      const email = selectedUser.email
      const desc = adjustmentReason.trim() || `Admin manual wallet ${type}`

      if (type === 'credit') {
        await creditCustomerWallet(uId, numAmt, 'admin_adjustment', desc)
        Alert.alert('Success', `Credited ₦${numAmt.toLocaleString()} to ${selectedUser.name}'s wallet.`)
      } else {
        await debitCustomerWallet(uId, numAmt, 'admin_adjustment', desc)
        Alert.alert('Success', `Debited ₦${numAmt.toLocaleString()} from ${selectedUser.name}'s wallet.`)
      }

      setAdjustmentAmount('')
      setAdjustmentReason('')

      // Reload fresh wallet balance
      const [w, txs] = await Promise.all([
        getCustomerWallet(uId, altId, email),
        getWalletTransactions(uId, altId, email),
      ])
      setUserWallet(w)
      setUserTxs(txs)
      if (w) {
        setWalletBalances((prev) => ({ ...prev, [selectedUser.$id]: Number(w.balance || 0) }))
      }
    } catch (err: any) {
      Alert.alert('Adjustment Failed', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="px-5 pt-4 pb-3 flex-row justify-between items-center bg-white border-b border-primary/10">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 bg-white border border-primary/15 rounded-2xl shadow-sm active:opacity-70"
          >
            <Image source={images.arrowBack} className="w-5 h-5" resizeMode="contain" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-lg font-quicksand-bold text-dark-100">
              Customer Management
            </Text>
            <Text className="text-[10px] text-primary font-quicksand-bold uppercase">
              Accounts & Live Wallet Balances
            </Text>
          </View>

          <View className="w-10" />
        </View>
      </TouchableWithoutFeedback>

      {/* Search Input */}
      <View className="px-5 py-3">
        <TextInput
          placeholder="Search customer by name or email..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9CA3AF"
          className="bg-white border-2 border-primary/10 rounded-2xl px-4 py-3 font-quicksand-semibold text-dark-100 shadow-sm shadow-black/5"
        />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#53B175" />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.$id}
          contentContainerClassName="p-5 pb-32 gap-4"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSuspended = item.status === 'suspended'
            const currentBal = walletBalances[item.$id] ?? walletBalances[item.accountId] ?? walletBalances[item.email] ?? (item.walletBalance || 0)

            return (
              <View className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/10">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 pr-2">
                    <Text className="font-quicksand-bold text-dark-100 text-base">
                      {item.name}
                    </Text>
                    <Text className="text-gray-400 font-quicksand-medium text-xs">
                      {item.email}
                    </Text>
                  </View>

                  <View
                    className={`px-3 py-1 rounded-full border ${isSuspended
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-green-500/10 border-green-500/20'
                      }`}
                  >
                    <Text
                      className={`font-quicksand-bold text-xs capitalize ${isSuspended ? 'text-red-600' : 'text-green-700'
                        }`}
                    >
                      {item.status || 'active'}
                    </Text>
                  </View>
                </View>

                {/* Prominent Live Available Wallet Balance Card */}
                <View className="flex-row items-center justify-between bg-primary/5 border border-primary/20 rounded-2xl p-3 my-2 shadow-sm shadow-black/5">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-xl bg-primary/15 items-center justify-center mr-2.5">
                      <Text className="text-base">💳</Text>
                    </View>
                    <View>
                      <Text className="text-[10px] font-quicksand-bold text-gray-400 uppercase tracking-wider">
                        Available Wallet Balance
                      </Text>
                      <Text className="text-sm font-quicksand-bold text-primary mt-0.5">
                        ₦ {Number(currentBal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => openWalletModal(item)}
                    className="bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl active:opacity-80"
                  >
                    <Text className="text-primary font-quicksand-bold text-xs">
                      Manage 👛
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Card Actions */}
                <View className="mt-2 pt-2.5 border-t border-primary/10 flex-row justify-between items-center">
                  <Text className="text-[11px] font-quicksand-medium text-gray-400">
                    Joined: {new Date(item.$createdAt || Date.now()).toLocaleDateString('en-GB')}
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleToggleStatus(item)}
                    className={`px-3 py-1.5 rounded-xl border ${isSuspended
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                      }`}
                  >
                    <Text
                      className={`font-quicksand-bold text-xs ${isSuspended ? 'text-green-700' : 'text-red-600'
                        }`}
                    >
                      {isSuspended ? 'Activate Account' : 'Suspend Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      )}

      {/* Modal: Redesigned Customer Wallet Inspection & Financial Adjustment */}
      <Modal
        visible={walletModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          Keyboard.dismiss()
          setModalVisible(false)
        }}
      >
        <View className="flex-1 bg-slate-900/50 justify-end">
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setModalVisible(false)
            }}
            className="flex-1"
          />

          <View className="bg-white rounded-t-[36px] p-6 max-h-[90%] border-t-2 border-primary/20 shadow-2xl">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
                <View>
                  <Text className="text-xl font-quicksand-bold text-dark-100">
                    {selectedUser?.name}'s Wallet
                  </Text>
                  <Text className="text-xs text-primary font-quicksand-semibold">
                    Admin Wallet Supervision & Balance
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss()
                  setModalVisible(false)
                }}
                className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-2xl active:opacity-80"
              >
                <Text className="text-primary font-quicksand-bold text-xs">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* 1. Live Wallet Balance Card */}
              <View className="bg-white rounded-[28px] p-6 mb-5 border-2 border-primary/10 shadow-lg shadow-black/10">
                <View className="flex-row items-center mb-2">
                  <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                  <Text className="text-dark-100 font-quicksand-bold text-sm">Customer Wallet Balance</Text>
                </View>
                <View className="h-px bg-primary/10 mb-4" />
                <View className="flex-row justify-between items-center bg-primary/5 p-4 rounded-2xl border border-primary/10">
                  <View>
                    <Text className="text-xs text-gray-400 font-quicksand-semibold uppercase tracking-wider">Available Balance</Text>
                    <Text className="text-3xl font-quicksand-bold text-primary mt-1">
                      ₦ {(Number(userWallet?.balance) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <Text className="text-3xl">👛</Text>
                </View>
              </View>

              {/* 2. Manual Fund Adjustment Rectangle Card */}
              <View className="bg-white rounded-[28px] p-6 mb-5 border-2 border-primary/10 shadow-lg shadow-black/10">
                <View className="flex-row items-center mb-2">
                  <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                  <Text className="text-dark-100 font-quicksand-bold text-sm">Admin Financial Adjustment</Text>
                </View>
                <View className="h-px bg-primary/10 mb-4" />

                <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">Amount (₦)</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor="#9CA3AF"
                  value={adjustmentAmount}
                  onChangeText={setAdjustmentAmount}
                  className="bg-white border-2 border-primary/10 rounded-2xl px-4 py-2.5 font-quicksand-semibold text-sm mb-3 text-dark-100 shadow-sm shadow-black/5"
                />

                <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">Reason / Note</Text>
                <TextInput
                  placeholder="e.g. Goodwill top-up, Order dispute refund"
                  placeholderTextColor="#9CA3AF"
                  value={adjustmentReason}
                  onChangeText={setAdjustmentReason}
                  className="bg-white border-2 border-primary/10 rounded-2xl px-4 py-2.5 font-quicksand-semibold text-sm mb-4 text-dark-100 shadow-sm shadow-black/5"
                />

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    disabled={submitting}
                    onPress={() => handleAdjustWallet('credit')}
                    className="flex-1 bg-primary py-3 rounded-full items-center justify-center shadow-md shadow-primary/30"
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-white font-quicksand-bold text-xs">+ Credit Wallet</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={submitting}
                    onPress={() => handleAdjustWallet('debit')}
                    className="flex-1 bg-red-500 py-3 rounded-full items-center justify-center shadow-md shadow-red-500/30"
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-white font-quicksand-bold text-xs">- Debit Wallet</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3. Transaction History */}
              <View className="bg-white rounded-[28px] p-6 mb-8 border-2 border-primary/10 shadow-lg shadow-black/10">
                <View className="flex-row items-center mb-2">
                  <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                  <Text className="text-dark-100 font-quicksand-bold text-sm">Recent Activity & Audit Trail</Text>
                </View>
                <View className="h-px bg-primary/10 mb-4" />

                {userTxs.length === 0 ? (
                  <View className="py-6 items-center">
                    <Text className="text-gray-400 font-quicksand-medium text-xs">No transaction history found.</Text>
                  </View>
                ) : (
                  <View className="gap-2.5">
                    {userTxs.slice(0, 10).map((tx) => (
                      <View
                        key={tx.$id}
                        className="flex-row justify-between items-center p-3 bg-gray-50/80 rounded-2xl border border-primary/10"
                      >
                        <View className="flex-1 pr-2">
                          <Text className="font-quicksand-bold text-dark-100 text-xs">{tx.description || tx.type}</Text>
                          <Text className="text-[10px] text-gray-400 font-quicksand-medium mt-0.5">
                            {new Date(tx.createdAt || tx.$createdAt).toLocaleDateString()} • {tx.type}
                          </Text>
                        </View>
                        <Text
                          className={`font-quicksand-bold text-sm ${tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'admin_adjustment'
                              ? 'text-primary'
                              : 'text-red-500'
                            }`}
                        >
                          {tx.type === 'payment' ? '-' : '+'}₦{Number(tx.amount).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
