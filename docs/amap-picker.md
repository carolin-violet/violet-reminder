# 高德地图选点（WebView）功能实现笔记

本文档沉淀「高德 JS API Web 选点页」在本项目中的实现方式，包含关键依赖、关键代码与注意点。

## 1. 功能目标

- 在 RN（Expo）中打开选点页（`app/amap-picker.tsx`），使用 `react-native-webview` 承载本地 H5（`assets/amap-picker.html`）。
- 支持：
  - 搜索地点
  - 输入联想下拉（名称 + 地址）
  - 点击地图选点
  - 逆地理解析中文地址
  - 地址解析完成后才允许“确认选择”
  - 将经纬度 + 中文地址回传给 RN，并持久化用于打卡地理围栏

## 2. 关键依赖

### 2.1 RN / Expo 侧

- `react-native-webview`
  - 承载 H5 地图页面
  - 通过 `postMessage` 与 H5 通信
- `expo-router`
  - 选点成功后返回上一页（`router.back()`）
- `@react-native-async-storage/async-storage`
  - 持久化用户自定义围栏中心点/地址/半径
- `expo-location`
  - 打卡页启用 geofencing 时，使用用户配置覆盖默认围栏
- `react-native-safe-area-context`
  - RN 容器页使用安全区；H5 页底部也通过 CSS safe-area 预留空间

### 2.2 H5（高德 Web JS API）侧

- `https://webapi.amap.com/loader.js`
- `AMapLoader.load({ key, version: '2.0', plugins: [...] })`
- 使用插件：
  - `AMap.PlaceSearch`：地点搜索 + 联想点击后的兜底定位
  - `AMap.AutoComplete`：输入联想
  - `AMap.Geocoder`：逆地理解析中文地址
  - `AMap.ToolBar`：地图工具条（可选）

## 3. 关键配置（环境变量）

### 3.1 必须

- `EXPO_PUBLIC_AMAP_WEB_KEY`
  - **必须是 Web 服务**的 Key（JS API Key），不要使用 Android/iOS 原生 Key。

### 3.2 可选（但常见需要）

- `EXPO_PUBLIC_AMAP_SECURITY_JS_CODE`
  - 高德安全密钥（securityJsCode）。
  - 必须在加载任何高德脚本前注入：`window._AMapSecurityConfig = { securityJsCode }`。

## 4. 文件结构与职责

- `app/amap-picker.tsx`
  - RN WebView 容器
  - 读取本地 `assets/amap-picker.html`
  - 注入 `key/securityJsCode/初始经纬度`
  - 监听 H5 回传：`select/error/toast`
  - 选点成功后保存到本地存储并返回

- `assets/amap-picker.html`
  - 地图展示、联想下拉、搜索、选点、逆地理、确认回传

- `utils/geofence-storage.ts`
  - `loadUserGeofenceConfig()` / `saveUserGeofenceConfig()`
  - 存储结构包含 `longitude/latitude/address/radius` 等

- `app/(tabs)/punchIn.tsx`
  - 开启地理围栏时优先使用用户配置覆盖默认 `PUNCH_GEOFENCE_REGIONS`

## 5. 关键代码（RN 容器）

### 5.1 注入 HTML（Key/安全码/初始经纬度）

位置：`app/amap-picker.tsx` 的 `injectAmapHtml(...)`

关键点：
- 通过字符串替换，把模板占位符替换为真实值
- 模板中占位符：
  - `var key = '__AMAP_KEY__';`
  - `var securityJsCode = '__AMAP_SECURITY_JS_CODE__';`
  - `__INIT_LNG__` / `__INIT_LAT__`

### 5.2 WebView 的 baseUrl

位置：`app/amap-picker.tsx` 的 `WebView` 组件

关键点：
- 设置 `baseUrl`，避免 H5 内部依赖资源在 WebView 中解析异常。

示例：
```tsx
source={{ html, baseUrl: 'https://webapi.amap.com/' }}
```

### 5.3 H5 -> RN 通信协议（消息类型）

RN 侧约定的消息结构（`PickerMessage`）：
- `select`：
  - `payload: { longitude: number; latitude: number; address: string | null }`
- `error`：
  - `payload: { message: string; source?: string; line?: number; column?: number }`
- `toast`：
  - `payload: { message: string }`
  - RN 侧当前忽略（仅用于 H5 内部轻提示）

### 5.4 选点回传与持久化

位置：`app/amap-picker.tsx` 的 `onMessage`

逻辑要点：
- 收到 `select`：
  - 校验经纬度为有限数
  - 读取现有配置的 `radius`（避免用户半径被覆盖）
  - `saveUserGeofenceConfig({ longitude, latitude, address, radius })`
  - `router.back()` 返回

## 6. 关键代码（H5 模板）

### 6.1 基础错误上报（保留 message + source/line/column）

位置：`assets/amap-picker.html`

```js
window.onerror = function (message, source, lineno, colno, error) {
  var errMsg = error && error.message ? error.message : message;
  sendToRN('error', {
    message: 'H5 运行异常：' + String(errMsg),
    source: String(source || ''),
    line: lineno,
    column: colno,
  });
};
```

### 6.2 securityJsCode 注入时机（非常关键）

必须在加载 `loader.js` 前执行：

```js
if (securityJsCode && securityJsCode !== '__AMAP_SECURITY_JS_CODE__') {
  window._AMapSecurityConfig = { securityJsCode: String(securityJsCode) };
}
```

### 6.3 Loader 加载与初始化 AMap

```js
var script = document.createElement('script');
script.src = 'https://webapi.amap.com/loader.js';
script.onload = function () {
  window.AMapLoader.load({
    key: String(key),
    version: '2.0',
    plugins: ['AMap.PlaceSearch', 'AMap.Geocoder', 'AMap.ToolBar', 'AMap.AutoComplete'],
  })
    .then(function () {
      start();
    })
    .catch(function (err) {
      sendToRN('error', {
        message: '高德初始化失败：' + String(err && err.message ? err.message : err),
      });
    });
};
script.onerror = function () {
  sendToRN('error', { message: '加载高德 loader.js 失败，请检查网络/Key/域名限制' });
};
document.head.appendChild(script);
```

### 6.4 选点 + 地址解析 + 确认按钮 gating

关键交互约束：
- 点击地图或从联想/搜索定位后，都走 `setSelectedByLngLat(lng, lat)`
- `setSelectedByLngLat` 内会调用 `Geocoder.getAddress`，**地址解析完成后**才允许“确认选择”按钮点击

（实现细节以 `assets/amap-picker.html` 当前代码为准）

### 6.5 输入联想下拉（AutoComplete + PlaceSearch 兜底）

- 输入框 `input` 事件做 debounce（250ms）
- `AutoComplete.search` 返回 tips，最多展示 20 条
- 点击候选：
  - 有 `location`：直接定位并选点
  - 无 `location`：用 `PlaceSearch.search` 兜底到第一个 POI 定位并选点

## 7. 注意点（常见坑）

### 7.1 Key 类型必须正确

- WebView 中使用的是 **Web JS API Key**。
- 如果误用 Android/iOS Key，可能导致：
  - 地图白屏
  - 报错 `USERKEY_PLAT_NOMATCH` 或只看到笼统的 `Script error`

### 7.2 securityJsCode 注入必须早于脚本加载

- `window._AMapSecurityConfig` 设置晚了，会导致鉴权失败但很难定位。

### 7.3 WebView 的 `baseUrl` 建议固定

- 不设置 `baseUrl` 时，部分资源/相对路径解析可能异常，表现为 loader 加载失败或白屏。

### 7.4 本地 HTML 修改后的缓存问题

- 修改 `assets/amap-picker.html` 后建议执行：
  - 停掉 Expo
  - `npm run start:clear`
  - 重新进入选点页

### 7.5 UI 与安全区

- H5 页底部栏使用 `padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px))`，避免被系统导航栏遮挡。

---

## 8. 当前实现完成度

- 已支持：联想下拉、搜索、点击选点、中文地址解析、确认 gating、回传与持久化、打卡页启用围栏优先使用用户配置。
