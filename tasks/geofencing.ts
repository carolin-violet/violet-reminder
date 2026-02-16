import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { GEOFENCE_TASK_NAME } from '@/constants/geofence';
import { handlePunchReminder } from '@/utils/punch-reminder';

/**
 * 地理围栏后台任务，必须在模块顶层定义
 * 进入/离开围栏时触发打卡提醒
 */
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[Geofencing] 任务错误:', error.message);
    return;
  }
  if (!data) return;

  const { eventType } = data as { eventType: number; region: Location.LocationRegion };
  if (eventType === Location.GeofencingEventType.Enter) {
    await handlePunchReminder('enter');
  } else if (eventType === Location.GeofencingEventType.Exit) {
    await handlePunchReminder('exit');
  }
});
