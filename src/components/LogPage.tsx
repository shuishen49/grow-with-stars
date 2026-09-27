import { useMemo, useState } from 'react'
import type { LedgerRow } from '../lib/store'
import { daysOfMonth, monthKey, monthLabel, shortDate, shiftMonth, todayStr, weekdayCN } from '../lib/dates'
import { fmtDelta } from './ScorePage'
import CalendarView from './CalendarView'

interface Props {
  rows: LedgerRow[]
  onPickDate: (d: string) => void
}

type ViewMode = 'calendar' | 'table'

const VIEWS: { id: ViewMode; icon: string; label: string }[] = [
  { id: 'calendar', icon: '🗓', label: '日历' },
  { id: 'table', icon: '📋', label: '表格' },
]

/** 月份导航（日历/表格两视图共用） */
function MonthNav({ mk, setMk }: { mk: string; setMk: (v: string) => void }) {
  const now = todayStr()
  return (
    <div className="card flex items-center justify-between p-2.5">
      <button
        onClick={() => setMk(shiftMonth(mk, -1))}
        className="tap flex min-h-[44px] items-center rounded-ctl px-4 text-sm font-medium text-mut hover:bg-canvas"
      >
        ‹ 上月
      </button>
      <div className="text-lg font-extrabold">{monthLabel(mk)}</div>
      <button
        disabled={mk >= monthKey(now)}
        onClick={() => setMk(shiftMonth(mk, 1))}
        className="tap flex min-h-[44px] items-center rounded-ctl px-4 text-sm font-medium text-mut hover:bg-canvas disabled:opacity-30"
      >
        下月 ›
      </button>
    </div>
  )
}

/** 日历/表格视图切换（RecordViewSwitch） */
function ViewToggle({ view, setView }: { view: ViewMode; setView: (v: ViewMode) => void }) {
  return (
    <div
      role="tablist"
      aria-label="记录视图切换"
      className="flex gap-1 rounded-ctl border border-line bg-white p-1 shadow-card"
    >
      {VIEWS.map((v) => {
        const active = view === v.id
        return (
          <button
            key={v.id}
            role="tab"
            aria-selected={active}
            onClick={() => setView(v.id)}
            className={`tap flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-bold transition-colors ${
              active ? 'bg-brand text-white' : 'text-mut hover:bg-canvas'
            }`}
          >
            <span className="text-base leading-none">{v.icon}</span>
            {v.label}
          </button>
        )
      })}
    </div>
  )
}

/** 四张统计卡（SummaryCard）：图标 + 大数字 + 标签，颜色与图标双通道区分 */
function StatsRow({
  stats,
}: {
  stats: { gain: number; loss: number; redeem: number; monthEnd: number | undefined }
}) {
  const items = [
    {
      icon: '/ui/stat-coins.png',
      value: fmtDelta(stats.gain),
      label: '本月奖励',
      cls: 'text-pos',
      bg: 'bg-rosy',
    },
    {
      icon: '/ui/stat-deduction.png',
      value: `${stats.loss}`,
      label: '本月扣分',
      cls: 'text-neg',
      bg: 'bg-mint',
    },
    {
      icon: '/ui/mascot-gift.png',
      value: `${stats.redeem}`,
      label: '本月兑换',
      cls: 'text-golddeep',
      bg: 'bg-peach',
    },
    {
      icon: '/ui/stat-balance.png',
      value: stats.monthEnd ?? '—',
      label: '月末结余',
      cls: 'text-brand',
      bg: 'bg-brand-soft',
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className={`flex items-center gap-3 rounded-card border border-line px-4 py-3 ${it.bg}`}>
          <img src={it.icon} alt="" aria-hidden className="h-9 w-9 shrink-0 object-contain" />
          <div className="min-w-0">
            <div className={`truncate text-2xl font-extrabold leading-7 tabular-nums ${it.cls}`}>
              {it.value}
            </div>
            <div className="text-xs text-mut">{it.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LogPage({ rows, onPickDate }: Props) {
  const now = todayStr()
  const [mk, setMk] = useState(monthKey(now))
  const [view, setView] = useState<ViewMode>('calendar')
  // 表格视图只列到今天为止（日历视图需要看整月，CalendarView 里自己另算）
  const monthDays = useMemo(() => daysOfMonth(mk, mk === monthKey(now)), [mk, now])

  const scoreByDate = useMemo(() => {
    const m = new Map<string, LedgerRow>()
    for (const r of rows) if (r.kind === 'score') m.set(r.entry_date, r)
    return m
  }, [rows])

  const redeemByDate = useMemo(() => {
    const m = new Map<string, LedgerRow[]>()
    for (const r of rows) {
      if (r.kind === 'redeem') {
        m.set(r.entry_date, [...(m.get(r.entry_date) ?? []), r])
      }
    }
    return m
  }, [rows])

  // 每日结账后的累计余额（rows 已按日期排序）
  const closingMap = useMemo(() => {
    const m = new Map<string, number>()
    let acc = 0
    for (const r of rows) {
      acc += r.delta
      m.set(r.entry_date, acc)
    }
    return m
  }, [rows])

  const closingAt = (d: string): number | undefined => {
    let out: number | undefined
    for (const k of closingMap.keys()) {
      if (k <= d) out = closingMap.get(k)
      else break
    }
    return out
  }

  /** 本月合计（与统计卡同一口径：按当日净增减）+ 最高/最低一天 */
  const monthStats = useMemo(() => {
    let gain = 0
    let loss = 0
    let redeem = 0
    let best: { date: string; delta: number } | null = null
    let worst: { date: string; delta: number } | null = null
    for (const r of rows) {
      if (!r.entry_date.startsWith(mk)) continue
      if (r.kind === 'redeem') {
        redeem += r.delta
        continue
      }
      if (r.delta > 0) gain += r.delta
      else loss += r.delta
      if (!best || r.delta > best.delta) best = { date: r.entry_date, delta: r.delta }
      if (!worst || r.delta < worst.delta) worst = { date: r.entry_date, delta: r.delta }
    }
    return {
      gain,
      loss,
      redeem,
      monthEnd: closingAt(`${mk}-31`),
      best: best && best.delta > 0 ? best : null,
      worst: worst && worst.delta < 0 ? worst : null,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mk])

  /** 右栏「本月战绩」卡：图标 + 数值 + 标签，最高/最低用浅底色块强调 */
  const MonthStatsCard = (
    <div className="card relative overflow-hidden p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold">📊 本月战绩</h2>
        <img src="/ui/nav-score.png" alt="" aria-hidden className="h-7 w-7 object-contain" />
      </div>
      <div className="space-y-1">
        {[
          { icon: '/ui/stat-coins.png', v: fmtDelta(monthStats.gain), l: '本月奖励', cls: 'text-pos' },
          { icon: '/ui/stat-deduction.png', v: `${monthStats.loss}`, l: '本月扣分', cls: 'text-neg' },
          { icon: '/ui/mascot-gift.png', v: `${monthStats.redeem}`, l: '本月兑换', cls: 'text-golddeep' },
          {
            icon: '/ui/stat-balance.png',
            v: monthStats.monthEnd !== undefined ? `${monthStats.monthEnd}` : '—',
            l: '月末结余',
            cls: 'text-brand',
          },
        ].map((r) => (
          <div key={r.l} className="flex items-center gap-3 py-1.5">
            <img src={r.icon} alt="" aria-hidden className="h-7 w-7 shrink-0 object-contain" />
            <span className={`w-16 text-xl font-extrabold tabular-nums ${r.cls}`}>{r.v}</span>
            <span className="text-sm text-mut">{r.l}</span>
          </div>
        ))}
      </div>

      {(monthStats.best || monthStats.worst) && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2.5 rounded-ctl bg-rosy px-3.5 py-2.5 text-sm">
            <img src="/ui/category-achievement.png" alt="" aria-hidden className="h-6 w-6 object-contain" />
            <span className="text-mut">最高分</span>
            <b className="tabular-nums text-posdeep">
              {monthStats.best ? fmtDelta(monthStats.best.delta) : '—'}
            </b>
            <span className="ml-auto text-xs text-mut">
              {monthStats.best ? shortDate(monthStats.best.date) : ''}
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-ctl bg-mint px-3.5 py-2.5 text-sm">
            <img src="/ui/stat-deduction.png" alt="" aria-hidden className="h-6 w-6 object-contain" />
            <span className="text-mut">最低分</span>
            <b className="tabular-nums text-negdeep">
              {monthStats.worst ? fmtDelta(monthStats.worst.delta) : '—'}
            </b>
            <span className="ml-auto text-xs text-mut">
              {monthStats.worst ? shortDate(monthStats.worst.date) : ''}
            </span>
          </div>
        </div>
      )}

      {/* 装饰吉祥物 */}
      <img
        src="/ui/mascot-books.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-3 -right-2 h-20 select-none opacity-90"
      />
    </div>
  )

  return (
    <div>
      {view === 'calendar' ? (
        /* 日历视图：左月历 + 右战绩双栏 */
        <div className="grid items-start gap-5 tb:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            <MonthNav mk={mk} setMk={setMk} />
            <StatsRow stats={monthStats} />
            <CalendarView mk={mk} rows={rows} closingAt={closingAt} onPickDate={onPickDate} />
          </div>
          <aside className="space-y-4 tb:sticky tb:top-5 tb:w-[300px]">
            <ViewToggle view={view} setView={setView} />
            {MonthStatsCard}
          </aside>
        </div>
      ) : (
        /* 表格视图：占满内容宽度，切换器内联到月份导航行 */
        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
            <MonthNav mk={mk} setMk={setMk} />
            <ViewToggle view={view} setView={setView} />
          </div>
          <StatsRow stats={monthStats} />

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-[#F5F3FC] text-xs text-mut">
                    <th className="whitespace-nowrap px-3 py-3 text-left">日期</th>
                    <th className="px-3 py-3 text-left">星期</th>
                    <th className="px-3 py-3 text-left">增减</th>
                    <th className="px-3 py-3 text-left">增减明细</th>
                    <th className="px-3 py-3 text-left">兑换记录</th>
                    <th className="px-3 py-3 text-right">剩余积分</th>
                  </tr>
                </thead>
                <tbody>
                  {monthDays.map((d) => {
                    const s = scoreByDate.get(d)
                    const redeems = redeemByDate.get(d) ?? []
                    const bal = closingAt(d)
                    const editable = d <= now
                    return (
                      <tr
                        key={d}
                        onClick={() => editable && onPickDate(d)}
                        className={`border-t border-line tabular-nums transition-colors ${
                          d === now ? 'bg-brand-soft/60' : editable ? 'cursor-pointer hover:bg-brand-soft/30' : ''
                        }`}
                      >
                        <td className="whitespace-nowrap px-3 py-3 font-medium">{shortDate(d)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-mut">{weekdayCN(d)}</td>
                        <td className="px-3 py-3">
                          {s ? (
                            <span
                              className={`text-base font-extrabold ${
                                s.delta > 0 ? 'text-pos' : s.delta < 0 ? 'text-neg' : 'text-mut'
                              }`}
                            >
                              {fmtDelta(s.delta)}
                            </span>
                          ) : (
                            <span className="text-line">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-ink/70 [overflow-wrap:anywhere]">
                          {s?.detail ?? <span className="text-line">—</span>}
                        </td>
                        <td className="px-3 py-3 text-golddeep [overflow-wrap:anywhere]">
                          {redeems.length > 0 ? (
                            redeems
                              .map((r) => `${r.detail.replace('兑换：', '')}(${fmtDelta(r.delta)})`)
                              .join('、')
                          ) : (
                            <span className="text-line">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-brand">
                          {bal !== undefined ? bal : <span className="text-line">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-center text-xs text-mut">点任意日期行可直接修改当日打分</p>
        </div>
      )}
    </div>
  )
}
