import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'

/**
 * 热更新：界面/逻辑改了之后，不用重新下载安装 APK，App 自己下载一份新的网页包换上。
 *
 * 流程：GitHub Actions 每次构建都会把网页包打成 zip，连同一份 hot-update.json
 * （版本号 + 更新内容 + 下载地址）一起发到 Releases。App 启动或手动点「检查更新」
 * 时去比对版本号，有新的就先把更新内容显示出来，家长确认后才下载。
 *
 * 安全性：更新包只会影响界面和逻辑，动不了原生部分；
 * 新包要是启动后 10 秒内没「报平安」，插件会自动回滚到上一个能用的版本。
 */
const MANIFEST_URL =
  'https://github.com/shuishen49/grow-with-stars/releases/latest/download/hot-update.json'

export interface HotUpdateInfo {
  version: string
  url: string
  notes: string[]
  publishedAt: string
}

/** 打包时由 GitHub Actions 注入，形如 20260928-1a2b3c4 */
export const APP_VERSION: string =
  ((import.meta.env as unknown as Record<string, string | undefined>).VITE_BUILD_ID as string) ||
  'dev'

export const hotUpdateSupported: boolean = Capacitor.isNativePlatform()

/** 告诉插件「这个版本跑起来了」，否则计时一到会自动回滚 */
export async function markBundleReady(): Promise<void> {
  if (!hotUpdateSupported) return
  try {
    await CapacitorUpdater.notifyAppReady()
  } catch {
    // 报平安失败不影响正常使用，静默吞掉
  }
}

export async function fetchUpdateInfo(): Promise<HotUpdateInfo | null> {
  try {
    const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const j = (await res.json()) as Partial<HotUpdateInfo>
    if (!j.version || !j.url) return null
    return {
      version: j.version,
      url: j.url,
      notes: Array.isArray(j.notes) ? j.notes : [],
      publishedAt: j.publishedAt ?? '',
    }
  } catch {
    return null
  }
}

/** 返回可用的新版本；没有就返回 null */
export async function checkForUpdate(): Promise<HotUpdateInfo | null> {
  const info = await fetchUpdateInfo()
  if (!info) return null
  // 版本号和当前包一致说明已经是最新的（刚装的 APK 或刚更完的热更新包）
  if (info.version === APP_VERSION) return null
  return info
}

const NOTES_KEY = 'tp_update_notes'

/** 记录更新内容，重启后弹一次「本次更新」 */
function stashNotes(info: HotUpdateInfo) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(info))
  } catch {
    /* 存不下就算了 */
  }
}

/** 启动后取一次更新内容（只弹一次） */
export function takePendingNotes(): HotUpdateInfo | null {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (!raw) return null
    localStorage.removeItem(NOTES_KEY)
    const info = JSON.parse(raw) as HotUpdateInfo
    // 只有确确实实跑在这个版本上才展示，避免版本对不上时乱弹
    return info.version === APP_VERSION ? info : null
  } catch {
    return null
  }
}

/**
 * 下载并应用更新。注意：这一步结束后 App 会立刻重启，
 * 所以调用方不能指望它后面的代码还会执行。
 */
export async function applyHotUpdate(info: HotUpdateInfo): Promise<void> {
  const bundle = await CapacitorUpdater.download({ url: info.url, version: info.version })
  stashNotes(info)
  await CapacitorUpdater.set({ id: bundle.id })
}
