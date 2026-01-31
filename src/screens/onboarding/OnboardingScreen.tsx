import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../hooks/useTheme';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import type { RootStackParamList } from '../../types';

const { width, height } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface OnboardingSlide {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'credit-card-check',
    iconColor: '#007AFF',
    title: 'サブスクを一括管理',
    description:
      'Netflix、Spotify、Apple Musicなど、すべてのサブスクリプションを一つのアプリで管理できます。',
  },
  {
    id: '2',
    icon: 'email-search',
    iconColor: '#34C759',
    title: 'メールから自動検出',
    description:
      'iCloudメールをスキャンして、App Storeの課金を自動で検出。手動入力の手間を省けます。',
  },
  {
    id: '3',
    icon: 'bell-ring',
    iconColor: '#FF9500',
    title: '支払日をお知らせ',
    description:
      '次の支払日が近づくと通知でお知らせ。うっかり忘れを防ぎます。',
  },
  {
    id: '4',
    icon: 'chart-line',
    iconColor: '#AF52DE',
    title: '支出を見える化',
    description:
      '月々いくら使っているか、カテゴリ別の内訳、年間コストをグラフで確認できます。',
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { updateSettings } = useSubscriptionStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const styles = createStyles(theme);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = () => {
    updateSettings({ hasSeenOnboarding: true });
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    );
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index || 0);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={[styles.iconContainer, { backgroundColor: item.iconColor + '20' }]}>
        <Icon name={item.icon} size={80} color={item.iconColor} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 20, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>スキップ</Text>
      </TouchableOpacity>

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
      />

      {renderDots()}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? 'はじめる' : '次へ'}
          </Text>
          <Icon
            name={currentIndex === slides.length - 1 ? 'check' : 'arrow-right'}
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    skipButton: {
      position: 'absolute',
      top: 60,
      right: 20,
      zIndex: 10,
      padding: 8,
    },
    skipText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    slide: {
      width,
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingTop: height * 0.15,
    },
    iconContainer: {
      width: 160,
      height: 160,
      borderRadius: 80,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 16,
    },
    description: {
      fontSize: 17,
      lineHeight: 26,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 40,
    },
    dot: {
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 50,
    },
    button: {
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 14,
      gap: 8,
    },
    buttonText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
