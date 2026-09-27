import { useMemo, useState } from 'react'
import { REDEEM_RULE_TEXT, REDEEM_TIERS } from '../data/rules'
import type { LedgerRow } from '../lib/store'
import { sameWeek, shortDate, todayStr } from '../lib/dates'
import { fmtDelta } from './ScorePage'
import Modal from './Modal'

interface Props {
  rows: LedgerRow[]
  balance: number
  onRedeem: (detail: string, points: number) => Promise<boolean>
  onUndo: (row: LedgerRow) => Promise<void>
}

export default function RedeemPage({ rows, balance, onRedeem, onUndo }: Props) {
  const today = todayStr()
  const [picking, setPicking] = useState<number | null>(null)
  const [choice, setChoice] = useState('')
  const [customText, setCustomText] = useState('')
  const [busy, setBusy] = useState(false)

  const weekRedeem = useMemo(
    () => rows.find((r) => r.kind === 'redeem' && sameWeek(r.entry_date, today)),
    [rows, today],
  )

  const history = useMemo(
    () => rows.filter((r) => r.kind === 'redeem').slice().reverse(),
    [rows],
  )

  const tier = picking !== null ? REDEEM_TIERS[picking] : null

  const closePick = () => {
    setPicking(null)
    setChoice('')
    setCustomText('')
  }

  const confirmRedeem = async () => {
    if (!tier) return
    const detail = choice === '__custom' ? customText.trim() : choice
    if (!detail) return
    setBusy(true)
    const ok = await onRedeem(detail, tier.points)
    setBusy(false)
    if (ok) closePick()
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* ============ 左栏：余额 + 档位 + 历史 ============ */}
      <div className="min-w-0 space-y-4">
        {/* 余额卡片 */}
        <div className="card relative overflow-hidden p-6">
          <img
            src="/ui/mascot-gift.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-2 -top-3 h-28 select-none"
          />
          <div className="text-sm text-mut">当前可用积分</div>
          <div className="mt-1 flex items-center gap-3">
            <img src="/ui/nav-score.png" alt="" aria-hidden className="h-10 w-10 object-contain" />
            <span className="text-[44px] font-extrabold leading-none tabular-nums text-brand">
              {balance}
            </span>
          </div>
          <div className="mt-3 inline-block rounded-full bg-peach px-3.5 py-1.5 text-xs text-golddeep">
            {weekRedeem
              ? `本周已兑换：${weekRedeem.detail.replace('兑换：', '')}（${fmtDelta(weekRedeem.delta)}），下周可再兑换`
              : '本周还没有兑换，随时可以兑换 🎉'}
          </div>
        </div>

        <div className="rounded-card bg-peach px-4 py-2.5 text-xs text-golddeep">📌 {REDEEM_RULE_TEXT}</div>

        {/* 档位列表 */}
        {REDEEM_TIERS.map((t) => {
          const notEnough = balance < t.points
          const used = weekRedeem !== undefined
          const disabled = notEnough || used
          const reason = used
            ? weekRedeem!.entry_date === today
              ? '今日已兑换'
              : '本周已兑换'
            : notEnough
              ? `还差 ${t.points - balance} 分`
              : ''
          return (
            <div key={t.points} className="card flex items-stretch gap-4 p-4">
              <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-ctl bg-brand-soft py-2">
                <div className="text-2xl font-extrabold leading-7 tabular-nums text-brand">{t.points}</div>
                <div className="text-xs text-mut">积分</div>
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm leading-6 text-ink/80">
                  {t.options.map((o) => (
                    <span key={o}>· {o}</span>
                  ))}
                </div>
                {disabled && <div className="mt-1 text-xs text-mut">{reason}</div>}
              </div>
              <div className="flex shrink-0 items-center">
                <button
                  disabled={disabled}
                  onClick={() => setPicking(REDEEM_TIERS.indexOf(t))}
                  className="btn-primary min-h-[48px] px-6 text-[15px]"
                >
                  兑换
                </button>
              </div>
            </div>
          )
        })}

        {/* 兑换历史 */}
        {history.length > 0 && (
          <div className="card p-5">
            <div className="mb-3 font-bold">🧾 兑换记录</div>
            <div className="space-y-2">
              {history.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-ctl bg-canvas px-3.5 py-2.5"
                >
                  <div className="w-20 shrink-0 text-xs text-mut">{shortDate(r.entry_date)}</div>
                  <div className="min-w-0 flex-1 truncate text-sm text-ink/90">
                    {r.detail.replace('兑换：', '')}
                  </div>
                  <div className="font-bold tabular-nums text-golddeep">{fmtDelta(r.delta)}</div>
                  <button
                    onClick={() => {
                      if (window.confirm(`撤销「${r.detail.replace('兑换：', '')}」？积分将退回。`)) onUndo(r)
                    }}
                    className="tap min-h-[36px] shrink-0 rounded-ctl border border-line bg-white px-3 text-xs font-medium text-mut hover:text-ink"
                  >
                    撤销
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============ 右栏：兑换小贴士 ============ */}
      <aside className="hidden lg:sticky lg:top-5 lg:block lg:w-[300px]">
        <div className="card relative overflow-hidden p-5 text-center">
          <img
            src="/ui/nav-redeem.png"
            alt=""
            aria-hidden
            className="mx-auto h-16 object-contain"
          />
          <div className="mt-2 font-bold">兑换小贴士</div>
          <p className="mt-1.5 text-xs leading-6 text-mut">{REDEEM_RULE_TEXT}</p>
          <div className="mt-3 rounded-ctl bg-canvas px-3.5 py-2.5 text-left text-xs leading-6 text-mut">
            · 一周最多兑换一次
            <br />· 兑换后剩余积分自动累积
            <br />· 兑换记录可撤销，积分退回
          </div>
        </div>
      </aside>

      {/* 兑换确认弹窗 */}
      <Modal open={tier !== null} onClose={closePick} title={tier ? `兑换 ${tier.points} 积分奖励` : ''}>
        {tier && (
          <>
            <div className="space-y-2">
              {tier.options.map((o) => (
                <button
                  key={o}
                  onClick={() => setChoice(o)}
                  aria-pressed={choice === o}
                  className={`tap flex w-full items-center gap-3 rounded-ctl border px-4 py-3 text-left text-[15px] ${
                    choice === o
                      ? 'border-brand bg-brand-soft font-bold text-ink shadow-[inset_0_0_0_1px_#7052F5]'
                      : 'border-line bg-white'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      choice === o ? 'border-brand bg-brand text-[10px] text-white' : 'border-line'
                    }`}
                  >
                    {choice === o ? '✓' : ''}
                  </span>
                  {o}
                </button>
              ))}
              <button
                onClick={() => setChoice('__custom')}
                aria-pressed={choice === '__custom'}
                className={`tap flex w-full items-center gap-3 rounded-ctl border px-4 py-3 text-left text-[15px] ${
                  choice === '__custom'
                    ? 'border-brand bg-brand-soft font-bold text-ink shadow-[inset_0_0_0_1px_#7052F5]'
                    : 'border-line bg-white'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    choice === '__custom' ? 'border-brand bg-brand text-[10px] text-white' : 'border-line'
                  }`}
                >
                  {choice === '__custom' ? '✓' : ''}
                </span>
                自定义…
              </button>
              {choice === '__custom' && (
                <input
                  autoFocus
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="填写这次兑换的内容"
                  className="w-full rounded-ctl border border-line px-4 py-3 outline-none focus:border-brand"
                />
              )}
            </div>
            <div className="mt-4 rounded-ctl bg-canvas px-4 py-3 text-sm text-mut">
              将扣除 <b className="text-brand">{tier.points}</b> 分，兑换后剩余{' '}
              <b className="text-brand">{balance - tier.points}</b> 分
            </div>
            <button
              disabled={!choice || busy || (choice === '__custom' && !customText.trim())}
              onClick={confirmRedeem}
              className="btn-primary mt-3 min-h-[48px] w-full text-base disabled:opacity-40"
            >
              {busy ? '兑换中…' : '确认兑换'}
            </button>
          </>
        )}
      </Modal>
    </div>
  )
}
