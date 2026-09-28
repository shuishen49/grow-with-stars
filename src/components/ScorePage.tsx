import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, NAMED_DELTA, QUICK_ITEMS } from '../data/rules'
import type { DayEntry, LedgerRow } from '../lib/store'
import { parseDetail } from '../lib/store'
import { addDays, shortDate, todayStr, weekdayCN } from '../lib/dates'

interface Props {
  date: string
  onDateChange: (d: string) => void
  dayRow: LedgerRow | undefined
  onSave: (entries: DayEntry[]) => Promise<void>
  onClear: () => Promise<void>
}

export function fmtDelta(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

/** 分类 id → 素材包图标（public/ui/） */
const CAT_ICON: Record<string, string> = {
  life: '/ui/category-life.webp',
  study: '/ui/category-study.webp',
  result: '/ui/category-achievement.webp',
  character: '/ui/category-character.webp',
}

/** 单个打分项：白底卡片，选中后紫底描边（aria-pressed 供无障碍与样式共用） */
function ItemChip({
  name,
  delta,
  selected,
  onClick,
}: {
  name: string
  delta: number
  selected: boolean
  onClick: () => void
}) {
  const positive = delta > 0
  return (
    <button
      aria-pressed={selected}
      onClick={onClick}
      className={`tap flex min-h-[52px] w-full items-center justify-between gap-2 rounded-ctl border px-4 py-2.5 text-left text-[15px] leading-snug ${
        selected
          ? 'border-brand bg-brand-soft font-bold text-ink shadow-[inset_0_0_0_1px_#7052F5]'
          : 'border-line bg-white text-ink hover:border-brand/40'
      }`}
    >
      <span className="min-w-0 flex-1">{name}</span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${
          positive ? 'bg-rosy text-posdeep' : 'bg-mint text-negdeep'
        }`}
      >
        {fmtDelta(delta)}
      </span>
    </button>
  )
}

function CustomAdd({ onAdd }: { onAdd: (name: string, delta: number) => void }) {
  const [name, setName] = useState('')
  const [pts, setPts] = useState(1)
  const [sign, setSign] = useState<1 | -1>(1)

  const submit = () => {
    const n = name.trim()
    if (!n) return
    onAdd(n, sign * pts)
    setName('')
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2 font-bold">✏️ 自定义加扣分</div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="如：帮忙做家务"
          className="min-w-0 flex-1 rounded-ctl border border-line bg-white px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-mut/60 focus:border-brand"
        />
        <div className="flex items-center gap-1 rounded-ctl bg-canvas p-1">
          <button
            aria-label="减少分值"
            className="tap h-9 w-9 rounded-lg text-lg font-bold text-mut"
            onClick={() => setPts((p) => Math.max(1, p - 1))}
          >
            −
          </button>
          <span className="w-7 text-center font-bold tabular-nums">{pts}</span>
          <button
            aria-label="增加分值"
            className="tap h-9 w-9 rounded-lg text-lg font-bold text-mut"
            onClick={() => setPts((p) => Math.min(50, p + 1))}
          >
            ＋
          </button>
        </div>
        <div className="flex rounded-ctl bg-canvas p-1">
          <button
            aria-pressed={sign === 1}
            className={`tap rounded-lg px-3.5 py-1.5 text-sm font-bold ${sign === 1 ? 'bg-pos text-white' : 'text-mut'}`}
            onClick={() => setSign(1)}
          >
            奖
          </button>
          <button
            aria-pressed={sign === -1}
            className={`tap rounded-lg px-3.5 py-1.5 text-sm font-bold ${sign === -1 ? 'bg-neg text-white' : 'text-mut'}`}
            onClick={() => setSign(-1)}
          >
            罚
          </button>
        </div>
        <button disabled={!name.trim()} onClick={submit} className="btn-primary px-5 py-2.5 text-[15px] disabled:opacity-40">
          添加
        </button>
      </div>
    </div>
  )
}

export default function ScorePage({ date, onDateChange, dayRow, onSave, onClear }: Props) {
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  // 切换日期或当日记录变化时，从已存明细恢复勾选状态
  useEffect(() => {
    const map: Record<string, number> = {}
    if (dayRow) {
      for (const e of parseDetail(dayRow.detail)) {
        map[e.name] = (map[e.name] ?? 0) + e.delta
      }
    }
    setSelected(map)
  }, [date, dayRow])

  const isToday = date === todayStr()

  const toggle = (name: string, delta: number) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (name in next) delete next[name]
      else next[name] = delta
      return next
    })
  }

  const removeCustom = (name: string) => {
    setSelected((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  // 保存顺序：规则表顺序在前，自定义在后
  const entries: DayEntry[] = useMemo(() => {
    const list: DayEntry[] = []
    for (const cat of CATEGORIES) {
      for (const it of cat.rewards) if (it.name in selected) list.push({ name: it.name, delta: it.points })
      for (const it of cat.penalties) if (it.name in selected) list.push({ name: it.name, delta: -it.points })
    }
    for (const it of QUICK_ITEMS) if (it.name in selected) list.push({ name: it.name, delta: it.delta })
    for (const [name, delta] of Object.entries(selected)) {
      if (!(name in NAMED_DELTA)) list.push({ name, delta })
    }
    return list
  }, [selected])

  const pending = entries.reduce((s, e) => s + e.delta, 0)
  const customSelected = Object.entries(selected).filter(([name]) => !(name in NAMED_DELTA))

  const save = async () => {
    if (entries.length === 0) {
      if (dayRow && window.confirm('当日没有勾选任何项，保存将清空该日记录，确定吗？')) {
        await onClear()
      }
      return
    }
    setSaving(true)
    try {
      await onSave(entries)
    } finally {
      setSaving(false)
    }
  }

  const clearSelection = async () => {
    if (Object.keys(selected).length > 0) {
      setSelected({}) // 只是清掉未保存的勾选
    } else if (dayRow && window.confirm(`确定清空 ${shortDate(date)} 的记录吗？`)) {
      await onClear()
    }
  }

  return (
    <div className="grid items-start gap-5 tb:grid-cols-[minmax(0,1fr)_300px]">
      {/* ============ 左栏：日期导航 + 项目网格 ============ */}
      <div className="min-w-0 space-y-4">
        {/* 日期导航 */}
        <div className="card flex items-center justify-between p-2.5">
          <button
            onClick={() => onDateChange(addDays(date, -1))}
            className="tap flex min-h-[44px] items-center rounded-ctl px-4 text-sm font-medium text-mut hover:bg-canvas"
          >
            ‹ 前一天
          </button>
          <div className="text-center">
            <div className="text-xl font-extrabold tabular-nums leading-6">{shortDate(date)}</div>
            <div className="mt-0.5 flex items-center justify-center gap-1.5 text-xs text-mut">
              {weekdayCN(date)}
              {isToday && ' · 今天'}
              {dayRow && (
                <span className="rounded-full bg-rosy px-2 py-0.5 font-bold text-posdeep">
                  已记录 {fmtDelta(dayRow.delta)}
                </span>
              )}
            </div>
          </div>
          <button
            disabled={isToday}
            onClick={() => onDateChange(addDays(date, 1))}
            className="tap flex min-h-[44px] items-center rounded-ctl px-4 text-sm font-medium text-mut hover:bg-canvas disabled:opacity-30"
          >
            后一天 ›
          </button>
        </div>

        {/* 常用速记 */}
        <section className="card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="flex items-center gap-1.5 text-lg font-bold">⚡ 常用速记</h2>
            <span className="text-xs text-mut">点击可加分</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {QUICK_ITEMS.map((it) => (
              <ItemChip
                key={it.id}
                name={it.name}
                delta={it.delta}
                selected={it.name in selected}
                onClick={() => toggle(it.name, it.delta)}
              />
            ))}
          </div>
        </section>

        {/* 规则分类：默认折叠，点开展开奖励/扣分网格 */}
        {CATEGORIES.map((cat) => {
          const open = !!openCats[cat.id]
          const count = cat.rewards.length + cat.penalties.length
          const picked =
            [...cat.rewards, ...cat.penalties].filter((it) => it.name in selected).length
          return (
            <section key={cat.id} className="card overflow-hidden">
              <button
                onClick={() => setOpenCats((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
                aria-expanded={open}
                className="tap flex min-h-[56px] w-full items-center gap-3 px-5 py-3 text-left"
              >
                <img src={CAT_ICON[cat.id]} alt="" aria-hidden className="h-7 w-7 object-contain" />
                <span className="flex-1 text-lg font-bold">{cat.name}</span>
                {picked > 0 && (
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand">
                    已选 {picked}
                  </span>
                )}
                <span className="text-sm text-mut">{count} 项</span>
                <span
                  aria-hidden
                  className={`text-mut transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                >
                  ▾
                </span>
              </button>

              {open && (
                <div className="border-t border-line px-5 pb-5 pt-4">
                  <div className="mb-2 text-xs font-bold text-posdeep">奖励</div>
                  <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
                    {cat.rewards.map((it) => (
                      <ItemChip
                        key={it.id}
                        name={it.name}
                        delta={it.points}
                        selected={it.name in selected}
                        onClick={() => toggle(it.name, it.points)}
                      />
                    ))}
                  </div>
                  <div className="mb-2 mt-4 text-xs font-bold text-negdeep">扣分</div>
                  <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
                    {cat.penalties.map((it) => (
                      <ItemChip
                        key={it.id}
                        name={it.name}
                        delta={-it.points}
                        selected={it.name in selected}
                        onClick={() => toggle(it.name, -it.points)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )
        })}

        <CustomAdd
          onAdd={(name, delta) => setSelected((prev) => ({ ...prev, [name]: delta }))}
        />

        {customSelected.length > 0 && (
          <div className="card p-5">
            <div className="mb-2 text-sm font-bold text-ink">已添加的自定义项</div>
            <div className="flex flex-wrap gap-2">
              {customSelected.map(([name, delta]) => (
                <button
                  key={name}
                  onClick={() => removeCustom(name)}
                  aria-label={`移除自定义项 ${name}`}
                  className={`tap flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ${
                    delta > 0 ? 'bg-rosy text-posdeep' : 'bg-mint text-negdeep'
                  }`}
                >
                  {name} {fmtDelta(delta)} <span className="text-xs opacity-50">✕</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============ 右栏：今日已选摘要（SelectionPanel） ============ */}
      <aside className="tb:sticky tb:top-5 tb:w-[300px]">
        <div className="card relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              ⭐ 今日已选 <span className="text-mut">({entries.length})</span>
            </h2>
            <button
              onClick={clearSelection}
              disabled={!dayRow && entries.length === 0}
              className="tap min-h-[36px] rounded-ctl bg-canvas px-3 text-sm font-medium text-mut hover:text-ink disabled:opacity-40"
            >
              清空
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="py-6 text-center">
              <img
                src="/ui/mascot-wave.webp"
                alt=""
                aria-hidden
                className="mx-auto h-28 object-contain"
              />
              <p className="mt-2 text-sm leading-6 text-mut">
                还没有选择任何项目
                <br />
                快去左边点击添加吧！
              </p>
            </div>
          ) : (
            <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
              {entries.map((e) => (
                <li key={e.name}>
                  <button
                    onClick={() => {
                      if (customSelected.some(([n]) => n === e.name)) removeCustom(e.name)
                      else toggle(e.name, e.delta)
                    }}
                    aria-label={`取消 ${e.name}`}
                    className="tap flex w-full items-center gap-2 rounded-ctl bg-canvas px-3 py-2 text-left text-sm hover:bg-brand-soft"
                  >
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    <span
                      className={`font-bold tabular-nums ${
                        e.delta > 0 ? 'text-posdeep' : 'text-negdeep'
                      }`}
                    >
                      {fmtDelta(e.delta)}
                    </span>
                    <span aria-hidden className="text-xs text-mut">✕</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="my-4 border-t border-dashed border-line" />

          <div className="text-center">
            <div className="text-sm text-mut">今日总分</div>
            <div
              className={`mt-1 flex items-center justify-center gap-2 text-[36px] font-extrabold leading-none tabular-nums ${
                pending > 0 ? 'text-pos' : pending < 0 ? 'text-neg' : 'text-mut'
              }`}
            >
              <img src="/ui/nav-score.webp" alt="" aria-hidden className="h-9 w-9 object-contain" />
              {fmtDelta(pending)}
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving || (entries.length === 0 && !dayRow)}
            className="btn-primary mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 text-base disabled:opacity-50"
          >
            <span aria-hidden>🗓</span>
            {saving ? '保存中…' : dayRow ? '保存（覆盖已记录）' : '保存'}
          </button>
          {dayRow && (
            <p className="mt-2 text-center text-xs text-mut">
              这天已记录 {fmtDelta(dayRow.delta)} 分，保存后按今日勾选覆盖
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}
