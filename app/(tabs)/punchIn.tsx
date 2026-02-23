import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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
import {
  clearUserGeofenceConfig,
  loadUserGeofenceConfig,
  saveUserGeofenceConfig,
  type UserGeofenceConfig,
} from '@/utils/geofence-storage';


/** 紫罗兰主色，与应用名 Violet 一致 */
const ACCENT = {
  light: '#7C3AED',
  dark: '#A78BFA',
};
const ACCENT_BG = {
  light: 'rgba(124, 58, 237, 0.12)',
  dark: 'rgba(167, 139, 250, 0.15)',
};
const SUCCESS = { light: '#2D7D4A', dark: '#3D9B5E' };
const ERROR_COLOR = '#C94A4A';

export default function PunchInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userGeofence, setUserGeofence] = useState<UserGeofenceConfig | null>(null);
  const [radiusInput, setRadiusInput] = useState('');
  const [radiusError, setRadiusError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const accent = ACCENT[colorScheme];
  const accentBg = ACCENT_BG[colorScheme];
  const success = SUCCESS[colorScheme];

  const defaultGeofence = PUNCH_GEOFENCE_REGIONS[0];

  useEffect(() => {
    const nextRadius = userGeofence?.radius ?? defaultGeofence.radius;
    setRadiusInput(String(nextRadius));
  }, [defaultGeofence.radius, userGeofence?.radius]);

  const geofenceDisplay = useMemo(() => {
    const radius = userGeofence?.radius ?? defaultGeofence.radius;
    if (userGeofence) {
      return {
        title: userGeofence.address ?? '自定义地点',
        subtitle: `${userGeofence.longitude.toFixed(6)}, ${userGeofence.latitude.toFixed(6)} · 半径 ${radius}m`,
      };
    }

    return {
      title: '默认地点（环境变量）',
      subtitle: `${defaultGeofence.longitude.toFixed(6)}, ${defaultGeofence.latitude.toFixed(6)} · 半径 ${radius}m`,
    };
  }, [defaultGeofence.latitude, defaultGeofence.longitude, userGeofence]);

  /**
   * 保存围栏半径配置（单位：米，最小 100）
   */
  const saveRadius = useCallback(async () => {
    setRadiusError(null);
    const next = Math.floor(Number(radiusInput));
    if (!Number.isFinite(next) || Number.isNaN(next)) {
      setRadiusError('请输入合法的半径（单位：米）');
      return;
    }
    if (next < 100) {
      setRadiusError('半径最小为 100 米');
      return;
    }

    const latest = (await loadUserGeofenceConfig()) ?? userGeofence;
    const longitude = latest?.longitude ?? defaultGeofence.longitude;
    const latitude = latest?.latitude ?? defaultGeofence.latitude;
    const address = latest?.address ?? null;
    await saveUserGeofenceConfig({ longitude, latitude, address, radius: next });
    const refreshed = await loadUserGeofenceConfig();
    setUserGeofence(refreshed);
  }, [defaultGeofence.latitude, defaultGeofence.longitude, radiusInput, userGeofence]);

  useEffect(() => {
    (async () => {
      const cfg = await loadUserGeofenceConfig();
      setUserGeofence(cfg);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const cfg = await loadUserGeofenceConfig();
        setUserGeofence(cfg);
      })();
    }, [])
  );

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

      const latestUser = await loadUserGeofenceConfig();
      setUserGeofence(latestUser);

      const targetLongitude = latestUser?.longitude ?? defaultGeofence.longitude;
      const targetLatitude = latestUser?.latitude ?? defaultGeofence.latitude;
      const targetRadius = latestUser?.radius ?? defaultGeofence.radius;

      const regions = PUNCH_GEOFENCE_REGIONS.map((r) => ({
        identifier: r.identifier,
        latitude: targetLatitude,
        longitude: targetLongitude,
        radius: targetRadius,
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

          <View style={styles.locationCard}>
            <View style={styles.locationCardBody}>
              <ThemedText style={styles.locationTitle} numberOfLines={1}>
                {geofenceDisplay.title}
              </ThemedText>
              <ThemedText style={styles.locationSubtitle} numberOfLines={1}>
                {geofenceDisplay.subtitle}
              </ThemedText>
            </View>
            <Pressable
              accessibilityLabel="选择打卡地点"
              accessibilityRole="button"
              onPress={() => router.push('/amap-picker' as never)}
              style={({ pressed }) => [styles.locationBtn, pressed && styles.locationBtnPressed]}>
              <IconSymbol name="map.fill" size={16} color={accent} style={styles.locationBtnIcon} />
              <ThemedText style={[styles.locationBtnText, { color: accent }]}>选地点</ThemedText>
            </Pressable>
          </View>

          <View style={styles.radiusRow}>
            <View style={styles.radiusInputWrap}>
              <ThemedText style={styles.radiusLabel}>围栏半径（米）</ThemedText>
              <TextInput
                value={radiusInput}
                onChangeText={(v) => setRadiusInput(v)}
                keyboardType="numeric"
                placeholder="例如：100"
                placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'}
                style={[
                  styles.radiusInput,
                  colorScheme === 'dark' && styles.radiusInputDark,
                  { borderColor: radiusError ? ERROR_COLOR : `${accent}33` },
                ]}
              />
            </View>
            <Pressable
              accessibilityLabel="保存围栏半径"
              accessibilityRole="button"
              onPress={() => void saveRadius()}
              style={({ pressed }) => [styles.radiusSaveBtn, pressed && styles.radiusSaveBtnPressed]}>
              <ThemedText style={[styles.radiusSaveText, { color: accent }]}>保存</ThemedText>
            </Pressable>
          </View>

          {radiusError && <ThemedText style={styles.radiusError}>{radiusError}</ThemedText>}

          {userGeofence && (
            <Pressable
              accessibilityLabel="重置为默认地点"
              accessibilityRole="button"
              onPress={async () => {
                await clearUserGeofenceConfig();
                setUserGeofence(null);
              }}
              style={({ pressed }) => [styles.resetBtn, pressed && styles.resetBtnPressed]}>
              <IconSymbol
                name="arrow.counterclockwise"
                size={16}
                color={ERROR_COLOR}
                style={styles.resetBtnIcon}
              />
              <ThemedText style={[styles.resetBtnText, { color: ERROR_COLOR }]}>重置为默认地点</ThemedText>
            </Pressable>
          )}

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
  radiusRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  radiusInputWrap: {
    flex: 1,
  },
  radiusLabel: {
    fontSize: 13,
    opacity: 0.75,
    marginBottom: 8,
  },
  radiusInput: {
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    color: '#111827',
  },
  radiusInputDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.92)',
  },
  radiusSaveBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  radiusSaveBtnPressed: {
    opacity: 0.85,
  },
  radiusSaveText: {
    fontSize: 14,
    fontWeight: '600',
  },
  radiusError: {
    marginTop: 10,
    color: ERROR_COLOR,
    fontSize: 13,
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
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    marginBottom: 14,
  },
  locationCardBody: { flex: 1, marginRight: 10 },
  locationTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  locationSubtitle: { fontSize: 12, opacity: 0.75 },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  locationBtnPressed: { opacity: 0.85 },
  locationBtnIcon: { marginRight: 6 },
  locationBtnText: { fontSize: 13, fontWeight: '600' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: 'rgba(201,74,74,0.08)',
  },
  resetBtnPressed: { opacity: 0.85 },
  resetBtnIcon: { marginRight: 6 },
  resetBtnText: { fontSize: 13, fontWeight: '600' },
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
