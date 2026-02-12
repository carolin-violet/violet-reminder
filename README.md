# Violet Reminder

基于地理围栏的打卡提醒应用，使用 [Expo](https://expo.dev) 构建。

## 功能

- **地理围栏打卡**：设置打卡地点，进入或离开指定范围时震动并弹出提醒
- **待办事项**：待办列表（占位）

## 快速开始

1. 安装依赖

   ```bash
   npm install / pnpm install(推荐)
   ```

2. 启动开发服务器

   ```bash
   npm start
   ```

   或：

   ```bash
   npx expo start
   ```

3. 运行应用

   - [开发构建](https://docs.expo.dev/develop/development-builds/introduction/)
   - [Android 模拟器](https://docs.expo.dev/workflow/android-studio-emulator/)
   - [iOS 模拟器](https://docs.expo.dev/workflow/ios-simulator/)
   - [Expo Go](https://expo.dev/go)：扫描二维码在真机预览

> 地理围栏功能仅支持 iOS 和 Android 真机，Web 端无法使用。

## 打包 (EAS Build)

需先登录：`eas login`

| Profile      | 命令 | 输出格式 | 用途 |
|-------------|------|----------|------|
| production  | `eas build --platform android --profile production` | AAB | 上架 Google Play |
| preview-apk | `eas build --platform android --profile preview-apk` | APK | 内测 / 直接安装 |

均使用 `.env.production` 环境变量。

## 项目结构

- `app/`：页面与路由（[文件路由](https://docs.expo.dev/router/introduction/)）
- `components/`：通用组件
- `constants/`：常量配置（如打卡地点 `geofence.ts`）
- `tasks/`：后台任务（地理围栏监听）

## 技术栈

- React Native + Expo
- expo-location（定位与地理围栏）
- expo-task-manager（后台任务）
- expo-router（路由）

## 更多资源

- [Expo 文档](https://docs.expo.dev/)
- [Expo 教程](https://docs.expo.dev/tutorial/introduction/)


## 可扩展项
- 用 expo-notifications 在后台推送打卡提醒
- 设置页：用户自定义打卡地点、半径