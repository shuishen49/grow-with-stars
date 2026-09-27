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
}

export default config
