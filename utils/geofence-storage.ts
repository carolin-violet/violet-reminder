import AsyncStorage from '@react-native-async-storage/async-storage';

const GEOFENCE_CONFIG_KEY = '@violet/geofence-config';

export interface UserGeofenceConfig {
  longitude: number;
  latitude: number;
  address: string | null;
  radius: number;
  updatedAt: number;
}

/**
 * 读取用户选择的打卡地点配置
 */
export async function loadUserGeofenceConfig(): Promise<UserGeofenceConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(GEOFENCE_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserGeofenceConfig>;

    if (
      typeof parsed.longitude !== 'number' ||
      typeof parsed.latitude !== 'number' ||
      Number.isNaN(parsed.longitude) ||
      Number.isNaN(parsed.latitude)
    ) {
      return null;
    }

    return {
      longitude: parsed.longitude,
      latitude: parsed.latitude,
      address: typeof parsed.address === 'string' ? parsed.address : null,
      radius: typeof parsed.radius === 'number' && !Number.isNaN(parsed.radius) ? parsed.radius : 100,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * 保存用户选择的打卡地点配置
 * @param config 打卡地点配置
 */
export async function saveUserGeofenceConfig(
  config: Omit<UserGeofenceConfig, 'updatedAt'>
): Promise<void> {
  const next: UserGeofenceConfig = {
    ...config,
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(GEOFENCE_CONFIG_KEY, JSON.stringify(next));
}

/**
 * 清除用户选择的打卡地点配置（恢复为默认配置）
 */
export async function clearUserGeofenceConfig(): Promise<void> {
  await AsyncStorage.removeItem(GEOFENCE_CONFIG_KEY);
}
