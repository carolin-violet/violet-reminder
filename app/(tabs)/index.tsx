import { Link } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/** 紫罗兰主色，搭配浅紫灰/深色背景 */
const PALETTE = {
  light: {
    bg: '#F5F3FF',
    stripe: '#7C3AED',
    title: '#1E1B4B',
    subtitle: '#5B21B6',
    body: '#3730A3',
    card: '#FFFFFF',
    cardBorder: 'rgba(0,0,0,0.06)',
  },
  dark: {
    bg: '#1E1B4B',
    stripe: '#A78BFA',
    title: '#EDE9FE',
    subtitle: '#C4B5FD',
    body: '#DDD6FE',
    card: '#2E1065',
    cardBorder: 'rgba(255,255,255,0.08)',
  },
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const reduceMotion = useReducedMotion();
  const p = PALETTE[colorScheme];
  const stripeOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(12);
  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(16);

  useEffect(() => {
    const duration = reduceMotion ? 0 : 400;
    const delay = reduceMotion ? 0 : 100;
    const delayCard = reduceMotion ? 0 : 200;
    stripeOpacity.value = withTiming(1, { duration });
    titleOpacity.value = withDelay(delay, withTiming(1, { duration: reduceMotion ? 0 : 500 }));
    titleY.value = withDelay(delay, reduceMotion ? withTiming(0) : withSpring(0, { damping: 18, stiffness: 120 }));
    cardOpacity.value = withDelay(delayCard, withTiming(1, { duration: reduceMotion ? 0 : 500 }));
    cardY.value = withDelay(delayCard, reduceMotion ? withTiming(0) : withSpring(0, { damping: 18, stiffness: 120 }));
  }, [reduceMotion, stripeOpacity, titleOpacity, titleY, cardOpacity, cardY]);

  const stripeStyle = useAnimatedStyle(() => ({
    opacity: stripeOpacity.value,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 56,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.stripe,
              { backgroundColor: p.stripe },
              stripeStyle,
            ]}
          />
          <Animated.View style={titleStyle}>
            <ThemedText
              style={[
                styles.title,
                { color: p.title, fontFamily: Fonts.rounded },
              ]}>
              Violet Reminder
            </ThemedText>
            <ThemedText style={[styles.tagline, { color: p.subtitle }]}>
              地理围栏 · 打卡提醒
            </ThemedText>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: p.card,
              borderColor: p.cardBorder,
            },
            cardStyle,
          ]}>
          <ThemedText style={[styles.cardDesc, { color: p.body }]}>
            在打卡页设置地理围栏，进入或离开指定地点时，手机会震动并弹出提醒，不再忘记打卡。
          </ThemedText>
          <Link href="/(tabs)/punchIn" asChild>
            <Pressable
              accessibilityLabel="去打卡"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: p.stripe },
                pressed && styles.buttonPressed,
              ]}>
              <IconSymbol
                name="location.fill"
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
              <ThemedText style={styles.buttonText}>去打卡</ThemedText>
            </Pressable>
          </Link>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  hero: {
    marginBottom: 48,
    position: 'relative',
  },
  stripe: {
    position: 'absolute',
    left: -12,
    top: -8,
    width: 6,
    height: 88,
    borderRadius: 3,
    transform: [{ skewY: '-8deg' }],
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 46,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    letterSpacing: 1,
  },
  card: {
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardDesc: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 24,
    opacity: 0.92,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
