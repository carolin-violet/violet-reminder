import { sendPunchNotification } from '@/utils/notifications';

/** 打卡提醒类型：进入 / 离开围栏 */
export type PunchReminderType = 'enter' | 'exit';

/**
 * 打卡提醒：发送系统通知（支持后台/锁屏显示）
 */
export async function handlePunchReminder(type: PunchReminderType): Promise<void> {
  const message =
    type === 'enter' ? '您已进入打卡地点，请打卡' : '您已离开打卡地点，请打卡';

  await sendPunchNotification('打卡提醒', message);
}
