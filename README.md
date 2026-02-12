# Violet Reminder

基于地理围栏的打卡提醒 + 待办应用，使用 [Expo](https://expo.dev) 构建。

## 应用功能

应用底部有三个 Tab，对应以下功能：

### 首页

- 展示应用名称「Violet Reminder」与简介（地理围栏 · 打卡提醒）
- 说明地理围栏能力：进入或离开指定地点时震动并弹出提醒
- 提供「去打卡」入口，跳转到打卡页

### 打卡

- **开启 / 关闭地理围栏**：需授予「使用期间」与「始终」位置权限
- **进入或离开**配置的打卡范围时，手机会**间断震动**并弹出**打卡提醒**弹窗
- 用户点击「确认」后震动停止；可随时在页面内关闭地理围栏
- 打卡地点与半径在 `constants/geofence.ts` 或环境变量中配置（见项目结构）
- Web 端仅展示说明，地理围栏需在 iOS / Android 真机使用

### 待办事项

- **新增待办**：输入标题，可选截止日期（不选也可），支持无限条
- **列表规则**：按截止日期从近到远排序，无日期的排在最下
- **日期展示**：格式为 `YYYY-MM-DD`；**已逾期**标红，**截止日期在 3 天内**标黄
- **修改截止日期**：每条待办上点击日期或「设截止日期」可修改该条截止日
- **删除**：每条支持删除
- **本地存储**：数据保存在本机（AsyncStorage），无需后端

## 快速开始

项目使用 **pnpm** 管理依赖。请勿提交 `package-lock.json`，仅保留 `pnpm-lock.yaml`，否则 `pnpm run doctor` 可能报「多锁文件」错误。

1. **安装依赖**

   ```bash
   pnpm install
   ```

2. **启动开发服务器**

   ```bash
   pnpm start
   ```

   或使用 npm：`npm start` / `npx expo start`

3. **运行应用**

   - [开发构建](https://docs.expo.dev/develop/development-builds/introduction/)
   - [Android 模拟器](https://docs.expo.dev/workflow/android-studio-emulator/)
   - [iOS 模拟器](https://docs.expo.dev/workflow/ios-simulator/)
   - [Expo Go](https://expo.dev/go)：扫码在真机预览

> 地理围栏功能仅支持 iOS 和 Android 真机，Web 端无法使用。

## 依赖与 SDK 检查

项目使用 pnpm，并已配置与当前 Expo SDK 对齐的依赖。建议在安装或升级依赖后跑一次检查：

| 命令 | 说明 |
|------|------|
| `pnpm run doctor` | 运行 expo-doctor，检查依赖版本、锁文件、配置等是否与 SDK 一致 |
| `pnpm run install:check` | 运行 `expo install --check`，仅检查各包版本是否与 SDK 推荐一致 |

若 `doctor` 报版本不匹配，可用 `npx expo install --fix` 按 SDK 推荐版本修复。

## 打包 (EAS Build)

需先登录：`eas login`

| Profile      | 命令 | 输出格式 | 用途 |
|-------------|------|----------|------|
| production  | `eas build --platform android --profile production` | AAB | 上架 Google Play |
| preview-apk | `eas build --platform android --profile preview-apk` | APK | 内测 / 直接安装 |

均使用 `.env.production` 环境变量。
使用EAS构建一定要开梯子并且tun模式

### EAS 使用 pnpm

项目已配置为在 EAS 云端使用 **pnpm** 安装依赖（`eas.json` 中 `build.base` 指定 `pnpm` 版本），与本地一致。请确保：

- 只提交 **pnpm-lock.yaml**，不要提交 `package-lock.json`（已加入 `.gitignore`）。
- 若仓库里已有 `package-lock.json`，删除并提交一次，否则 EAS 可能仍会用 npm。

## 项目结构

- `app/(tabs)/`：底部 Tab 页面
  - `index.tsx` — 首页
  - `punchIn.tsx` — 打卡（地理围栏开关）
  - `todo.tsx` — 待办事项
- `app/_layout.tsx`：根布局、注册地理围栏任务
- `components/`：通用组件（如 ThemedText、IconSymbol、HapticTab）
- `constants/`：主题 `theme.ts`、打卡围栏配置 `geofence.ts`（可配合 `.env.development` / `.env.production` 中的 `EXPO_PUBLIC_GEOFENCE_*`）
- `utils/`：本地存储与打卡提醒（`todo-storage.ts`、`punch-reminder.ts`）
- `tasks/`：后台任务（地理围栏监听 `geofencing.ts`）

## 技术栈

- React Native + Expo SDK 54
- expo-router（文件路由与 Tab）
- expo-location（定位与地理围栏）
- expo-task-manager（后台任务）
- @react-native-async-storage/async-storage（待办本地持久化）
- @react-native-community/datetimepicker（待办截止日期选择）

## 可扩展项

- 使用 expo-notifications 在后台推送打卡提醒
- 设置页：用户自定义打卡地点、半径

## 更多资源

- [Expo 文档](https://docs.expo.dev/)
- [Expo 教程](https://docs.expo.dev/tutorial/introduction/)