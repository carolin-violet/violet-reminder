/**
 * 打卡地点地理围栏配置
 * 坐标和半径可根据实际需求修改
 * 高德地图经纬度拾取  https://lbs.amap.com/tools/picker
 * 九龙湖：118.810202,31.912279
 */
export const PUNCH_GEOFENCE_REGIONS = [
  {
    identifier: 'punch-office',
    longitude: 118.810202, // 经度
    latitude: 31.912279,   // 纬度
    radius: 100,  // 半径，单位：米 建议100米以上
    notifyOnEnter: true,
    notifyOnExit: true,
  },
] as const;

export const GEOFENCE_TASK_NAME = 'punch-geofence-task';
