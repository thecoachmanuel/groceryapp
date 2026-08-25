import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import cn from 'clsx'
import { CustomInputProps } from '@/type'

const CustomInput = ({
  placeholder = 'Enter text',
  value,
  onChangeText,
  label,
  secureTextEntry = false,
  keyboardType = 'default',
}: CustomInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isPasswordInput = secureTextEntry

  return (
    <View className="w-full">
      {label && <Text className="label">{label}</Text>}

      <View className="relative justify-center w-full">
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPasswordInput && !showPassword}
          keyboardType={keyboardType}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          style={{ paddingRight: isPasswordInput ? 44 : 0 }}
          className={cn(
            'input',
            isFocused ? 'border-primary' : 'border-gray-300'
          )}
        />

        {isPasswordInput && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 top-0 bottom-0 justify-center px-1 z-10"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color="#53B175"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default CustomInput