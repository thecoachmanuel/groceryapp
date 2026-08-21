import { Category } from '@/type'
import cn from 'clsx'
import { router, useLocalSearchParams } from 'expo-router'
import { useState, useEffect } from 'react'
import { FlatList, Platform, Text, TouchableOpacity, View } from 'react-native'

interface FilterProps {
  categories: Category[]
  activeCategory?: string
  onSelectCategory?: (category: string) => void
}

const Filter = ({ categories, activeCategory, onSelectCategory }: FilterProps) => {
  const searchParams = useLocalSearchParams()
  const [internalActive, setInternalActive] = useState(searchParams.category || 'all')

  const currentActive = activeCategory !== undefined ? activeCategory : internalActive

  useEffect(() => {
    if (activeCategory === undefined && searchParams.category) {
      setInternalActive(searchParams.category)
    }
  }, [searchParams.category, activeCategory])

  const handlePress = (item: any) => {
    const target = item.$id === 'all' ? 'all' : (item.name || item.$id)
    if (activeCategory === undefined) {
      setInternalActive(target)
      if (target === 'all') router.setParams({ category: undefined })
      else router.setParams({ category: target })
    }
    if (onSelectCategory) {
      onSelectCategory(target)
    }
  }

  const filterData: (Category | { $id: string; name: string })[] = categories
    ? [{ $id: 'all', name: 'All' }, ...categories]
    : [{ $id: 'all', name: 'All' }]

  return (
    <FlatList
      data={filterData}
      keyExtractor={(item) => item.$id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-x-3 pb-1"
      renderItem={({ item }) => {
        const itemVal = item.$id === 'all' ? 'all' : (item.name || item.$id)
        const isActive =
          currentActive === itemVal ||
          currentActive === item.$id ||
          (item.$id === 'all' && (!currentActive || currentActive === 'all'))

        return (
          <TouchableOpacity
            onPress={() => handlePress(item)}
            className={cn(
              'px-5 py-2.5 rounded-full border flex-row items-center',
              isActive
                ? 'bg-primary border-primary'
                : 'bg-white border-primary/20'
            )}
            style={
              Platform.OS === 'android'
                ? { elevation: isActive ? 6 : 2 }
                : {
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                  }
            }
          >
            {isActive && (
              <View className="w-2 h-2 bg-white rounded-full mr-2" />
            )}
            <Text
              className={cn(
                'font-quicksand-bold text-xs',
                isActive ? 'text-white' : 'text-dark-100'
              )}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )
      }}
    />
  )
}

export default Filter