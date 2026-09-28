import { useState } from 'react'
import { signInWithPassword, signUpWithPassword } from '../lib/auth'
import { supabaseConfigured } from '../lib/supabase'

interface Props {
  onSignedIn: () => void
  onStayLocal: () => void
  onDemo: () => void
}

type Tab = 'login' | 'register'

const inputCls =
  'w-full rounded-ctl border border-line bg-white px-4 py-3.5 text-base outline-none transition-colors placeholder:text-mut/60 focus:border-brand'

/**
 * 登录页：邮箱 + 密码（注册时密码输两次）。
 * 登录是可选的 —— 不登录也能在本机正常使用，登录后数据上云、多设备同步。
 */
export default function AuthPage({ onSignedIn, onStayLocal, onDemo }: Props) {
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const pwOk = pw.length >= 6
  const pw2Ok = pw2.length > 0 && pw2 === pw
  const canSubmit = emailOk && pwOk && (tab === 'login' || pw2Ok) && !busy && supabaseConfigured

  /** 按钮不可点时要说清楚还差什么，不然用户只会以为按钮坏了 */
  const blocker = !supabaseConfigured
    ? '当前没有配置 Supabase，无法登录'
    : !emailOk
      ? '还差一步：填写正确的邮箱（要有 @ 和域名，如 93418328@qq.com）'
      : !pwOk
        ? '还差一步：密码至少 6 位'
        : tab === 'register' && !pw2Ok
          ? '还差一步：两次输入的密码要完全一样'
          : null

  const switchTab = (t: Tab) => {
    setTab(t)
    setErr('')
  }

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setErr('')
    try {
      if (tab === 'register') await signUpWithPassword(email, pw)
      else await signInWithPassword(email, pw)
      onSignedIn()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onEnter = (e: React.KeyboardEvent) => e.key === 'Enter' && submit()

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="card relative overflow-hidden p-6">
        {/* 装饰吉祥物，不参与点击 */}
        <img
          src="/ui/mascot-books.webp"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-3 -top-4 h-28 select-none"
        />

        <div className="flex items-center gap-2.5">
          <img src="/ui/brand-medal.webp" alt="" aria-hidden className="h-9 w-9 object-contain" />
          <div>
            <h2 className="text-xl font-extrabold">登录同步</h2>
            <p className="text-xs text-mut">登录后可在平板、手机、电脑之间同步积分</p>
          </div>
        </div>

        <div className="mt-4 rounded-ctl bg-brand-soft px-4 py-3 text-sm leading-6 text-ink/80">
          <b className="text-brand">登录是可选的。</b>
          不登录也能正常打分，数据只存在这台设备上；登录后才会在多设备之间同步。
          一个家庭共用一个邮箱 + 密码即可。
        </div>

        {!supabaseConfigured && (
          <div className="mt-3 rounded-ctl bg-peach px-4 py-3 text-sm text-golddeep">
            当前没有配置 Supabase，无法登录。可以先用本机模式或演示数据。
          </div>
        )}

        {/* 登录 / 注册 切换 */}
        <div className="mt-5 flex rounded-ctl bg-canvas p-1">
          {(
            [
              ['login', '登录'],
              ['register', '注册（第一次用）'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`tap flex min-h-[44px] flex-1 items-center justify-center rounded-[10px] text-sm font-bold transition-colors ${
                tab === key ? 'bg-white text-brand shadow-card' : 'text-mut'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-bold">邮箱</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onEnter}
              placeholder="you@example.com"
              className={`${inputCls} ${email.length > 0 && !emailOk ? 'border-pos' : ''}`}
            />
            {email.length > 0 && !emailOk && (
              <p className="mt-1.5 text-xs text-posdeep">邮箱格式不对，检查一下有没有漏 @ 或域名</p>
            )}

          <label className="mb-1.5 mt-3 block text-sm font-bold">密码</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={onEnter}
              placeholder="至少 6 位"
              className={`${inputCls} pr-16`}
            />
            <button
              onClick={() => setShowPw((v) => !v)}
              className="tap absolute right-1 top-1/2 min-h-[40px] -translate-y-1/2 rounded-ctl px-3 text-sm font-medium text-mut"
            >
              {showPw ? '隐藏' : '显示'}
            </button>
          </div>
          {pw.length > 0 && !pwOk && (
            <p className="mt-1.5 text-xs text-posdeep">密码至少 6 位</p>
          )}

          {tab === 'register' && (
            <>
              <label className="mb-1.5 mt-3 block text-sm font-bold">再输入一次密码</label>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                onKeyDown={onEnter}
                placeholder="和密码保持一致"
                className={`${inputCls} ${
                  pw2.length > 0 ? (pw2Ok ? 'border-neg' : 'border-pos') : ''
                }`}
              />
              {pw2.length > 0 && (
                <p className={`mt-1.5 text-xs ${pw2Ok ? 'text-negdeep' : 'text-posdeep'}`}>
                  {pw2Ok ? '两次一致 ✓' : '两次输入的密码不一样'}
                </p>
              )}
            </>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit}
            title={blocker ?? undefined}
            className="btn-primary mt-4 flex min-h-[52px] w-full items-center justify-center text-base disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? '处理中…' : tab === 'register' ? '注册并登录' : '登录并同步'}
          </button>

          {blocker && !busy && (
            <p className="mt-2 rounded-ctl bg-canvas px-3 py-2 text-center text-xs leading-5 text-mut">
              {blocker}
            </p>
          )}

          <p className="mt-2 text-center text-xs text-mut">
            {tab === 'register' ? (
              <>
                已经注册过？
                <button onClick={() => switchTab('login')} className="tap px-1 font-medium text-brand">
                  去登录
                </button>
              </>
            ) : (
              <>
                第一次用？
                <button
                  onClick={() => switchTab('register')}
                  className="tap px-1 font-medium text-brand"
                >
                  去注册
                </button>
                （要填两次密码）
              </>
            )}
          </p>

          {err && (
            <div className="mt-3 rounded-ctl bg-rosy px-4 py-3 text-sm leading-6 text-posdeep">
              ⚠️ {err}
            </div>
          )}
        </div>

        <div className="my-5 border-t border-dashed border-line" />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onStayLocal}
            className="tap flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-ctl border border-line bg-white px-4 font-medium text-ink hover:border-brand/40"
          >
            📱 不登录，只用这台设备
          </button>
          <button
            onClick={onDemo}
            className="tap flex min-h-[48px] items-center justify-center gap-2 rounded-ctl bg-peach px-4 font-medium text-golddeep"
          >
            🎈 先看看演示数据
          </button>
        </div>
      </div>
    </div>
  )
}
