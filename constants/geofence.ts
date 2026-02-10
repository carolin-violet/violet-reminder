/**
 * 打卡地点地理围栏配置
 * 从环境变量读取，对应 .env.development / .env.production
 * 高德地图经纬度拾取 https://lbs.amap.com/tools/picker
 */

const parseNum = (v: string | undefined, fallback: number) => {
  const n = parseFloat(v ?? '');
  return Number.isNaN(n) ? fallback : n;
};

const longitude = parseNum(process.env.EXPO_PUBLIC_GEOFENCE_LONGITUDE, 118.810202);
const latitude = parseNum(process.env.EXPO_PUBLIC_GEOFENCE_LATITUDE, 31.912279);
const radius = Math.max(100, parseNum(process.env.EXPO_PUBLIC_GEOFENCE_RADIUS, 100));

export const PUNCH_GEOFENCE_REGIONS = [
  {
    identifier: 'punch-office',
    longitude,
    latitude,
    radius,
    notifyOnEnter: true,
    notifyOnExit: true,
  },
] as const;

export const GEOFENCE_TASK_NAME = 'punch-geofence-task';
