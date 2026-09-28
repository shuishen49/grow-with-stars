import { useMemo, useState } from 'react'
import type { LedgerRow } from '../lib/store'
import { parseDetail } from '../lib/store'
import { daysOfMonth, parseDate, shortDate, todayStr, weekdayCN } from '../lib/dates'
import { fmtDelta } from './ScorePage'
import Modal from './Modal'

interface Props {
  /** 月份键，形如 2026-09 */
  mk: string
  rows: LedgerRow[]
  /** 某日结账后的累计余额（与登记表「剩余积分」列同一算法，由 LogPage 传入避免重复实现） */
  closingAt: (d: string) => number | undefined
  onPickDate: (d: string) => void
}

/** 周一起始的表头（家里的一周按周一~周日算） */
const WEEK_HEAD = ['一', '二', '三', '四', '五', '六', '日']

interface DayStat {
  /** 当日加分合计 */
  gain: number
  /** 当日扣分合计（存正数，表示扣了多少） */
  loss: number
  /** 明细逐项 */
  items: { name: string; delta: number }[]
}

export default function CalendarView({ mk, rows, closingAt, onPickDate }: Props) {
  const today = todayStr()
  const [openDate, setOpenDate] = useState<string | null>(null)

  /** 每日打分记录 */
  const scoreMap = useMemo(() => {
    const m = new Map<string, LedgerRow>()
    for (const r of rows) if (r.kind === 'score') m.set(r.entry_date, r)
    return m
  }, [rows])

  /** 每日兑换记录（一天可能多条） */
  const redeemMap = useMemo(() => {
    const m = new Map<string, LedgerRow[]>()
    for (const r of rows) {
      if (r.kind !== 'redeem') continue
      m.set(r.entry_date, [...(m.get(r.entry_date) ?? []), r])
    }
    return m
  }, [rows])

  /**
   * 把每条打分明细拆成「加分 / 扣分」两笔。
   * 只看净增减会丢信息（例如「水杯遗忘-2、提前完成+2」净值 0，但当天其实扣了 2 分），
   * 这里按项还原，家长才能一眼看到「哪天扣了多少」。
   */
  const dayStats = useMemo(() => {
    const m = new Map<string, DayStat>()
    for (const r of rows) {
      if (r.kind !== 'score') continue
      const items = parseDetail(r.detail)
      let gain = 0
      let loss = 0
      for (const it of items) {
        if (it.delta > 0) gain += it.delta
        else if (it.delta < 0) loss += -it.delta
      }
      m.set(r.entry_date, { gain, loss, items })
    }
    return m
  }, [rows])

  /** 整月格子：月初用 null 占位，保证周一开头对齐 */
  const cells = useMemo<(string | null)[]>(() => {
    const days = daysOfMonth(mk)
    if (days.length === 0) return []
    const lead = (parseDate(days[0]).getDay() + 6) % 7
    return [...Array.from({ length: lead }, () => null), ...days]
  }, [mk])

  const openRow = openDate ? scoreMap.get(openDate) : undefined
  const openStat = openDate ? dayStats.get(openDate) : undefined
  const openRedeems = openDate ? (redeemMap.get(openDate) ?? []) : []

  return (
    <div>
      <div className="card p-4">
        {/* 星期表头 */}
        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {WEEK_HEAD.map((w, i) => (
            <div
              key={w}
              className={`py-1 text-center text-sm font-bold ${
                i >= 5 ? 'text-brand/60' : 'text-mut'
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 月历格子：换月时 key 变化重新挂载，重播入场动画 */}
        <div key={mk} className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={`pad-${i}`} className="h-[68px]" />

            const row = scoreMap.get(d)
            const stat = dayStats.get(d)
            const gift = redeemMap.has(d)
            const future = d > today
            const isToday = d === today

            return (
              <button
                key={d}
                type="button"
                disabled={future}
                onClick={() => setOpenDate(d)}
                aria-label={`${shortDate(d)}${row ? `，当日${fmtDelta(row.delta)}分` : '，无记录'}`}
                style={{ animationDelay: `${Math.min(i * 10, 220)}ms` }}
                className={`reveal-cell tap relative flex h-[68px] flex-col justify-between overflow-hidden rounded-ctl border px-1.5 pb-1 pt-1 ${
                  future
                    ? 'border-line bg-white/50 opacity-45'
                    : 'border-line bg-white hover:border-brand/50'
                } ${isToday ? 'ring-2 ring-brand' : ''} ${openDate === d ? 'bg-brand-soft' : ''}`}
              >
                {/* 第一层：日期号 + 兑换角标 */}
                <div className="flex items-start justify-between leading-none">
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      isToday ? 'text-brand' : 'text-mut'
                    }`}
                  >
                    {Number(d.slice(8))}
                  </span>
                  <span className="text-[10px] leading-none" title="当天有兑换">
                    {gift ? '🎁' : ''}
                  </span>
                </div>

                {/* 第二层：当日净增减（数据主体） */}
                <div
                  className={`text-center text-lg font-extrabold leading-none tabular-nums ${
                    !row
                      ? 'text-line'
                      : row.delta > 0
                        ? 'text-pos'
                        : row.delta < 0
                          ? 'text-neg'
                          : 'text-mut'
                  }`}
                >
                  {row ? fmtDelta(row.delta) : '·'}
                </div>

                {/* 第三层：(+加 / -扣) 微码 —— 涨红跌绿 */}
                <div className="flex items-center justify-center text-[10px] font-bold leading-none tabular-nums">
                  {stat && (stat.gain > 0 || stat.loss > 0) ? (
                    <span className="text-mut">
                      (<span className="text-posdeep">+{stat.gain}</span>
                      <span className="text-mut/70">/</span>
                      <span className="text-negdeep">-{stat.loss}</span>)
                    </span>
                  ) : (
                    <span className="text-line">·</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-mut">
        <span>
          <b className="text-posdeep">+n</b> = 当日增减
        </span>
        <span>
          <span className="text-mut">(</span>
          <b className="text-posdeep">+n</b>
          <span className="text-mut">/</span>
          <b className="text-negdeep">-n</b>
          <span className="text-mut">)</span> = 当天加分 / 扣分
        </span>
        <span>🎁 = 当天兑换过</span>
      </div>

      {/* 当日详情弹窗（DayDetailSheet） */}
      <Modal
        open={openDate !== null}
        onClose={() => setOpenDate(null)}
        title={openDate ? `${shortDate(openDate)} ${weekdayCN(openDate)}` : ''}
      >
        {openDate && (
          <>
            {openRow && openStat ? (
              <>
                <div className="rounded-ctl bg-canvas px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-mut">当日净增减</span>
                    <span
                      className={`text-3xl font-extrabold tabular-nums ${
                        openRow.delta > 0
                          ? 'text-pos'
                          : openRow.delta < 0
                            ? 'text-neg'
                            : 'text-mut'
                      }`}
                    >
                      {fmtDelta(openRow.delta)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-3 text-xs font-bold tabular-nums">
                    <span className="text-posdeep">加分 +{openStat.gain}</span>
                    {openStat.loss > 0 && (
                      <>
                        <span className="text-line">|</span>
                        <span className="text-negdeep">扣分 -{openStat.loss}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {openStat.items.map((it, idx) => (
                    <div
                      key={`${it.name}-${idx}`}
                      className="flex items-center gap-3 rounded-ctl border border-line px-3.5 py-2.5"
                    >
                      <span className="min-w-0 flex-1 text-[15px] leading-snug">{it.name}</span>
                      <span
                        className={`font-extrabold tabular-nums ${
                          it.delta > 0 ? 'text-pos' : it.delta < 0 ? 'text-neg' : 'text-mut'
                        }`}
                      >
                        {fmtDelta(it.delta)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-ctl bg-canvas px-4 py-8 text-center">
                <img
                  src="/ui/mascot-wave.webp"
                  alt=""
                  aria-hidden
                  className="mx-auto h-20 object-contain"
                />
                <p className="mt-2 text-sm text-mut">这一天还没有打分记录</p>
              </div>
            )}

            {openRedeems.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 text-xs font-bold text-mut">🎁 兑换记录</div>
                <div className="space-y-1.5">
                  {openRedeems.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 rounded-ctl bg-peach px-3.5 py-2.5"
                    >
                      <span className="min-w-0 flex-1 text-sm text-golddeep">
                        {r.detail.replace('兑换：', '')}
                      </span>
                      <span className="font-extrabold tabular-nums text-golddeep">
                        {fmtDelta(r.delta)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between rounded-ctl bg-brand-soft px-4 py-3">
              <span className="text-sm font-medium text-brand">当日结束后剩余积分</span>
              <span className="text-2xl font-extrabold tabular-nums text-brand">
                {closingAt(openDate) ?? '—'}
              </span>
            </div>

            {openDate <= today && (
              <button
                onClick={() => {
                  setOpenDate(null)
                  onPickDate(openDate)
                }}
                className="btn-primary mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 text-base"
              >
                <img src="/ui/category-study.webp" alt="" aria-hidden className="h-5 w-5 object-contain" />
                修改这天
              </button>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
