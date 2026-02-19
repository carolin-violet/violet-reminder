import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WebViewMessageEvent } from 'react-native-webview';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PUNCH_GEOFENCE_REGIONS } from '@/constants/geofence';
import { loadUserGeofenceConfig, saveUserGeofenceConfig } from '@/utils/geofence-storage';

type PickerMessage =
  | { type: 'select'; payload: { longitude: number; latitude: number; address: string | null } }
  | { type: 'error'; payload: { message: string; source?: string; line?: number; column?: number } }
  | { type: 'toast'; payload: { message: string } };

/**
 * 注入高德 Key 与初始坐标到 H5 模板
 * @param html H5 模板内容
 * @param amapKey 高德 JS Key
 * @param initLongitude 初始经度
 * @param initLatitude 初始纬度
 */
function injectAmapHtml(
  html: string,
  amapKey: string,
  amapSecurityJsCode: string | null,
  initLongitude: number,
  initLatitude: number
): string {
  const injectedKeyLine = `var key = ${JSON.stringify(amapKey)};`;
  const injectedSecurityCodeLine = `var securityJsCode = ${JSON.stringify(amapSecurityJsCode ?? '')};`;
  return html
    .replace("var key = '__AMAP_KEY__';", injectedKeyLine)
    .replace("var securityJsCode = '__AMAP_SECURITY_JS_CODE__';", injectedSecurityCodeLine)
    .replaceAll('__INIT_LNG__', String(initLongitude))
    .replaceAll('__INIT_LAT__', String(initLatitude));
}

export default function AmapPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [html, setHtml] = useState<string | null>(null);

  const amapKey = process.env.EXPO_PUBLIC_AMAP_WEB_KEY;
  const amapSecurityJsCode = process.env.EXPO_PUBLIC_AMAP_SECURITY_JS_CODE ?? null;

  const fallback = PUNCH_GEOFENCE_REGIONS[0];
  const fallbackLongitude = fallback.longitude;
  const fallbackLatitude = fallback.latitude;

  const contentInsets = useMemo(
    () => ({ paddingTop: insets.top, paddingBottom: insets.bottom }),
    [insets.top, insets.bottom]
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      setHtml(null);
      return;
    }

    (async () => {
      try {
        if (!amapKey || amapKey.trim().length === 0) {
          Alert.alert(
            '缺少配置',
            '请配置 EXPO_PUBLIC_AMAP_WEB_KEY，并重启 Expo（建议 expo start -c）'
          );
          router.back();
          return;
        }

        const source = Image.resolveAssetSource(require('../assets/amap-picker.html'));
        const res = await fetch(source.uri);
        const template = await res.text();

        if (!template.includes('__AMAP_KEY__')) {
          Alert.alert('错误', '选点页面模板异常：未找到 __AMAP_KEY__ 占位符');
          router.back();
          return;
        }

        const user = await loadUserGeofenceConfig();
        const initLongitude = user?.longitude ?? fallbackLongitude;
        const initLatitude = user?.latitude ?? fallbackLatitude;

        const injected = injectAmapHtml(template, amapKey, amapSecurityJsCode, initLongitude, initLatitude);
        if (/var\s+key\s*=\s*['"]__AMAP_KEY__['"]\s*;/.test(injected)) {
          Alert.alert('错误', '高德 Key 注入失败：仍为占位符，请检查 EXPO_PUBLIC_AMAP_WEB_KEY 配置与重启缓存');
          router.back();
          return;
        }

        if (/var\s+key\s*=\s*['"]\s*['"]\s*;/.test(injected)) {
          Alert.alert('错误', '高德 Key 注入失败：key 为空字符串，请检查 EXPO_PUBLIC_AMAP_WEB_KEY 配置与重启缓存');
          router.back();
          return;
        }

        setHtml(injected);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '加载选点页面失败';
        Alert.alert('错误', msg);
        router.back();
      }
    })();
  }, [amapKey, fallbackLatitude, fallbackLongitude, router]);

  if (Platform.OS === 'web') {
    return (
      <ThemedView style={[styles.container, contentInsets]}>
        <ThemedText style={styles.hint}>当前页面仅支持 iOS/Android 真机。</ThemedText>
      </ThemedView>
    );
  }

  if (html == null) {
    return (
      <ThemedView style={[styles.container, contentInsets]}>
        <ThemedText style={styles.hint}>加载中…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <WebView
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode={Platform.OS === 'android' ? 'always' : 'never'}
        source={{ html, baseUrl: 'https://webapi.amap.com/' }}
        onError={(ev) => {
          Alert.alert('错误', `WebView 加载失败：${ev.nativeEvent.description}`);
        }}
        onHttpError={(ev) => {
          Alert.alert(
            '错误',
            `WebView 请求失败：${ev.nativeEvent.statusCode} ${ev.nativeEvent.description ?? ''}`
          );
        }}
        onMessage={async (ev: WebViewMessageEvent) => {
          try {
            const raw = ev.nativeEvent.data;
            const msg = JSON.parse(raw) as PickerMessage;

            if (msg.type === 'select') {
              const { longitude, latitude, address } = msg.payload;
              if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
                Alert.alert('错误', '选点数据不合法，请重试');
                return;
              }
              const existing = await loadUserGeofenceConfig();
              const radius = existing?.radius ?? fallback.radius;
              await saveUserGeofenceConfig({ longitude, latitude, address: address ?? null, radius });
              router.back();
              return;
            }

            if (msg.type === 'toast') {
              return;
            }

            if (msg.type === 'error') {
              const meta =
                msg.payload.source || msg.payload.line != null || msg.payload.column != null
                  ? `\n\nsource: ${msg.payload.source ?? ''}\nline: ${msg.payload.line ?? ''}\ncolumn: ${msg.payload.column ?? ''}`
                  : '';
              Alert.alert('错误', `${msg.payload.message}${meta}`);
              return;
            }
          } catch {
            // 忽略解析失败
          }
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  hint: { textAlign: 'center', opacity: 0.7, marginTop: 24 },
});
