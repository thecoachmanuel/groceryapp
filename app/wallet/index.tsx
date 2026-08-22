import { PaystackPayment } from '@/components/PaystackPayment'
import { images } from '@/constants'
import {
  creditCustomerWallet,
  getCustomerWallet,
  getRefundPolicy,
  getWalletTransactions,
} from '@/lib/appwrite'
import useAuthStore from '@/store/auth.store'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const QUICK_AMOUNTS = [1000, 2500, 5000, 10000]

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Recent'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Recent'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return 'Recent'
  }
}

export default function CustomerWalletScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const userId: string = (user as any)?.$id || (user as any)?.accountId || ''
  const userEmail: string = (user as any)?.email || ''

  const [wallet, setWallet] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refundsAllowed, setRefundsAllowed] = useState(true)

  const [selectModalVisible, setSelectModalVisible] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [paystackVisible, setPaystackVisible] = useState(false)
  const [pendingAmount, setPendingAmount] = useState(0)
  const [creditingWallet, setCreditingWallet] = useState(false)

  const fetchWalletData = async () => {
    if (!userId) { setLoading(false); setRefreshing(false); return }
    try {
      const [wData, txData, refPolicy] = await Promise.all([
        getCustomerWallet(userId),
        getWalletTransactions(userId),
        getRefundPolicy(),
      ])
      setWallet(wData || null)
      setTransactions(Array.isArray(txData) ? txData : [])
      setRefundsAllowed(refPolicy)
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchWalletData() }, [userId])
  const onRefresh = () => { setRefreshing(true); fetchWalletData() }

  const openAmountSelector = () => { setDepositAmount(''); setSelectModalVisible(true) }
  const closeAmountSelector = () => { setDepositAmount(''); setSelectModalVisible(false) }

  const proceedToPaystack = () => {
    const num = parseFloat(depositAmount.trim())
    if (!num || isNaN(num) || num < 100) {
      Alert.alert('Invalid Amount', 'Minimum deposit amount is ₦100.')
      return
    }
    if (!userEmail) {
      Alert.alert('Error', 'A valid email address is required to process payment.')
      return
    }
    setPendingAmount(num)
    setSelectModalVisible(false)
    setTimeout(() => setPaystackVisible(true), 350)
  }

  const handlePaystackSuccess = async (reference: string) => {
    setPaystackVisible(false)
    setCreditingWallet(true)
    try {
      await creditCustomerWallet(
        userId,
        pendingAmount,
        'deposit',
        `Wallet Top-Up via Paystack — ₦${pendingAmount.toLocaleString()}`,
        reference,
      )
      await fetchWalletData()
      Alert.alert('Wallet Funded! 🎉', `₦${pendingAmount.toLocaleString()} added to your wallet.\n\nRef: ${reference}`)
    } catch (err: any) {
      Alert.alert('Credit Error', err?.message || 'Payment received but wallet update failed. Contact support.')
    } finally {
      setCreditingWallet(false)
      setPendingAmount(0)
    }
  }

  const handlePaystackCancel = () => {
    setPaystackVisible(false)
    Alert.alert('Payment Cancelled', 'Your wallet has not been funded.')
    setPendingAmount(0)
  }

  const balance = Number(wallet?.balance) || 0

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#16A34A" />

      {/* Hero Header — Spans seamlessly into status bar */}
      <View style={{ backgroundColor: '#16A34A', borderBottomLeftRadius: 45, borderBottomRightRadius: 45 }}>
        <SafeAreaView edges={['top']} style={s.hero}>
          <View style={s.heroRow}>
            <TouchableOpacity
              onPress={() => { if (router.canGoBack()) router.back() }}
              style={s.backBtn}
            >
              <Image source={images.arrowBack} style={s.backIcon} resizeMode="contain" tintColor="#FFFFFF" />
            </TouchableOpacity>
            <View style={s.heroBadge}>
              <Text style={s.heroBadgeText}>👛 Digital Wallet</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          <Text style={s.heroTitle}>My Wallet</Text>
          <Text style={s.heroSub}>Fund your wallet and pay instantly at checkout</Text>
        </SafeAreaView>
      </View>

      {/* Balance Card */}
      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>Available Balance</Text>
        <Text style={s.balanceAmount}>
          ₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
        <View style={s.balanceDivider} />

        {creditingWallet ? (
          <View style={s.creditingRow}>
            <ActivityIndicator color="#16A34A" size="small" />
            <Text style={s.creditingText}>Crediting wallet…</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={openAmountSelector} activeOpacity={0.88} style={s.fundBtn}>
            <Text style={s.fundBtnEmoji}>💳</Text>
            <Text style={s.fundBtnText}>+ Fund via Paystack</Text>
          </TouchableOpacity>
        )}

        {!refundsAllowed && (
          <View style={s.refundWarning}>
            <Text style={s.refundWarningText}>
              🔒 Refund policy is currently disabled by admin. Cancelled orders won't credit your wallet.
            </Text>
          </View>
        )}
      </View>

      {/* Transaction History */}
      <View style={s.txSection}>
        <View style={s.txHeader}>
          <View style={s.txDot} />
          <Text style={s.txTitle}>Transaction History</Text>
        </View>
        <View style={s.txDivider} />

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color="#16A34A" />
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item, index) => (item?.$id ? String(item.$id) : `tx_${index}`)}
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} tintColor="#16A34A" />
            }
            ListEmptyComponent={() => (
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>💸</Text>
                <Text style={s.emptyTitle}>No Transactions Yet</Text>
                <Text style={s.emptySub}>Fund your wallet via Paystack to enjoy fast, 1-tap checkout.</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isCredit = item?.type === 'credit'
              return (
                <View style={s.txItem}>
                  <View style={[s.txIcon, isCredit ? s.txIconCredit : s.txIconDebit]}>
                    <Text style={{ fontSize: 20 }}>{isCredit ? '📥' : '📤'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.txDesc} numberOfLines={1}>
                      {item?.description || (isCredit ? 'Wallet Credit' : 'Wallet Debit')}
                    </Text>
                    <Text style={s.txDate}>{formatDate(item?.createdAt)}</Text>
                  </View>
                  <Text style={[s.txAmount, isCredit ? s.txAmountCredit : s.txAmountDebit]}>
                    {isCredit ? '+' : '-'}₦{Number(item?.amount || 0).toLocaleString()}
                  </Text>
                </View>
              )
            }}
          />
        )}
      </View>

      {/* Amount Selection Modal */}
      <Modal
        visible={selectModalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => {
          Keyboard.dismiss()
          setSelectModalVisible(false)
        }}
      >
        <View style={s.modalBackdrop}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setSelectModalVisible(false)
            }}
            style={{ flex: 1 }}
          />
          <View style={s.modalSheet}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
              <View style={s.modalHandle} />

              <View style={s.modalIcon}>
                <Text style={{ fontSize: 28 }}>💳</Text>
              </View>
              <Text style={s.modalTitle}>Fund Your Wallet</Text>
              <Text style={s.modalSub}>
                Enter or select an amount. You'll pay securely via Paystack.
              </Text>

              <Text style={s.inputLabel}>DEPOSIT AMOUNT (₦) *</Text>
              <TextInput
                keyboardType="numeric"
                placeholder="e.g. 5000"
                value={depositAmount}
                onChangeText={(val) => setDepositAmount(val.replace(/[^0-9.]/g, ''))}
                placeholderTextColor="#9CA3AF"
                style={[s.amountInput, depositAmount ? s.amountInputActive : undefined]}
              />

              <Text style={s.inputLabel}>QUICK SELECT</Text>
              <View style={s.pillRow}>
                {QUICK_AMOUNTS.map((amt) => {
                  const isSel = depositAmount === String(amt)
                  return (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => setDepositAmount(String(amt))}
                      activeOpacity={0.75}
                      style={[s.pill, isSel ? s.pillActive : undefined]}
                    >
                      <Text style={[s.pillText, isSel ? s.pillTextActive : undefined]}>
                        +₦{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <View style={s.secureNotice}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>🔒</Text>
                <Text style={s.secureNoticeText}>
                  Payment processed securely by Paystack. Wallet credited instantly after payment.
                </Text>
              </View>

              <TouchableOpacity onPress={proceedToPaystack} activeOpacity={0.88} style={s.payBtn}>
                <Text style={s.payBtnText}>Pay with Paystack →</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={closeAmountSelector} activeOpacity={0.8} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Paystack Gateway */}
      {paystackVisible && (
        <PaystackPayment
          visible={paystackVisible}
          amount={pendingAmount}
          email={userEmail}
          name={(user as any)?.name}
          reference={`WALLET_${Date.now()}`}
          metadata={{ userId, purpose: 'wallet_funding' }}
          onSuccess={handlePaystackSuccess}
          onCancel={handlePaystackCancel}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E6F7EC' },

  // Hero
  hero: { backgroundColor: '#16A34A', borderBottomLeftRadius: 45, borderBottomRightRadius: 45, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 56 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  backIcon: { width: 20, height: 20 },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  heroBadgeText: { color: '#fff', fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '700' },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },

  // Balance card
  balanceCard: { marginTop: -32, marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 32, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 8, borderWidth: 2, borderColor: '#dcfce7' },
  balanceLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  balanceAmount: { fontSize: 36, fontWeight: '700', color: '#1a1a2e', marginTop: 4 },
  balanceDivider: { height: 2, width: 48, backgroundColor: '#16A34A', borderRadius: 999, marginVertical: 12 },
  creditingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  creditingText: { color: '#16A34A', fontWeight: '700', fontSize: 14 },
  fundBtn: { backgroundColor: '#16A34A', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#16A34A', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12 },
  fundBtnEmoji: { fontSize: 20, marginRight: 8 },
  fundBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  refundWarning: { marginTop: 12, backgroundColor: 'rgba(239,68,68,0.05)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  refundWarningText: { color: '#ef4444', fontSize: 11, fontWeight: '600', flex: 1 },

  // Transactions
  txSection: { flex: 1, paddingHorizontal: 20, marginTop: 24 },
  txHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  txDot: { width: 10, height: 10, backgroundColor: '#16A34A', borderRadius: 999, marginRight: 8 },
  txTitle: { color: '#1a1a2e', fontSize: 18, fontWeight: '700' },
  txDivider: { height: 1, backgroundColor: 'rgba(22,163,74,0.1)', marginBottom: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyWrap: { alignItems: 'center', marginTop: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  emptySub: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
  txItem: { backgroundColor: '#fff', borderRadius: 28, padding: 20, marginBottom: 14, borderWidth: 2, borderColor: '#dcfce7', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 14 },
  txIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  txIconCredit: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  txIconDebit: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  txDesc: { fontWeight: '700', fontSize: 14, color: '#1a1a2e' },
  txDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  txAmount: { fontWeight: '700', fontSize: 15 },
  txAmountCredit: { color: '#16a34a' },
  txAmountDebit: { color: '#dc2626' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, borderTopWidth: 2, borderColor: '#dcfce7' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 999, alignSelf: 'center', marginBottom: 20 },
  modalIcon: { width: 64, height: 64, backgroundColor: 'rgba(22,163,74,0.1)', borderRadius: 999, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12, borderWidth: 2, borderColor: 'rgba(22,163,74,0.2)' },
  modalTitle: { fontWeight: '700', fontSize: 22, color: '#1a1a2e', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 20, paddingHorizontal: 16 },
  inputLabel: { fontWeight: '700', fontSize: 11, color: '#9ca3af', marginBottom: 6, letterSpacing: 0.5 },
  amountInput: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#dcfce7', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 20, color: '#1a1a2e', marginBottom: 16 },
  amountInputActive: { borderColor: '#16A34A' },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderColor: '#dcfce7' },
  pillActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  pillText: { fontWeight: '700', fontSize: 11, color: '#1a1a2e' },
  pillTextActive: { color: '#fff' },
  secureNotice: { backgroundColor: 'rgba(22,163,74,0.05)', borderWidth: 1, borderColor: 'rgba(22,163,74,0.2)', borderRadius: 16, padding: 12, marginBottom: 20, flexDirection: 'row', alignItems: 'center' },
  secureNoticeText: { fontSize: 11, color: '#6b7280', flex: 1 },
  payBtn: { backgroundColor: '#16A34A', borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#16A34A', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 6 },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 2, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
})
