import { Category } from '@/type'
import cn from 'clsx'
import { router, useLocalSearchParams } from 'expo-router'
import { useState, useEffect, useRef, useMemo } from 'react'
import { FlatList, Platform, Text, TouchableOpacity, View } from 'react-native'

interface FilterProps {
  categories: Category[]
  activeCategory?: string
  onSelectCategory?: (category: string) => void
}

const Filter = ({ categories, activeCategory, onSelectCategory }: FilterProps) => {
  const searchParams = useLocalSearchParams()
  const flatListRef = useRef<FlatList>(null)
  const [internalActive, setInternalActive] = useState(searchParams.category || 'all')

  const currentActive = activeCategory !== undefined ? activeCategory : internalActive

  useEffect(() => {
    if (activeCategory === undefined && searchParams.category) {
      setInternalActive(searchParams.category)
    }
  }, [searchParams.category, activeCategory])

  const filterData: (Category | { $id: string; name: string })[] = useMemo(() => {
    return categories && categories.length > 0
      ? [{ $id: 'all', name: 'All' }, ...categories]
      : [{ $id: 'all', name: 'All' }]
  }, [categories])

  // Calculate index of currently active category pill
  const activeIndex = useMemo(() => {
    const selCat = String(currentActive || 'all').toLowerCase().trim()
    return filterData.findIndex((item) => {
      const itemVal = item.$id === 'all' ? 'all' : (item.name || item.$id)
      const valLower = String(itemVal).toLowerCase().trim()

      if (!selCat || selCat === 'all') {
        return item.$id === 'all' || valLower === 'all'
      }

      return (
        valLower === selCat ||
        item.$id === currentActive ||
        (valLower !== '' && (valLower.includes(selCat) || selCat.includes(valLower)))
      )
    })
  }, [filterData, currentActive])

  // Automatically scroll horizontal category bar to center the active category pill when selected
  useEffect(() => {
    if (activeIndex >= 0 && flatListRef.current) {
      const timer = setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({
            index: activeIndex,
            animated: true,
            viewPosition: 0.5,
          })
        } catch {
          // Fallback if scrollToIndex fails before layout
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [activeIndex, currentActive])

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

  return (
    <FlatList
      ref={flatListRef}
      data={filterData}
      keyExtractor={(item) => item.$id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-x-3 pb-1"
      onScrollToIndexFailed={(info) => {
        flatListRef.current?.scrollToOffset({
          offset: info.averageItemLength * info.index,
          animated: true,
        })
      }}
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
              isActive
                ? {
                    backgroundColor: '#53B175',
                    borderColor: '#53B175',
                    ...(Platform.OS === 'android'
                      ? { elevation: 6 }
                      : {
                          shadowColor: '#53B175',
                          shadowOpacity: 0.25,
                          shadowRadius: 8,
                          shadowOffset: { width: 0, height: 4 },
                        }),
                  }
                : {
                    backgroundColor: '#ffffff',
                    borderColor: 'rgba(83, 177, 117, 0.2)',
                    ...(Platform.OS === 'android'
                      ? { elevation: 2 }
                      : {
                          shadowColor: '#000',
                          shadowOpacity: 0.05,
                          shadowRadius: 6,
                          shadowOffset: { width: 0, height: 2 },
                        }),
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