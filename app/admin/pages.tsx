import React, { useState } from 'react'
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { usePagesStore, FAQItem } from '@/store/pages.store'

export default function AdminPagesManager() {
  const router = useRouter()
  const {
    aboutUs,
    supportPhone,
    supportEmail,
    supportHours,
    terms,
    privacy,
    faqs,
    updateAboutUs,
    updateSupport,
    updateTerms,
    updatePrivacy,
    addFAQ,
    updateFAQ,
    deleteFAQ,
  } = usePagesStore()

  const [activeTab, setActiveTab] = useState<'faqs' | 'about' | 'support' | 'legal'>('faqs')

  // FAQ Modal
  const [faqModalVisible, setFaqModalVisible] = useState(false)
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  // Text States
  const [tempAbout, setTempAbout] = useState(aboutUs)
  const [tempPhone, setTempPhone] = useState(supportPhone)
  const [tempEmail, setTempEmail] = useState(supportEmail)
  const [tempHours, setTempHours] = useState(supportHours)
  const [tempTerms, setTempTerms] = useState(terms)
  const [tempPrivacy, setTempPrivacy] = useState(privacy)

  const openFaqModal = (faq?: FAQItem) => {
    if (faq) {
      setEditingFaq(faq)
      setQuestion(faq.question)
      setAnswer(faq.answer)
    } else {
      setEditingFaq(null)
      setQuestion('')
      setAnswer('')
    }
    setFaqModalVisible(true)
  }

  const handleSaveFaq = () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert('Validation Error', 'Please enter both question and answer.')
      return
    }
    if (editingFaq) {
      updateFAQ(editingFaq.id, question.trim(), answer.trim())
    } else {
      addFAQ(question.trim(), answer.trim())
    }
    setFaqModalVisible(false)
    Alert.alert('Saved!', 'FAQ list updated successfully.')
  }

  const handleDeleteFaq = (id: string) => {
    Alert.alert('Delete FAQ', 'Are you sure you want to delete this question?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFAQ(id) },
    ])
  }

  const handleSaveAbout = () => {
    updateAboutUs(tempAbout)
    Alert.alert('Success', 'About Us content updated.')
  }

  const handleSaveSupport = () => {
    updateSupport(tempPhone, tempEmail, tempHours)
    Alert.alert('Success', 'Support & Contact details updated.')
  }

  const handleSaveLegal = () => {
    updateTerms(tempTerms)
    updatePrivacy(tempPrivacy)
    Alert.alert('Success', 'Terms & Privacy Policy updated.')
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      {/* Header Bar */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-gray-200 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-gray-100 px-4 py-2 rounded-full"
        >
          <Text className="text-gray-700 font-quicksand-bold">← Back</Text>
        </TouchableOpacity>
        <Text className="text-lg font-quicksand-bold text-dark-100">
          App Content Manager
        </Text>
        <View className="w-16" />
      </View>

      {/* Segmented Tab Controls */}
      <View className="flex-row bg-white px-5 py-3 border-b border-gray-200 gap-2">
        {(['faqs', 'about', 'support', 'legal'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-full items-center ${
              activeTab === tab ? 'bg-primary' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`font-quicksand-bold text-xs capitalize ${
                activeTab === tab ? 'text-white' : 'text-gray-600'
              }`}
            >
              {tab === 'faqs' ? 'FAQs' : tab === 'legal' ? 'Terms & Policy' : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* FAQS TAB */}
        {activeTab === 'faqs' && (
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-quicksand-bold text-dark-100">
                Manage FAQs ({faqs.length})
              </Text>
              <TouchableOpacity
                onPress={() => openFaqModal()}
                className="bg-primary px-4 py-2 rounded-full shadow-sm"
              >
                <Text className="text-white font-quicksand-bold text-xs">+ Add FAQ</Text>
              </TouchableOpacity>
            </View>

            {faqs.map((item) => (
              <View
                key={item.id}
                className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 shadow-sm"
              >
                <Text className="font-quicksand-bold text-dark-100 text-sm mb-1">
                  Q: {item.question}
                </Text>
                <Text className="font-quicksand-medium text-gray-500 text-xs mb-3">
                  A: {item.answer}
                </Text>
                <View className="flex-row justify-end gap-3 pt-2 border-t border-gray-100">
                  <TouchableOpacity onPress={() => openFaqModal(item)}>
                    <Text className="text-primary font-quicksand-bold text-xs">✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteFaq(item.id)}>
                    <Text className="text-red-500 font-quicksand-bold text-xs">🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <View className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm">
            <Text className="text-lg font-quicksand-bold text-dark-100 mb-2">
              Edit About Us Story & Mission
            </Text>
            <TextInput
              multiline
              numberOfLines={6}
              value={tempAbout}
              onChangeText={setTempAbout}
              placeholder="Enter About Us story..."
              className="bg-gray-50 border border-gray-200 rounded-2xl p-4 font-quicksand-medium text-sm text-dark-100 min-h-[140px] mb-4"
            />
            <TouchableOpacity
              onPress={handleSaveAbout}
              className="bg-primary py-3 rounded-full items-center"
            >
              <Text className="text-white font-quicksand-bold text-sm">Save About Us</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SUPPORT TAB */}
        {activeTab === 'support' && (
          <View className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm gap-4">
            <Text className="text-lg font-quicksand-bold text-dark-100">
              Edit Contact & Help Desk Info
            </Text>

            <View>
              <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">
                Support Phone Number
              </Text>
              <TextInput
                value={tempPhone}
                onChangeText={setTempPhone}
                placeholder="+234 800 000 0000"
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-semibold text-dark-100"
              />
            </View>

            <View>
              <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">
                Support Email Address
              </Text>
              <TextInput
                value={tempEmail}
                onChangeText={setTempEmail}
                placeholder="support@groceryapp.com"
                keyboardType="email-address"
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-semibold text-dark-100"
              />
            </View>

            <View>
              <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">
                Operating Hours
              </Text>
              <TextInput
                value={tempHours}
                onChangeText={setTempHours}
                placeholder="Mon - Sun: 8am - 10pm"
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-semibold text-dark-100"
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveSupport}
              className="bg-primary py-3.5 rounded-full items-center mt-2"
            >
              <Text className="text-white font-quicksand-bold text-sm">
                Save Support Details
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LEGAL TAB */}
        {activeTab === 'legal' && (
          <View className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm gap-4">
            <Text className="text-lg font-quicksand-bold text-dark-100">
              Edit Terms & Privacy Policy
            </Text>

            <View>
              <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">
                Terms & Conditions
              </Text>
              <TextInput
                multiline
                numberOfLines={4}
                value={tempTerms}
                onChangeText={setTempTerms}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-3 font-quicksand-medium text-xs text-dark-100 min-h-[100px]"
              />
            </View>

            <View>
              <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">
                Privacy Policy
              </Text>
              <TextInput
                multiline
                numberOfLines={4}
                value={tempPrivacy}
                onChangeText={setTempPrivacy}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-3 font-quicksand-medium text-xs text-dark-100 min-h-[100px]"
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveLegal}
              className="bg-primary py-3.5 rounded-full items-center mt-2"
            >
              <Text className="text-white font-quicksand-bold text-sm">
                Save Terms & Privacy
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add / Edit FAQ Modal */}
      <Modal
        visible={faqModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss()
          setFaqModalVisible(false)
        }}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-5">
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setFaqModalVisible(false)
            }}
            className="absolute inset-0"
          />

          <View className="bg-white rounded-3xl p-6 w-full max-w-sm z-10">
            <Text className="text-lg font-quicksand-bold text-dark-100 mb-4">
              {editingFaq ? 'Edit FAQ Item' : 'Add New FAQ'}
            </Text>

            <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">Question</Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="e.g. How fast is delivery?"
              className="bg-gray-100 border border-gray-300 rounded-2xl px-4 py-2.5 font-quicksand-semibold text-sm mb-3"
            />

            <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">Answer</Text>
            <TextInput
              multiline
              numberOfLines={3}
              value={answer}
              onChangeText={setAnswer}
              placeholder="e.g. We deliver within 30 minutes..."
              className="bg-gray-100 border border-gray-300 rounded-2xl p-3 font-quicksand-medium text-sm mb-5 min-h-[80px]"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss()
                  setFaqModalVisible(false)
                }}
                className="flex-1 bg-gray-200 py-3 rounded-full items-center"
              >
                <Text className="text-gray-700 font-quicksand-bold text-sm">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveFaq}
                className="flex-1 bg-primary py-3 rounded-full items-center"
              >
                <Text className="text-white font-quicksand-bold text-sm">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
