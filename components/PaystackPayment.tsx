/**
 * PaystackWebView wrapper for Expo / React Native
 *
 * Usage:
 *   <PaystackPayment
 *     visible={showPaystack}
 *     amount={5000}          // in NAIRA (we multiply by 100 internally to get kobo)
 *     email={user.email}
 *     onSuccess={(ref) => handleSuccess(ref)}
 *     onCancel={() => setShowPaystack(false)}
 *   />
 */

import React, { useRef } from 'react'
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'

const PAYSTACK_PK = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || ''

interface PaystackPaymentProps {
  visible: boolean
  amount: number        // in Naira
  email: string
  name?: string
  reference?: string
  onSuccess: (reference: string) => void
  onCancel: () => void
  metadata?: Record<string, any>
}

export function PaystackPayment({
  visible,
  amount,
  email,
  name,
  reference,
  onSuccess,
  onCancel,
  metadata = {},
}: PaystackPaymentProps) {
  const ref = reference || `TX_${Date.now()}_${Math.floor(Math.random() * 100000)}`
  const amountKobo = Math.round(amount * 100)

  // Build inline HTML that loads Paystack Inline JS
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    #msg { font-family: sans-serif; color: #555; font-size: 15px; }
  </style>
</head>
<body>
  <p id="msg">Initializing payment…</p>
  <script src="https://js.paystack.co/v1/inline.js"></script>
  <script>
    window.onload = function() {
      try {
        var handler = PaystackPop.setup({
          key: '${PAYSTACK_PK}',
          email: '${email}',
          amount: ${amountKobo},
          currency: 'NGN',
          ref: '${ref}',
          firstname: '${(name || email).split(' ')[0]}',
          metadata: ${JSON.stringify(metadata)},
          callback: function(response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', reference: response.reference }));
          },
          onClose: function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cancel' }));
          }
        });
        handler.openIframe();
      } catch(e) {
        document.getElementById('msg').innerText = 'Payment error: ' + e.message;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: e.message }));
      }
    };
  </script>
</body>
</html>
`

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.type === 'success') {
        onSuccess(data.reference || ref)
      } else if (data.type === 'cancel' || data.type === 'error') {
        onCancel()
      }
    } catch {
      onCancel()
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Secure Payment</Text>
          <View style={{ width: 70 }} />
        </View>

        {/* Paystack WebView */}
        <WebView
          source={{ html }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#16A34A" />
              <Text style={styles.loadingText}>Loading Payment Gateway…</Text>
            </View>
          )}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  cancelBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cancelText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  loading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 13 },
})
