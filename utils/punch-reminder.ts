import { Alert, Vibration } from 'react-native';

/** 打卡提醒类型：进入 / 离开围栏 */
export type PunchReminderType = 'enter' | 'exit';

const VIBRATE_INTERVAL_MS = 7500;
const VIBRATE_DURATION_MS = 1000;

/**
 * 打卡提醒：间断振动 + 弹窗，点击确认后停止振动
 */
export function handlePunchReminder(type: PunchReminderType): void {
  const message =
    type === 'enter' ? '您已进入打卡地点，请打卡' : '您已离开打卡地点，请打卡';

  const intervalId = setInterval(() => {
    Vibration.vibrate(VIBRATE_DURATION_MS);
  }, VIBRATE_INTERVAL_MS);

  const stopVibration = () => {
    clearInterval(intervalId);
    Vibration.cancel();
  };

  Alert.alert('打卡提醒', message, [{ text: '确认', onPress: stopVibration }], {
    onDismiss: stopVibration,
  });
}
