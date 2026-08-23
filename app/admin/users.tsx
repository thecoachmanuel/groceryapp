import FastImage from '@/components/FastImage'
import { images } from '@/constants'
import {
  adminUpdateCustomerEmail,
  creditCustomerWallet,
  debitCustomerWallet,
  getAllCustomers,
  getCustomerWallet,
  getWalletTransactions,
  updateCustomerBlockStatus,
} from '@/lib/appwrite'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

export default function AdminUsersScreen() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Edit Email Modal State
  const [editEmailModalVisible, setEditEmailModalVisible] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [newEmail, setNewEmail] = useState('')
  const [updating, setUpdating] = useState(false)

  // Wallet Inspection Modal State
  const [walletModalVisible, setWalletModalVisible] = useState(false)
  const [walletUser, setWalletUser] = useState<any>(null)
  const [userWallet, setUserWallet] = useState<any>(null)
  const [userTxs, setUserTxs] = useState<any[]>([])
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [walletMap, setWalletMap] = useState<Record<string, number>>({})

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await getAllCustomers()
      setCustomers(data || [])

      if (data && data.length > 0) {
        const balances: Record<string, number> = {}
        await Promise.all(
          data.map(async (c: any) => {
            try {
              const uId = c.accountId || c.$id
              const altId = c.$id !== uId ? c.$id : c.accountId
              const w = await getCustomerWallet(uId, altId, c.email)
              if (w) balances[c.$id] = Number(w.balance) || 0
            } catch { }
          })
        )
        setWalletMap(balances)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchUsers()
    }, [])
  )

  const openWalletModal = async (cust: any) => {
    setWalletUser(cust)
    setAdjustmentAmount('')
    setAdjustmentReason('')
    setUserWallet(null)
    setUserTxs([])
    setWalletModalVisible(true)

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
      if (w && cust.$id) {
        setWalletMap((prev) => ({ ...prev, [cust.$id]: Number(w.balance) || 0 }))
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
    if (!walletUser) return

    try {
      setAdjusting(true)
      const uId = walletUser.accountId || walletUser.$id
      const altId = walletUser.$id !== uId ? walletUser.$id : walletUser.accountId
      const email = walletUser.email
      const desc = adjustmentReason.trim() || `Admin manual wallet ${type}`

      if (type === 'credit') {
        await creditCustomerWallet(uId, numAmt, 'admin_adjustment', desc)
        Alert.alert('Success', `Credited ₦${numAmt.toLocaleString()} to ${walletUser.name || 'customer'}'s wallet.`)
      } else {
        await debitCustomerWallet(uId, numAmt, 'admin_adjustment', desc)
        Alert.alert('Success', `Debited ₦${numAmt.toLocaleString()} from ${walletUser.name || 'customer'}'s wallet.`)
      }

      setAdjustmentAmount('')
      setAdjustmentReason('')
      const [w, txs] = await Promise.all([
        getCustomerWallet(uId, altId, email),
        getWalletTransactions(uId, altId, email),
      ])
      setUserWallet(w)
      setUserTxs(txs)
    } catch (err: any) {
      Alert.alert('Adjustment Failed', err.message)
    } finally {
      setAdjusting(false)
    }
  }

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase()
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    )
  })

  const handleToggleBlock = async (customer: any) => {
    const isCurrentlyBlocked = !!customer.isBlocked
    const actionText = isCurrentlyBlocked ? 'Unblock' : 'Block'

    Alert.alert(
      `${actionText} Customer`,
      `Are you sure you want to ${actionText.toLowerCase()} ${customer.name || 'this customer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: isCurrentlyBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await updateCustomerBlockStatus(customer.$id, !isCurrentlyBlocked)
              fetchUsers()
              Alert.alert(
                'Success',
                `Customer ${customer.name} has been ${isCurrentlyBlocked ? 'unblocked' : 'blocked'}.`
              )
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Action failed.')
            }
          },
        },
      ]
    )
  }

  const handleSaveNewEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.')
      return
    }

    setUpdating(true)
    try {
      await adminUpdateCustomerEmail(selectedCustomer.$id, newEmail.trim())
      setEditEmailModalVisible(false)
      fetchUsers()
      Alert.alert('Email Updated', `Updated email for ${selectedCustomer.name} to ${newEmail.trim()}`)
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update email.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back()
            else router.replace('/admin/dashboard' as any)
          }}
          activeOpacity={0.7}
          className="p-1"
        >
          <Image source={images.arrowBack} className="size-5" resizeMode="contain" />
        </TouchableOpacity>

        <Text className="text-xl font-quicksand-bold text-dark-100">
          Customer & User Management
        </Text>

        <View className="size-5" />
      </View>

      {/* Search Input Bar */}
      <View className="px-5 my-3">
        <View className="flex-row items-center bg-white border-2 border-primary/10 rounded-full px-4 py-2.5 shadow-md shadow-black/10">
          <Text className="text-base mr-2">🔍</Text>
          <TextInput
            placeholder="Search customers by name, email, phone..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9CA3AF"
            className="flex-1 font-quicksand-semibold text-sm text-dark-100"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text className="text-gray-400 font-bold px-2">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Customers List */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshing={loading}
        onRefresh={fetchUsers}
        ListEmptyComponent={() =>
          !loading && (
            <View className="items-center mt-20 px-8">
              <Text className="text-3xl mb-2">👥</Text>
              <Text className="font-quicksand-bold text-dark-100 text-lg mb-1">
                No Customers Found
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-xs text-center">
                No customer accounts match your current search query.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isBlocked = !!item.isBlocked

          return (
            <View className="bg-white rounded-[28px] p-5 mb-4 border-2 border-primary/10 shadow-lg shadow-black/10">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1 mr-2">
                  <FastImage
                    source={item.avatar || `https://cloud.appwrite.io/v1/avatars/initials?name=${encodeURIComponent(item.name || 'User')}`}
                    className="w-12 h-12 rounded-full border-2 border-primary/20 mr-3"
                    contentFit="cover"
                  />
                  <View className="flex-1">
                    <Text className="font-quicksand-bold text-dark-100 text-base" numberOfLines={1}>
                      {item.name || 'Customer'}
                    </Text>
                    <Text className="text-gray-400 font-quicksand-medium text-xs" numberOfLines={1}>
                      {item.email}
                    </Text>
                  </View>
                </View>

                {/* Status Badge */}
                <View
                  className={`px-3 py-1 rounded-full border ${isBlocked
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-green-500/10 border-green-500/30'
                    }`}
                >
                  <Text
                    className={`font-quicksand-bold text-xs ${isBlocked ? 'text-red-600' : 'text-green-700'
                      }`}
                  >
                    {isBlocked ? '🚫 Blocked' : '✅ Active'}
                  </Text>
                </View>
              </View>

              {/* Customer Info Box */}
              <View className="bg-gray-50/50 rounded-2xl p-3 mb-3 border-2 border-primary/10 gap-1.5">
                <View className="flex-row justify-between items-center bg-green-500/10 border border-green-500/20 p-2 rounded-xl">
                  <Text className="text-xs font-quicksand-semibold text-green-800">
                    👛 Available Wallet Balance:
                  </Text>
                  <Text className="text-sm font-quicksand-bold text-green-700">
                    ₦ {(walletMap[item.$id] ?? walletMap[item.accountId] ?? walletMap[item.email] ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <Text className="text-xs font-quicksand-medium text-gray-600">
                  📱 Phone: <Text className="font-quicksand-bold text-dark-100">{item.phone || 'Not provided'}</Text>
                </Text>
                <Text className="text-xs font-quicksand-medium text-gray-600">
                  🎭 Account Role: <Text className="font-quicksand-bold text-primary uppercase">{item.role || 'customer'}</Text>
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row justify-between items-center pt-2 border-t-2 border-primary/10">
                <TouchableOpacity
                  onPress={() => openWalletModal(item)}
                  className="bg-primary/10 border border-primary/30 px-3.5 py-2 rounded-2xl flex-row items-center"
                >
                  <Text className="text-primary font-quicksand-bold text-xs">
                    👛 Inspect Wallet
                  </Text>
                </TouchableOpacity>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCustomer(item)
                      setNewEmail(item.email)
                      setEditEmailModalVisible(true)
                    }}
                    className="bg-gray-100 px-3 py-2 rounded-2xl border border-gray-200"
                  >
                    <Text className="text-dark-100 font-quicksand-bold text-xs">✏️ Email</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleToggleBlock(item)}
                    className={`px-3 py-2 rounded-2xl border ${isBlocked
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                      }`}
                  >
                    <Text
                      className={`font-quicksand-bold text-xs ${isBlocked ? 'text-green-700' : 'text-red-600'
                        }`}
                    >
                      {isBlocked ? '✅ Unblock' : '🚫 Block'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )
        }}
      />

      {/* Admin Edit Email Modal — Pure Light Mode Design */}
      <Modal
        visible={editEmailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss()
          setEditEmailModalVisible(false)
        }}
      >
        <View className="flex-1 bg-slate-900/40 justify-center items-center px-5">
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setEditEmailModalVisible(false)
            }}
            className="absolute inset-0"
          />

          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border-2 border-primary/20 shadow-2xl z-10">
            <Text className="text-lg font-quicksand-bold text-dark-100 mb-1">
              Admin: Edit Customer Email
            </Text>
            <Text className="text-gray-400 font-quicksand-medium text-xs mb-4">
              Updating email for {selectedCustomer?.name}
            </Text>

            <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">New Email Address</Text>
            <TextInput
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="customer@example.com"
              placeholderTextColor="#9CA3AF"
              className="bg-white border-2 border-primary/10 rounded-2xl px-4 py-2.5 font-quicksand-semibold text-sm mb-5 text-dark-100 shadow-sm shadow-black/5"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss()
                  setEditEmailModalVisible(false)
                }}
                className="flex-1 bg-red-500/10 border-2 border-red-500/20 py-3 rounded-full items-center active:opacity-80"
              >
                <Text className="text-red-600 font-quicksand-bold text-xs">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveNewEmail}
                disabled={updating}
                className="flex-1 bg-primary py-3 rounded-full items-center justify-center"
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-quicksand-bold text-xs">Save Email</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Redesigned Customer Wallet Inspection & Financial Adjustment */}
      <Modal
        visible={walletModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          Keyboard.dismiss()
          setWalletModalVisible(false)
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-slate-900/50 justify-end"
        >
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setWalletModalVisible(false)
            }}
            className="flex-1"
          />

          <View className="bg-white rounded-t-[36px] p-6 max-h-[92%] border-t-2 border-primary/20 shadow-2xl">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
                <View>
                  <Text className="text-xl font-quicksand-bold text-dark-100">
                    {walletUser?.name || 'Customer'}'s Wallet
                  </Text>
                  <Text className="text-xs text-primary font-quicksand-semibold">
                    Admin Wallet Supervision & Balance
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss()
                  setWalletModalVisible(false)
                }}
                className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-2xl active:opacity-80"
              >
                <Text className="text-primary font-quicksand-bold text-xs">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                  <Text className="text-dark-100 font-quicksand-bold text-sm">Manual Wallet Adjustment</Text>
                </View>
                <View className="h-px bg-primary/10 mb-4" />

                <Text className="text-xs font-quicksand-bold text-gray-500 mb-1">Adjustment Amount (₦)</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor="#9CA3AF"
                  value={adjustmentAmount}
                  onChangeText={setAdjustmentAmount}
                  className="w-full bg-white border-2 border-primary/10 rounded-2xl px-4 py-3 font-quicksand-semibold text-dark-100 mb-3 shadow-sm"
                />

                <Text className="text-xs font-quicksand-bold text-gray-500 mb-1">Reason / Reference Note</Text>
                <TextInput
                  placeholder="e.g. Order refund or manual top-up credit"
                  placeholderTextColor="#9CA3AF"
                  value={adjustmentReason}
                  onChangeText={setAdjustmentReason}
                  className="w-full bg-white border-2 border-primary/10 rounded-2xl px-4 py-3 font-quicksand-semibold text-dark-100 mb-4 shadow-sm"
                />

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => handleAdjustWallet('credit')}
                    disabled={adjusting}
                    className="flex-1 bg-primary py-3.5 rounded-2xl items-center shadow-lg shadow-primary/20"
                  >
                    <Text className="text-white font-quicksand-bold text-xs">+ Credit Funds</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleAdjustWallet('debit')}
                    disabled={adjusting}
                    className="flex-1 bg-red-500/10 border-2 border-red-500/30 py-3.5 rounded-2xl items-center active:opacity-80"
                  >
                    <Text className="text-red-600 font-quicksand-bold text-xs">- Debit Funds</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3. Transaction History Logs Rectangle Card */}
              <View className="bg-white rounded-[28px] p-6 mb-5 border-2 border-primary/10 shadow-lg shadow-black/10">
                <View className="flex-row items-center mb-2">
                  <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                  <Text className="text-dark-100 font-quicksand-bold text-sm">Transaction Logs</Text>
                </View>
                <View className="h-px bg-primary/10 mb-4" />

                {userTxs.length === 0 ? (
                  <Text className="text-gray-400 font-quicksand-medium text-xs py-4 text-center">
                    No transaction history recorded.
                  </Text>
                ) : (
                  userTxs.map((tx) => (
                    <View key={tx.$id} className="bg-white rounded-2xl p-3.5 mb-2.5 flex-row justify-between items-center border border-primary/10 shadow-sm">
                      <View className="flex-1 pr-2">
                        <Text className="font-quicksand-bold text-dark-100 text-xs">
                          {tx.description || tx.type}
                        </Text>
                        <Text className="text-gray-400 text-[10px] font-quicksand-medium mt-0.5">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      </View>
                      <Text className={`font-quicksand-bold text-xs ${tx.type === 'credit' ? 'text-primary' : 'text-red-600'}`}>
                        {tx.type === 'credit' ? '+' : '-'} ₦{Number(tx.amount || 0).toLocaleString()}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}
