import { useState } from 'react'
import Modal from './Modal'
import { APP_VERSION, hotUpdateSupported } from '../lib/hotUpdate'
import type { SourceMode } from '../lib/store'

interface Props {
  open: boolean
  onClose: () => void
  mode: SourceMode
  email?: string
  checking: boolean
  onCheckUpdate: () => void
}

const MODE_TEXT: Record<SourceMode, string> = {
  cloud: '云端同步（登录后多设备共享）',
  local: '仅保存在这台设备上',
  demo: '演示数据（可随时清除）',
}

/** 把打包号 20260928-b76187b 拆成人能读的「2026-09-28 / b76187b」 */
function parseVersion(v: string): { date: string; build: string; dev: boolean } {
  if (/^\d{8}-/.test(v)) {
    const [d, b] = v.split('-', 2)
    return {
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      build: b || v,
      dev: false,
    }
  }
  return { date: '本地开发版', build: v, dev: true }
}

/** 「关于」弹窗：版本信息 + 开发者联系方式 + 检查更新 */
export default function AboutModal({ open, onClose, mode, email, checking, onCheckUpdate }: Props) {
  const [copied, setCopied] = useState('')
  if (!open) return null
  const { date, build } = parseVersion(APP_VERSION)

  /** 点一下 QQ 号就复制走，省得还得拿笔抄 */
  const copyQQ = async () => {
    try {
      await navigator.clipboard.writeText('93418328')
      setCopied('已复制 QQ 号')
    } catch {
      setCopied('复制失败，请手动记下 93418328')
    }
    setTimeout(() => setCopied(''), 2500)
  }

  return (
    <Modal open onClose={onClose} title="关于家庭积分本">
      <div className="flex items-center gap-3 rounded-ctl bg-brand-soft px-4 py-3.5">
        <img src="/ui/brand-medal.webp" alt="" aria-hidden className="h-11 w-11 object-contain" />
        <div className="min-w-0">
          <div className="text-base font-extrabold text-ink">家庭积分本</div>
          <div className="mt-0.5 text-xs text-mut">
            版本 {APP_VERSION}
            {!hotUpdateSupported && '（网页版）'}
          </div>
        </div>
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-3 rounded-ctl bg-canvas px-4 py-2.5">
          <dt className="shrink-0 text-mut">构建日期</dt>
          <dd className="text-right font-medium text-ink">{date}</dd>
        </div>
        <div className="flex justify-between gap-3 rounded-ctl bg-canvas px-4 py-2.5">
          <dt className="shrink-0 text-mut">构建号</dt>
          <dd className="break-all text-right font-medium tabular-nums text-ink">{build}</dd>
        </div>
        <div className="flex justify-between gap-3 rounded-ctl bg-canvas px-4 py-2.5">
          <dt className="shrink-0 text-mut">数据存放</dt>
          <dd className="text-right font-medium text-ink">{MODE_TEXT[mode]}</dd>
        </div>
        {email && (
          <div className="flex justify-between gap-3 rounded-ctl bg-canvas px-4 py-2.5">
            <dt className="shrink-0 text-mut">当前账号</dt>
            <dd className="truncate text-right font-medium text-ink">{email}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 rounded-card border border-gold/40 bg-peach px-4 py-3">
        <div className="text-sm font-extrabold text-golddeep">开发者</div>
        <div className="mt-1 text-sm leading-6 text-ink">
          个人开发者 · <b>小鑫学渣</b>
        </div>
        <button onClick={copyQQ} className="tap flex items-baseline gap-1.5 text-sm leading-6 text-ink">
          <span>QQ：93418328</span>
          <span aria-hidden className="text-xs">
            📋
          </span>
        </button>
        <div className="h-1 text-xs text-brand">{copied}</div>
        <div className="mt-1 text-xs leading-6 text-mut">
          一个人做的小工具，不采集任何个人信息，也没有广告。遇到问题随时 QQ 找我。
        </div>
      </div>

      <button
        onClick={onCheckUpdate}
        disabled={checking || !hotUpdateSupported}
        className="tap mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-ctl bg-brand-soft text-base font-bold text-brand disabled:opacity-40"
      >
        <span aria-hidden className={checking ? 'animate-spin' : ''}>
          ⟳
        </span>
        {checking ? '检查中…' : '检查更新'}
      </button>
      <p className="mt-1.5 text-center text-xs leading-5 text-mut">
        {hotUpdateSupported
          ? '有新版本时会先把「改了什么」列出来，你确认后才下载，不用重装 App。'
          : '网页版不支持热更新，请重新下载安装。'}
      </p>

      <div className="mt-4 rounded-ctl bg-canvas px-4 py-3 text-xs leading-6 text-mut">
        <b className="text-ink">关于隐私</b>：不登录也能用，数据只留在这台设备上；登录后存在你自己的
        云端账号里，别人看不到。家长锁用的指纹、人脸只在设备安全芯片里比对，<b className="text-ink">任何地方都不存储</b>。
      </div>
    </Modal>
  )
}
