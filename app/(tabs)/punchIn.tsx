import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GEOFENCE_TASK_NAME, PUNCH_GEOFENCE_REGIONS } from '@/constants/geofence';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';


/** 与首页、待办、主题 tint 统一的青绿主色 */
const ACCENT = {
  light: '#0D7377',
  dark: '#2A9D8F',
};
const ACCENT_BG = {
  light: 'rgba(13, 115, 119, 0.12)',
  dark: 'rgba(42, 157, 143, 0.15)',
};
const SUCCESS = { light: '#2D7D4A', dark: '#3D9B5E' };
const ERROR_COLOR = '#C94A4A';

export default function PunchInScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const accent = ACCENT[colorScheme];
  const accentBg = ACCENT_BG[colorScheme];
  const success = SUCCESS[colorScheme];

  const enableGeofencing = useCallback(async () => {
    if (Platform.OS === 'web') return;
    setLoading(true);
    setError(null);
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        setError('需要位置权限才能使用地理围栏打卡');
        return;
      }
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        setError('需要后台位置权限才能在离开应用时接收打卡提醒');
        return;
      }
      const regions = PUNCH_GEOFENCE_REGIONS.map((r) => ({
        identifier: r.identifier,
        latitude: r.latitude,
        longitude: r.longitude,
        radius: r.radius,
        notifyOnEnter: r.notifyOnEnter,
        notifyOnExit: r.notifyOnExit,
      }));
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
      setIsActive(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '启动地理围栏失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const disableGeofencing = useCallback(async () => {
    if (Platform.OS === 'web') return;
    setLoading(true);
    setError(null);
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      setIsActive(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '关闭地理围栏失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!reduceMotion) scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, [reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    if (!reduceMotion) scale.value = withSpring(1);
  }, [reduceMotion, scale]);

  const CardWrapper = ({ children }: { children: React.ReactNode }) => (
    <View
      style={[
        styles.card,
        colorScheme === 'dark' && { backgroundColor: 'rgba(255,255,255,0.05)' },
      ]}>
      {children}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <View style={styles.hero}>
          <View style={[styles.heroIconWrap, { backgroundColor: accentBg }]}>
            <IconSymbol
              name="location.fill"
              size={64}
              color={accent}
              style={styles.heroIcon}
            />
          </View>
          <ThemedText type="title" style={styles.title}>
            打卡
          </ThemedText>
        </View>
        <ThemedText style={styles.webHint}>
          地理围栏功能仅支持 iOS 和 Android，请在真机上使用。
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.heroIconWrap, { backgroundColor: accentBg }]}>
            <IconSymbol
              name={isActive ? 'checkmark.circle.fill' : 'location.fill'}
              size={72}
              color={isActive ? success : accent}
              style={styles.heroIcon}
            />
          </View>
          <ThemedText type="title" style={styles.title}>
            打卡
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            进入或离开指定地点时提醒您
          </ThemedText>
        </View>

        <CardWrapper>
          <ThemedText style={styles.cardDesc}>
            开启地理围栏后，到达或离开打卡地点时，手机会震动并弹出提醒。
          </ThemedText>
          {error && (
            <View
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={styles.errorWrap}>
              <ThemedText style={styles.error}>{error}</ThemedText>
            </View>
          )}
          <Pressable
            accessibilityLabel={isActive ? '关闭地理围栏' : '开启地理围栏'}
            accessibilityRole="button"
            accessibilityState={{ busy: loading }}
            onPress={isActive ? disableGeofencing : enableGeofencing}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={loading}
            style={({ pressed }) => [
              styles.buttonWrapper,
              pressed && styles.buttonPressed,
            ]}>
            <Animated.View
              style={[
                styles.button,
                loading && styles.buttonDisabled,
                {
                  backgroundColor: isActive ? '#6B7280' : accent,
                },
                animatedButtonStyle,
              ]}>
            <IconSymbol
              name={isActive ? 'checkmark.circle.fill' : 'location.fill'}
              size={22}
              color="#fff"
              style={styles.buttonIcon}
            />
            <ThemedText style={styles.buttonText}>
              {loading
                ? isActive
                  ? '关闭中...'
                  : '开启中...'
                : isActive
                  ? '关闭地理围栏'
                  : '开启地理围栏'}
            </ThemedText>
            </Animated.View>
          </Pressable>
          {isActive && (
            <View style={[styles.statusPill, { backgroundColor: `${success}18` }]}>
              <ThemedText style={[styles.statusText, { color: success }]}>
                进入/离开打卡地点时将弹出提醒
              </ThemedText>
            </View>
          )}
        </CardWrapper>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroIcon: {},
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 36,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  webHint: {
    marginTop: 16,
    opacity: 0.8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: 'rgba(128, 128, 128, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardDesc: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.85,
    marginBottom: 20,
  },
  errorWrap: {
    marginBottom: 16,
  },
  error: {
    color: ERROR_COLOR,
    fontSize: 14,
  },
  buttonWrapper: {},
  buttonPressed: { opacity: 0.98 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  statusPill: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
