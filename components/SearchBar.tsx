import { images } from '@/constants'
import React, { useRef, useState, useEffect, useMemo } from 'react'
import { ActivityIndicator, Image, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native'

interface SearchBarProps {
  value?: string
  onChangeText?: (text: string) => void
  placeholder?: string
  placeholderPrefix?: string
  placeholderWords?: string[]
  isLoading?: boolean
}

const Searchbar = ({
  value = '',
  onChangeText,
  placeholder = "Search fresh groceries, fruits, milk...",
  placeholderPrefix = '',
  placeholderWords = [],
  isLoading = false,
}: SearchBarProps) => {
  const inputRef = useRef<TextInput>(null)
  const [wordIndex, setWordIndex] = useState(0)

  useEffect(() => {
    if (!placeholderWords || placeholderWords.length === 0) return

    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % placeholderWords.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [placeholderWords])

  const dynamicPlaceholder = useMemo(() => {
    if (placeholderWords && placeholderWords.length > 0) {
      const word = placeholderWords[wordIndex % placeholderWords.length]
      if (word.toLowerCase().startsWith('search ')) {
        return `${word}...`
      }
      return `${placeholderPrefix}${word}...`
    }
    return placeholder
  }, [placeholder, placeholderPrefix, placeholderWords, wordIndex])

  const handleClear = () => {
    if (onChangeText) {
      onChangeText('')
    }
    inputRef.current?.focus()
  }

  return (
    <View
      className="flex-row items-center bg-white rounded-full px-4 py-0.5 border border-primary/10"
      style={
        Platform.OS === 'android'
          ? { elevation: 4 }
          : {
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 5 },
            }
      }
    >
      <Image
        source={images.search}
        className="w-5 h-5 mr-3"
        resizeMode="contain"
        tintColor="#878787"
      />

      <TextInput
        ref={inputRef}
        className="flex-1 py-3 text-dark-100 font-quicksand-semibold text-sm"
        placeholder={dynamicPlaceholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#A0A0A0"
        returnKeyType="search"
        blurOnSubmit={false}
        autoCorrect={false}
        autoCapitalize="none"
        keyboardType="default"
      />

      {isLoading ? (
        <ActivityIndicator size="small" color="#53B175" className="ml-2" />
      ) : value.length > 0 ? (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          className="ml-3 items-center justify-center"
        >
          <Text style={{ fontSize: 18, color: '#9CA3AF', lineHeight: 20, fontWeight: '600' }}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export default Searchbar