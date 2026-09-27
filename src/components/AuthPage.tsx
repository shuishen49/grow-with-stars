import { useState } from 'react'
import { sendEmailCode, verifyEmailCode } from '../lib/auth'
import { supabaseConfigured } from '../lib/supabase'

interface Props {
  onSignedIn: () => void
  onStayLocal: () => void
  onDemo: () => void
}

/**
 * 登录页：邮箱 + 6 位数字验证码
 * 登录是可选的 —— 不登录也能在本机正常使用，登录后数据上云、多设备同步。
 */
export default function AuthPage({ onSignedIn, onStayLocal, onDemo }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const send = async () => {
    if (!emailOk || busy) return
    setBusy(true)
    setErr('')
    try {
      await sendEmailCode(email)
      setSent(true)
      setStep('code')
      setCode('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (code.trim().length !== 6 || busy) return
    setBusy(true)
    setErr('')
    try {
      await verifyEmailCode(email, code)
      onSignedIn()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="card relative overflow-hidden p-6">
        {/* 装饰吉祥物，不参与点击 */}
        <img
          src="/ui/mascot-books.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-3 -top-4 h-28 select-none"
        />

        <div className="flex items-center gap-2.5">
          <img src="/ui/brand-medal.png" alt="" aria-hidden className="h-9 w-9 object-contain" />
          <div>
            <h2 className="text-xl font-extrabold">登录同步</h2>
            <p className="text-xs text-mut">登录后可在平板、手机、电脑之间同步积分</p>
          </div>
        </div>

        <div className="mt-4 rounded-ctl bg-brand-soft px-4 py-3 text-sm leading-6 text-ink/80">
          <b className="text-brand">登录是可选的。</b>
          不登录也能正常打分，数据只存在这台设备上；登录后才会在多设备之间同步。
        </div>

        {!supabaseConfigured && (
          <div className="mt-3 rounded-ctl bg-peach px-4 py-3 text-sm text-golddeep">
            当前没有配置 Supabase，无法登录。可以先用本机模式或演示数据。
          </div>
        )}

        <div className="mt-5">
          {step === 'email' ? (
            <>
              <label className="mb-1.5 block text-sm font-bold">邮箱</label>
              <input
                type="email"
                autoFocus
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="you@example.com"
                className="w-full rounded-ctl border border-line bg-white px-4 py-3.5 text-base outline-none transition-colors placeholder:text-mut/60 focus:border-brand"
              />
              <p className="mt-1.5 text-xs text-mut">
                没有账号也能直接用，输邮箱发验证码即自动创建（一个家庭共用一个邮箱即可）。
              </p>
              <button
                onClick={send}
                disabled={!emailOk || busy || !supabaseConfigured}
                className="btn-primary mt-4 flex min-h-[52px] w-full items-center justify-center text-base disabled:opacity-40"
              >
                {busy ? '发送中…' : '发送 6 位验证码'}
              </button>
            </>
          ) : (
            <>
              <label className="mb-1.5 block text-sm font-bold">6 位数字验证码</label>
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && verify()}
                placeholder="000000"
                aria-label="6 位数字验证码"
                className="w-full rounded-ctl border border-line bg-white px-4 py-3.5 text-center text-2xl font-extrabold tracking-[0.4em] tabular-nums outline-none transition-colors focus:border-brand"
              />
              <div className="mt-1.5 flex items-center justify-between text-xs text-mut">
                <span>
                  已发送到 <b className="text-ink">{email}</b>
                  {sent && ' · 查收垃圾邮件箱'}
                </span>
                <button
                  onClick={() => {
                    setStep('email')
                    setErr('')
                  }}
                  className="tap min-h-[36px] rounded-ctl px-2 font-medium text-brand"
                >
                  换个邮箱
                </button>
              </div>
              <button
                onClick={verify}
                disabled={code.trim().length !== 6 || busy}
                className="btn-primary mt-4 flex min-h-[52px] w-full items-center justify-center text-base disabled:opacity-40"
              >
                {busy ? '验证中…' : '登录并同步'}
              </button>
              <button
                onClick={send}
                disabled={busy}
                className="tap mt-2 flex min-h-[44px] w-full items-center justify-center rounded-ctl bg-canvas text-sm font-medium text-mut hover:text-ink disabled:opacity-40"
              >
                没收到？重新发送验证码
              </button>
            </>
          )}

          {err && (
            <div className="mt-3 rounded-ctl bg-rosy px-4 py-3 text-sm text-posdeep">⚠️ {err}</div>
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
