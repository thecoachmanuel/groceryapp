import { create } from 'zustand'

export interface FAQItem {
  id: string
  question: string
  answer: string
}

export interface AppPagesContent {
  aboutUs: string
  supportPhone: string
  supportEmail: string
  supportHours: string
  terms: string
  privacy: string
  faqs: FAQItem[]
}

const DEFAULT_FAQS: FAQItem[] = [
  {
    id: '1',
    question: 'How fast is delivery?',
    answer: 'We deliver fresh groceries to your doorstep within 25 to 40 minutes depending on your location.',
  },
  {
    id: '2',
    question: 'What payment methods do you accept?',
    answer: 'We accept Credit/Debit Cards, Bank Transfer, Paystack, and Mobile Wallet payments securely.',
  },
  {
    id: '3',
    question: 'How do I track my live order?',
    answer: 'Go to your Orders History from your profile tab and tap on any active order to see real-time delivery status.',
  },
  {
    id: '4',
    question: 'What is your refund policy?',
    answer: 'If any item is missing or damaged upon delivery, contact our support within 24 hours for instant refund or replacement.',
  },
]

const DEFAULT_CONTENT: AppPagesContent = {
  aboutUs:
    'Grocery App is your premier multi-vendor grocery and food delivery service. We connect you directly with fresh farms, local markets, and top sellers to bring quality groceries straight to your home.',
  supportPhone: '+234 703 858 7375',
  supportEmail: 'support@groceryapp.com',
  supportHours: 'Mon - Sun: 8:00 AM - 10:00 PM',
  terms:
    'By using Grocery App, you agree to our service guidelines, fair use policy, and terms of delivery. All purchases are processed through verified payment channels.',
  privacy:
    'We respect your personal privacy. Your data, location information, and contact details are securely encrypted and used strictly for fulfilling your grocery orders.',
  faqs: DEFAULT_FAQS,
}

type PagesState = AppPagesContent & {
  updateAboutUs: (text: string) => void
  updateSupport: (phone: string, email: string, hours: string) => void
  updateTerms: (text: string) => void
  updatePrivacy: (text: string) => void
  addFAQ: (question: string, answer: string) => void
  updateFAQ: (id: string, question: string, answer: string) => void
  deleteFAQ: (id: string) => void
}

export const usePagesStore = create<PagesState>((set) => ({
  ...DEFAULT_CONTENT,
  updateAboutUs: (aboutUs) => set({ aboutUs }),
  updateSupport: (supportPhone, supportEmail, supportHours) =>
    set({ supportPhone, supportEmail, supportHours }),
  updateTerms: (terms) => set({ terms }),
  updatePrivacy: (privacy) => set({ privacy }),
  addFAQ: (question, answer) =>
    set((state) => ({
      faqs: [
        ...state.faqs,
        { id: Date.now().toString(), question, answer },
      ],
    })),
  updateFAQ: (id, question, answer) =>
    set((state) => ({
      faqs: state.faqs.map((f) => (f.id === id ? { ...f, question, answer } : f)),
    })),
  deleteFAQ: (id) =>
    set((state) => ({
      faqs: state.faqs.filter((f) => f.id !== id),
    })),
}))

export default usePagesStore
