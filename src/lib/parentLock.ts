import { Capacitor } from '@capacitor/core'
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth'

/**
 * 家长锁：开启后，「改分数 / 兑换 / 撤销」都要先过一次指纹或人脸。
 *
 * ⚠️ 关于隐私（很多人会担心的一点）：
 * 这里用的是安卓系统的 BiometricPrompt / iOS 的 LocalAuthentication，
 * 指纹、人脸这些生物特征**只存在设备的安全芯片里，系统从不把图像给应用**。
 * 应用能拿到的只有一个结果：「通过」或「没通过」。
 * 所以本应用**不会、也没有能力**保存任何指纹/人脸数据，本地和云端都没有。
 * 我们本地只存了一个开关状态（开 / 关），就这一个布尔值。
 */
const KEY = 'tp_parent_lock'

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export function isParentLockOn(): boolean {
  return localStorage.getItem(KEY) === '1'
}

export function setParentLock(on: boolean): void {
  localStorage.setItem(KEY, on ? '1' : '0')
}

const TYPE_LABEL: Partial<Record<BiometryType, string>> = {
  [BiometryType.fingerprintAuthentication]: '指纹',
  [BiometryType.faceAuthentication]: '人脸',
  [BiometryType.irisAuthentication]: '虹膜',
  [BiometryType.touchId]: '指纹（Touch ID）',
  [BiometryType.faceId]: '人脸（Face ID）',
}

const ERR_MSG: Record<string, string> = {
  biometryNotAvailable: '这台设备不支持指纹/人脸验证',
  biometryNotEnrolled: '设备里还没录入指纹或人脸，先去系统设置里录入',
  noDeviceCredential: '设备没设锁屏密码，没法验证',
  passcodeNotSet: '设备没设锁屏密码，没法验证',
  authenticationFailed: '验证没通过，再试一次',
  biometryLockout: '失败次数太多被暂时锁住，等一会儿再试',
  userCancel: '已取消验证',
  systemCancel: '已取消验证',
  appCancel: '已取消验证',
  userFallback: '已取消验证',
}

export interface BiometryStatus {
  /** 能不能用（生物识别可用，或至少有锁屏密码） */
  ok: boolean
  /** 「指纹」「人脸」这类显示名 */
  label: string
  detail: string
}

export async function checkBiometry(): Promise<BiometryStatus> {
  if (!isNativeApp()) {
    return { ok: false, label: '网页版', detail: '指纹/人脸验证只在安装到平板后的 App 里可用。' }
  }
  try {
    const r = await BiometricAuth.checkBiometry()
    const label = TYPE_LABEL[r.biometryType] ?? (r.deviceIsSecure ? '锁屏密码' : '不可用')
    if (r.isAvailable) {
      return { ok: true, label, detail: `已录入${label}，可以直接用。` }
    }
    if (r.deviceIsSecure) {
      return { ok: true, label: '锁屏密码', detail: '没录入生物特征，但可以用锁屏密码代替。' }
    }
    return { ok: false, label, detail: r.reason || '这台设备既没录入生物特征也没设锁屏密码。' }
  } catch (e) {
    return { ok: false, label: '不可用', detail: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * 不管开关状态，直接弹一次验证。
 * 用在「开启/关闭家长锁」这种必须家长本人操作的场合 ——
 * 关锁也要验证，否则孩子自己就能把锁关掉。
 */
export async function forceVerify(action: string): Promise<{ ok: boolean; msg?: string }> {
  if (!isNativeApp()) return { ok: true, msg: '网页版不做验证' }

  try {
    await BiometricAuth.authenticate({
      reason: `${action}需要家长确认`,
      androidTitle: '家长验证',
      androidSubtitle: action,
      cancelTitle: '取消',
      // 没录指纹的平板也能用锁屏密码顶上
      allowDeviceCredential: true,
    })
    return { ok: true }
  } catch (e) {
    const code = (e as { code?: string })?.code ?? ''
    return { ok: false, msg: ERR_MSG[code] ?? (e instanceof Error ? e.message : '验证失败') }
  }
}

/**
 * 做一件会改数据的操作前，先让家长验证一次。
 * 没开家长锁时直接放行，不打扰日常使用。
 */
export async function requireParent(action: string): Promise<{ ok: boolean; msg?: string }> {
  if (!isParentLockOn()) return { ok: true }
  return forceVerify(action)
}
