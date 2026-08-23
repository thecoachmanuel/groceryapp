import React, { useState } from 'react'
import { Image as RNImage, Platform, View } from 'react-native'
import { Image as ExpoImage, ImageProps as ExpoImageProps } from 'expo-image'
import { images } from '@/constants'

interface FastImageProps {
  source: any
  className?: string
  style?: any
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  placeholder?: string
  [key: string]: any
}

export default function FastImage({
  source,
  className = '',
  style,
  contentFit = 'cover',
  placeholder,
  ...props
}: FastImageProps) {
  const [hasError, setHasError] = useState(false)

  React.useEffect(() => {
    setHasError(false)
  }, [source])

  let resolvedSource: any = images.logo

  if (typeof source === 'number') {
    resolvedSource = source
  } else if (typeof source === 'string' && source.trim() !== '') {
    resolvedSource = { uri: source.trim() }
  } else if (typeof source === 'object' && source && 'uri' in source && source.uri) {
    resolvedSource = source
  }

  if (hasError || !source) {
    return (
      <View
        className={`relative overflow-hidden bg-emerald-50/50 items-center justify-center ${className}`}
        style={[{ width: '100%', height: '100%' }, style]}
      >
        <RNImage
          source={images.logo}
          style={{ width: '60%', height: '60%', opacity: 0.8 }}
          resizeMode="contain"
        />
      </View>
    )
  }

  if (Platform.OS === 'web') {
    return (
      <View className={`relative overflow-hidden ${className}`} style={[{ width: '100%', height: '100%' }, style]}>
        <RNImage
          source={resolvedSource}
          style={[{ width: '100%', height: '100%' }, style]}
          resizeMode={contentFit === 'contain' ? 'contain' : 'cover'}
          onError={() => setHasError(true)}
          {...props}
        />
      </View>
    )
  }

  return (
    <View className={`relative overflow-hidden ${className}`} style={[{ width: '100%', height: '100%' }, style]}>
      <ExpoImage
        source={resolvedSource}
        style={[{ width: '100%', height: '100%' }, style]}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        transition={200}
        onError={() => setHasError(true)}
        {...props}
      />
    </View>
  )
}
