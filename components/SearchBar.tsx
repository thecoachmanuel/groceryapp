import { images } from '@/constants'
import React, { useRef } from 'react'
import { Image, TextInput, TouchableOpacity, View, Platform } from 'react-native'

interface SearchBarProps {
  value?: string
  onChangeText?: (text: string) => void
  placeholder?: string
}

const Searchbar = ({
  value = '',
  onChangeText,
  placeholder = "Search fresh groceries, fruits, milk...",
}: SearchBarProps) => {
  const inputRef = useRef<TextInput>(null)

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
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#A0A0A0"
        returnKeyType="search"
        blurOnSubmit={false}
        autoCorrect={false}
        autoCapitalize="none"
        keyboardType="default"
      />

      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="ml-2 bg-primary/10 p-1.5 rounded-full items-center justify-center"
        >
          <Image
            source={(images as any).close || images.trash}
            className="w-3.5 h-3.5"
            resizeMode="contain"
            tintColor="#53B175"
          />
        </TouchableOpacity>
      )}
    </View>
  )
}

export default Searchbar