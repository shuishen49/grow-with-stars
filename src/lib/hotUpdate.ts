import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'

/**
 * 热更新：界面/逻辑改了之后，不用重新下载安装 APK，App 自己下载一份新的网页包换上。
 *
 * 流程：GitHub Actions 每次构建都会把网页包打成 zip，连同一份 hot-update.json
 * （版本号 + 更新内容 + 下载地址）一起发布。App 启动或手动点「检查更新」时比对
 * 版本号，有新的就先把更新内容显示出来，家长确认后才下载。
 *
 * 安全性：更新包只会影响界面和逻辑，动不了原生部分；
 * 新包要是启动后 15 秒内没「报平安」，插件会自动回滚到上一个能用的版本。
 *
 * ⚠️ 更新包放两个地方，按顺序试（2026-09-28 在 App 内实测的结论）：
 * ① 仓库 hot 分支（raw.githubusercontent.com）—— Releases 附件走
 *    objects.githubusercontent.com，实测国内网络直接「Failed to fetch」；
 *    而 raw、api.github.com 反而是通的，jsDelivr 反而超时。
 * ② GitHub Releases 附件 —— 有代理的网络走这个没问题。
 * 清单也一样两条路，全失败就明确报「连不上」，绝不假装「已是最新」。
 */
const RAW_MANIFEST =
  'https://raw.githubusercontent.com/shuishen49/grow-with-stars/hot/hot-update.json'
// ⚠️ releases/latest/download 不能用：GitHub 的 latest 只认非 prerelease，
// 而我们的滚动包是 prerelease，用它会 404（踩过）。
const RELEASE_MANIFEST =
  'https://github.com/shuishen49/grow-with-stars/releases/download/latest/hot-update.json'

export interface HotUpdateInfo {
  version: string
  url: string
  /** 备用下载地址，按顺序试；没有就只用 url */
  urls?: string[]
  notes: string[]
  publishedAt: string
  /** 更新包字节数，只用来告诉用户「要下多大」，没有也不影响更新 */
  size?: number
}

/** 2.8 MB 这种写法，给用户看的下载体量 */
export function humanSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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

/**
 * 清单取不到真的是会发生的：国内网络访问 GitHub 时快时慢，
 * 2026-09-28 实测同一个 wifi 下 raw 有时 0.5 秒、有时 9 秒都拿不到，
 * 更新包本体（约 2.8 MB）更是要十几秒。所以超时放到 15 秒，
 * 并且每个源失败后再试一次 —— 一次抖动就把用户判成「连不上」太冤了。
 */
const MANIFEST_TIMEOUT_MS = 15000
const MANIFEST_RETRY = 2

/** 把多次失败的原因合成一句人话；同样的报错只说一遍 */
function joinErrors(errs: string[]): string {
  const seen = new Set<string>()
  const uniq = errs.filter((e) => {
    const k = e.trim()
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })
  const shown = uniq.slice(0, 2).join('；')
  return uniq.length > 0 ? shown : '未知原因'
}

async function fetchOneManifest(url: string): Promise<HotUpdateInfo> {
  let lastErr: unknown = null
  for (let attempt = 1; attempt <= MANIFEST_RETRY; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), MANIFEST_TIMEOUT_MS)
    try {
      // ?t= 用来绕过 CDN 对同一 URL 的缓存，保证拿到的是最新清单
      const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
        cache: 'no-store',
        signal: ctrl.signal,
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const j = (await res.json()) as Partial<HotUpdateInfo>
      if (!j.version || !j.url) throw new Error('清单内容不完整')
      return {
        version: j.version,
        url: j.url,
        urls: Array.isArray(j.urls) ? (j.urls as string[]) : undefined,
        notes: Array.isArray(j.notes) ? j.notes : [],
        publishedAt: j.publishedAt ?? '',
        size: typeof j.size === 'number' ? j.size : undefined,
      }
    } catch (e) {
      lastErr = e
      // 第一次失败多半是网络抖一下，隔一秒再试一次
      if (attempt < MANIFEST_RETRY) await new Promise((r) => setTimeout(r, 1000))
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

/** 挨个源试清单；全都失败就抛错，让界面提示「连不上」而不是误报「已是最新」 */
export async function fetchUpdateInfo(): Promise<HotUpdateInfo> {
  const errs: string[] = []
  for (const url of [RAW_MANIFEST, RELEASE_MANIFEST]) {
    try {
      return await fetchOneManifest(url)
    } catch (e) {
      errs.push(e instanceof Error ? e.message : String(e))
    }
  }
  throw new Error('更新服务器连不上（' + joinErrors(errs) + '）')
}

/** 返回可用的新版本；没有就返回 null。清单取不到会抛错（网络问题） */
export async function checkForUpdate(): Promise<HotUpdateInfo | null> {
  const info = await fetchUpdateInfo()
  // 版本号和当前包一致说明已经是最新的（刚装的 APK 或刚更完的热更新包）
  if (info.version === APP_VERSION) return null
  return info
}

/** 去重后的候选下载地址，按顺序试 */
function bundleUrls(info: HotUpdateInfo): string[] {
  const seen = new Set<string>()
  return [...(info.urls ?? []), info.url].filter((u) => {
    if (!u || seen.has(u)) return false
    seen.add(u)
    return true
  })
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
 * 一个源下载失败会自动换下一个。
 */
export async function applyHotUpdate(info: HotUpdateInfo): Promise<void> {
  let lastErr: unknown = null
  for (const url of bundleUrls(info)) {
    try {
      const bundle = await CapacitorUpdater.download({ url, version: info.version })
      stashNotes(info)
      await CapacitorUpdater.set({ id: bundle.id })
      return
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr ?? '所有下载地址都失败了'))
}
