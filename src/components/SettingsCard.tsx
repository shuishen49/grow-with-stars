import { useEffect, useState } from 'react'
import {
  checkBiometry,
  forceVerify,
  isParentLockOn,
  isNativeApp,
  setParentLock,
  type BiometryStatus,
} from '../lib/parentLock'
import { APP_VERSION, hotUpdateSupported } from '../lib/hotUpdate'

interface Props {
  onToast: (text: string) => void
  onCheckUpdate: () => void
  checking: boolean
}

/**
 * 设置卡片：家长锁 + 版本更新。
 * 家长锁默认是关的，要家长手动打开；开关本身也要过一次验证才能动。
 */
export default function SettingsCard({ onToast, onCheckUpdate, checking }: Props) {
  const [lockOn, setLockOn] = useState(isParentLockOn())
  const [status, setStatus] = useState<BiometryStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    checkBiometry().then(setStatus)
  }, [])

  const native = isNativeApp()

  const handleToggle = async () => {
    const want = !lockOn
    if (busy) return
    if (want && status && !status.ok) {
      onToast(status.detail || '这台设备没法做验证，开不了家长锁')
      return
    }
    setBusy(true)
    const r = await forceVerify(want ? '开启家长锁' : '关闭家长锁')
    setBusy(false)
    if (!r.ok) {
      onToast(r.msg ?? '验证失败，没有改动')
      return
    }
    setParentLock(want)
    setLockOn(want)
    onToast(want ? '家长锁已开启：以后改分数、兑换都要先验证' : '家长锁已关闭')
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <span aria-hidden className="text-2xl">
          🔒
        </span>
        <div className="flex-1">
          <div className="text-lg font-bold">家长锁</div>
          <div className="text-xs text-mut">改动分数、兑换前先验证家长身份</div>
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="rounded-ctl bg-canvas px-4 py-3 text-xs leading-6 text-mut">
          <b className="text-ink">会不会存我的指纹/人脸？</b>不会。指纹、人脸只存在平板的安全芯片里，
          系统只会告诉应用「通过」或「没通过」，<b className="text-ink">图像本身任何应用都拿不到</b>
          。本应用只保存了一个「开 / 关」状态，本地和云端都不存生物特征。
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            role="switch"
            aria-checked={lockOn}
            aria-label="家长锁"
            onClick={handleToggle}
            disabled={busy}
            className={`tap relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              lockOn ? 'bg-brand' : 'bg-line'
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-card transition-all ${
                lockOn ? 'left-7' : 'left-1'
              }`}
            />
          </button>
          <div className="min-w-0 flex-1">
            <div className={`text-sm font-bold ${lockOn ? 'text-brand' : 'text-mut'}`}>
              {busy ? '验证中…' : lockOn ? '已开启' : '已关闭（默认）'}
            </div>
            <div className="text-xs text-mut">
              {status ? `设备支持：${status.label}` : '正在检测设备…'}
            </div>
          </div>
        </div>

        {status && !status.ok && (
          <p className="mt-2 rounded-ctl bg-peach px-3.5 py-2 text-xs leading-6 text-golddeep">
            ⚠️ {status.detail}
          </p>
        )}
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-bold">版本与更新</div>
            <div className="mt-0.5 text-xs text-mut">
              当前 {APP_VERSION}
              {!native && '（网页版不支持热更新）'}
            </div>
          </div>
          <button
            onClick={onCheckUpdate}
            disabled={checking || !native}
            className="tap flex min-h-[44px] items-center gap-1.5 rounded-ctl bg-brand-soft px-4 text-sm font-bold text-brand hover:bg-brand/10 disabled:opacity-40"
          >
            <span aria-hidden className={checking ? 'animate-spin' : ''}>
              ⟳
            </span>
            {checking ? '检查中…' : '检查更新'}
          </button>
        </div>
        {native && (
          <p className="mt-2 text-xs leading-6 text-mut">
            有新版本时，会先把「改了什么」列出来给你看，确认后才下载，不用重装 App。
          </p>
        )}
      </div>
    </section>
  )
}

export { hotUpdateSupported }
