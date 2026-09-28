import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.shuishen49.growwithstars',
  appName: '家庭积分本',
  webDir: 'dist',
  loggingBehavior: 'none',
  android: {
    // 平板横屏会用到更宽的布局
    allowMixedContent: false,
    captureInputZoom: false,
  },
  plugins: {
    // 热更新：只在我们自己的页面里手动检查、手动下载，
    // 关掉插件自带的自动更新和统计上报（不往第三方服务器发任何东西）。
    CapacitorUpdater: {
      autoUpdate: 'off',
      statsUrl: '',
      // 新包启动 15 秒内没「报平安」就自动回滚到上一个能用的版本
      appReadyTimeout: 15000,
      autoDeleteFailed: true,
      autoDeletePrevious: true,
    },
  },
}

export default config
