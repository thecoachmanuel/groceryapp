import React, { useState } from 'react'
import { Image, ImageProps } from 'expo-image'
import { ActivityIndicator, View } from 'react-native'
import { images } from '@/constants'

interface FastImageProps extends Omit<ImageProps, 'source'> {
  source: string | number | { uri: string }
  className?: string
  style?: any
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  placeholder?: string
}

export default function FastImage({
  source,
  className = '',
  style,
  contentFit = 'cover',
  placeholder,
  ...props
}: FastImageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  React.useEffect(() => {
    setHasError(false)
  }, [source])

  // Resolve source object/uri
  let resolvedSource: any = images.logo

  if (typeof source === 'number') {
    resolvedSource = source
  } else if (typeof source === 'string' && source.trim() !== '') {
    resolvedSource = { uri: source }
  } else if (typeof source === 'object' && source && 'uri' in source && source.uri) {
    resolvedSource = source
  }

  if (hasError) {
    resolvedSource = images.logo
  }

  return (
    <View className={`relative overflow-hidden ${className}`} style={style}>
      <Image
        source={resolvedSource}
        style={[{ width: '100%', height: '100%' }, style]}
        contentFit={contentFit}
        cachePolicy="memory"
        transition={200}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
        {...props}
      />
      {isLoading && (
        <View className="absolute inset-0 items-center justify-center bg-gray-100/50">
          <ActivityIndicator size="small" color="#16A34A" />
        </View>
      )}
    </View>
  )
}
