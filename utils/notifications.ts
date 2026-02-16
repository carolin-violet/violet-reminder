import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const PUNCH_NOTIFICATION_CHANNEL_ID = 'punch-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 初始化通知权限与 Android 通知通道
 */
export async function initNotifications(): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(PUNCH_NOTIFICATION_CHANNEL_ID, {
      name: '打卡提醒',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

/**
 * 发送打卡提醒系统通知
 * @param title 通知标题
 * @param body 通知正文
 */
export async function sendPunchNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      ...(Platform.OS === 'android'
        ? { android: { channelId: PUNCH_NOTIFICATION_CHANNEL_ID } }
        : null),
    },
    trigger: null,
  });
}
