import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { NAMED_DELTA, QUICK_ITEMS } from '../data/rules'
import { CAT_EMOJI_CHOICES, buildCategories, catIcon, type BuiltCat } from '../lib/cats'
import type { DayEntry, LedgerRow } from '../lib/store'
import { parseDetail } from '../lib/store'
import {
  addCustomRule,
  loadCatOrder,
  loadCustomRules,
  removeCustomRule,
  removeUserCatAndRules,
  saveCatName,
  addUserCat,
  setUserCatEmoji,
  saveCatOrder,
  type CustomRule,
} from '../lib/customRules'
import { addDays, shortDate, todayStr, weekdayCN } from '../lib/dates'

interface Props {
  date: string
  onDateChange: (d: string) => void
  dayRow: LedgerRow | undefined
  onSave: (entries: DayEntry[]) => Promise<void>
  onClear: () => Promise<void>
  /** 家长锁守门：进入「管理」前验证一次；没开家长锁就直接放行 */
  guard: (action: string) => Promise<boolean>
}

export function fmtDelta(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

/** 分类改名 / 新建分类的行内编辑器：名字 + 挑一个头像 */
function CatEditor({
  title,
  initName,
  initEmoji,
  onSave,
  onCancel,
}: {
  title: string
  initName: string
  initEmoji: string
  onSave: (name: string, emoji: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initName)
  const [emoji, setEmoji] = useState(initEmoji || CAT_EMOJI_CHOICES[0])

  const submit = () => {
    const n = name.trim()
    if (!n) return
    onSave(n, emoji)
  }

  return (
    <div className="rounded-ctl border border-dashed border-brand/50 bg-brand-soft/40 p-4">
      <div className="mb-2 text-sm font-bold text-brand">{title}</div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="给它起个名字，如：家务小能手"
          className="min-w-0 flex-1 rounded-ctl border border-line bg-white px-3.5 py-2.5 text-[15px] outline-none placeholder:text-mut/60 focus:border-brand"
          aria-label="分类名字"
        />
        <div className="scroll-x flex flex-1 items-center gap-1 overflow-x-auto rounded-ctl bg-white p-1">
          {CAT_EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              aria-label={`头像 ${e}`}
              aria-pressed={emoji === e}
              className={`tap flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
                emoji === e ? 'bg-brand text-white' : 'bg-canvas'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <button
          disabled={!name.trim()}
          onClick={submit}
          className="btn-primary px-4 py-2.5 text-[15px] disabled:opacity-40"
        >
          保存
        </button>
        <button onClick={onCancel} className="tap px-3 py-2 text-sm font-medium text-mut">
          取消
        </button>
      </div>
      <p className="mt-1.5 text-xs text-mut">改完所有地方都会跟着变，之前打过的分不受影响。</p>
    </div>
  )
}

/** 单个打分项：白底卡片，选中后紫底描边（aria-pressed 供无障碍与样式共用） */
function ItemChip({
  name,
  delta,
  selected,
  onClick,
  onDelete,
}: {
  name: string
  delta: number
  selected: boolean
  onClick: () => void
  /** 给了这个才会显示删除小叉（只在管理模式下给） */
  onDelete?: () => void
}) {
  const positive = delta > 0
  return (
    <div className="relative">
      <button
        aria-pressed={selected}
        onClick={onClick}
        className={`tap flex min-h-[52px] w-full items-center justify-between gap-2 rounded-ctl border px-4 py-2.5 text-left text-[15px] leading-snug ${
          selected
            ? 'border-brand bg-brand-soft font-bold text-ink shadow-[inset_0_0_0_1px_#7052F5]'
            : 'border-line bg-white text-ink hover:border-brand/40'
        }`}
      >
        <span className={`min-w-0 flex-1 ${onDelete ? 'pr-5' : ''}`}>{name}</span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${
            positive ? 'bg-rosy text-posdeep' : 'bg-mint text-negdeep'
          }`}
        >
          {fmtDelta(delta)}
        </span>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label={`删除自定义项 ${name}`}
          className="tap absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-xs font-bold text-mut shadow-card hover:text-posdeep"
        >
          ✕
        </button>
      )}
    </div>
  )
}

/** 分类里的「＋」展开出来的添加行：名字 + 分值 + 奖/罚 */
function CategoryAdd({
  catName,
  onAdd,
  onCancel,
}: {
  catName: string
  onAdd: (name: string, delta: number) => void
  onCancel: () => void
}) {
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
    <div className="mt-4 rounded-ctl border border-dashed border-brand/50 bg-brand-soft/40 p-4">
      <div className="mb-2 text-sm font-bold text-brand">往「{catName}」里加一项</div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="如：帮忙做家务"
          className="min-w-0 flex-1 rounded-ctl border border-line bg-white px-3.5 py-2.5 text-[15px] outline-none placeholder:text-mut/60 focus:border-brand"
        />
        <div className="flex items-center gap-1 rounded-ctl bg-white p-1">
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
        <div className="flex rounded-ctl bg-white p-1">
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
        <button
          disabled={!name.trim()}
          onClick={submit}
          className="btn-primary px-4 py-2.5 text-[15px] disabled:opacity-40"
        >
          保存
        </button>
        <button onClick={onCancel} className="tap px-3 py-2 text-sm font-medium text-mut">
          取消
        </button>
      </div>
      <p className="mt-1.5 text-xs text-mut">加好后它会一直留在这个分类里，每天都能勾。</p>
    </div>
  )
}


export default function ScorePage({ date, onDateChange, dayRow, onSave, onClear, guard }: Props) {
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  /** 管理模式：只有点「管理」之后才露出 ➕ 和删除叉、才能拖动排序 */
  const [manage, setManage] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  /** 正在改名字的大类 id；'new' 表示正在新建一个大类 */
  const [editing, setEditing] = useState<string | null>(null)
  const [custom, setCustom] = useState<CustomRule[]>(() => loadCustomRules())
  /** 内置大类 + 自己新建的大类 + 改过的名字，合并成一份 */
  const [cats, setCats] = useState<BuiltCat[]>(buildCategories)
  /** 分类顺序：按上次存的顺序排，新加的排在最后 */
  const [order, setOrder] = useState<string[]>(() => {
    const saved = loadCatOrder()
    const ids = buildCategories().map((c) => c.id)
    const known = saved.filter((id) => ids.includes(id))
    return [...known, ...ids.filter((id) => !known.includes(id))]
  })
  const [dragging, setDragging] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  /** 拖拽中的手势状态：dy 是手指偏移量，to 是落点下标，抬手才真正改顺序 */
  const [drag, setDrag] = useState<{
    id: string
    from: number
    to: number
    dy: number
    h: number
    gap: number
    homes: number[]
  } | null>(null)
  const dragMeta = useRef<{ id: string; from: number; startY: number; h: number; gap: number; homes: number[] } | null>(
    null,
  )

  const ordered = useMemo(() => order.map((id) => cats.find((c) => c.id === id)).filter(Boolean) as BuiltCat[], [
    order,
    cats,
  ])

  const toggleManage = async () => {
    if (manage) {
      setManage(false)
      setAdding(null)
      setEditing(null)
      return
    }
    // 改规则也算「家长权限」：开了家长锁就要先验证一次
    const ok = await guard('管理评分项目')
    if (ok) setManage(true)
  }

  // ---------- 大类本身：改名 / 新建 / 删除 ----------
  const refreshCats = () => setCats(buildCategories())

  const renameCat = (id: string, name: string) => {
    saveCatName(id, name)
    refreshCats()
    setEditing(null)
  }

  /** 自建大类可以连头像一起换；内置大类只有名字能改 */
  const setEmojiForUserCat = (id: string, emoji: string) => {
    setUserCatEmoji(id, emoji)
    refreshCats()
  }

  const createCat = (name: string, emoji: string) => {
    const list = addUserCat(name, emoji)
    const made = list[list.length - 1]
    if (made) {
      setOrder((prev) => [...prev.filter((x) => x !== made.id), made.id])
      saveCatOrder([...order.filter((x) => x !== made.id), made.id])
    }
    refreshCats()
    setEditing(null)
  }

  const deleteCat = (cat: BuiltCat) => {
    const who = custom.filter((it) => it.catId === cat.id).length
    const extra = who > 0 ? `\n\n这个类里你自己加的 ${who} 项也会一起删掉。` : ''
    if (!window.confirm(`删掉「${cat.name}」这个大类？${extra}\n\n已经打过的分不会变。`)) return
    // 清掉这个类本身，以及它里面的自定义项
    const data = removeUserCatAndRules(cat.id)
    setCustom(data.rules)
    setOrder((prev) => {
      const next = prev.filter((x) => x !== cat.id)
      saveCatOrder(next)
      return next
    })
    refreshCats()
    setAdding(null)
  }

  /** 轻微震动反馈（安卓 WebView 支持就用，不支持就安静跳过） */
  const buzz = () => {
    try {
      ;(navigator as Navigator & { vibrate?: (p: number) => boolean }).vibrate?.(12)
    } catch {
      /* 不支持就算了 */
    }
  }

  /** 落位回弹：让卡片从手指松开的位置滑到新的排序位置（FLIP） */
  const settle = (id: string, visualTop: number) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = sectionRefs.current[id]
        if (!el) return
        const delta = visualTop - el.getBoundingClientRect().top
        if (!isFinite(delta) || Math.abs(delta) < 1.5) return
        el.style.transition = 'none'
        el.style.transform = `translateY(${delta}px)`
        el.style.zIndex = '50'
        requestAnimationFrame(() => {
          el.style.transition = 'transform 220ms cubic-bezier(.22,.61,.36,1)'
          el.style.transform = ''
          window.setTimeout(() => {
            el.style.transition = ''
            el.style.transform = ''
            el.style.zIndex = ''
          }, 260)
        })
      })
    })
  }

  /**
   * 拖动排序：手指按住 ⠿ 时整张卡片「浮起来」跟着手指走，
   * 越过别的卡片时它们会滑开让位，抬手才真正改顺序并落位回弹。
   */
  const onHandleDown = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault()
    const els = order.map((cid) => sectionRefs.current[cid])
    if (els.some((el) => !el)) return
    const rects = els.map((el) => el!.getBoundingClientRect())
    const from = order.indexOf(id)
    const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 0
    dragId.current = id
    dragMeta.current = {
      id,
      from,
      startY: e.clientY,
      h: rects[from].height,
      gap,
      homes: rects.map((r) => r.top),
    }
    setDragging(id)
    setDrag({ id, from, to: from, dy: 0, h: rects[from].height, gap, homes: rects.map((r) => r.top) })
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    buzz()
  }
  const onHandleMove = (e: React.PointerEvent) => {
    const meta = dragMeta.current
    if (!meta) return
    const dy = e.clientY - meta.startY
    const myTop = meta.homes[meta.from] + dy
    const myMid = myTop + meta.h / 2
    // 数一数中点越过了几张卡片的原位置，就是落点下标
    let to = 0
    const heights = order.map((cid) => sectionRefs.current[cid]?.offsetHeight ?? 0)
    for (let i = 0; i < order.length; i++) {
      if (i === meta.from) continue
      if (myMid > meta.homes[i] + heights[i] / 2) to++
    }
    const prev = drag?.to ?? meta.from
    if (to !== prev) buzz()
    setDrag({ id: meta.id, from: meta.from, to, dy, h: meta.h, gap: meta.gap, homes: meta.homes })
  }
  const endDrag = () => {
    const meta = dragMeta.current
    const cur = drag
    dragMeta.current = null
    dragId.current = null
    setDragging(null)
    setDrag(null)
    if (!meta || !cur) return
    if (cur.to !== meta.from) {
      // 手指松开时卡片「看」起来在哪儿，落位动画就从哪儿开始
      const visualTop = meta.homes[meta.from] + cur.dy
      const next = order.filter((x) => x !== meta.id)
      next.splice(cur.to, 0, meta.id)
      setOrder(next)
      saveCatOrder(next)
      settle(meta.id, visualTop)
      buzz()
    }
  }

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

  const customNames = useMemo(() => new Set(custom.map((c) => c.name)), [custom])

  // 保存顺序：按界面上的分类顺序走，每类里 奖励 → 扣分 → 自己加的项
  const entries: DayEntry[] = useMemo(() => {
    const list: DayEntry[] = []
    for (const cat of ordered) {
      for (const it of cat.rewards) if (it.name in selected) list.push({ name: it.name, delta: it.points })
      for (const it of cat.penalties) if (it.name in selected) list.push({ name: it.name, delta: -it.points })
      for (const it of custom) {
        if (it.catId === cat.id && it.name in selected) list.push({ name: it.name, delta: it.delta })
      }
    }
    for (const it of QUICK_ITEMS) if (it.name in selected) list.push({ name: it.name, delta: it.delta })
    for (const [name, delta] of Object.entries(selected)) {
      if (!(name in NAMED_DELTA) && !customNames.has(name)) list.push({ name, delta })
    }
    return list
  }, [selected, ordered, custom, customNames])

  const pending = entries.reduce((s, e) => s + e.delta, 0)

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
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="text-sm font-bold text-mut">规则分类（点开勾选）</div>
          <button
            onClick={toggleManage}
            aria-pressed={manage}
            className={`tap flex min-h-[40px] items-center gap-1.5 rounded-ctl px-3.5 text-sm font-bold ${
              manage ? 'bg-brand text-white' : 'bg-white text-mut shadow-card'
            }`}
          >
            <span aria-hidden>⚙</span>
            {manage ? '完成' : '管理'}
          </button>
        </div>

        {manage && (
          <p className="-mt-2 rounded-ctl bg-brand-soft px-4 py-2.5 text-xs leading-6 text-brand">
            管理模式：按住 <b>⠿</b> 可以把分类上下拖动换位；点 <b>✏️</b> 给分类改名；点{' '}
            <b>➕</b> 往这个类里加自己的加减分项；自己加的项右上角有 <b>✕</b> 可以删掉；整个自建分类不要了，点{' '}
            <b>🗑</b>。
          </p>
        )}

        {manage && editing === 'new' && (
          <CatEditor
            title="新增一个大类"
            initName=""
            initEmoji={CAT_EMOJI_CHOICES[0]}
            onSave={createCat}
            onCancel={() => setEditing(null)}
          />
        )}

        {manage && editing !== 'new' && (
          <button
            onClick={() => setEditing('new')}
            aria-label="新增大类"
            className="tap flex min-h-[48px] items-center justify-center gap-2 rounded-card border border-dashed border-brand/50 bg-white text-sm font-bold text-brand"
          >
            <span aria-hidden className="text-base">
              ＋
            </span>
            新增一个大类
          </button>
        )}

        {ordered.map((cat, idx) => {
          const open = !!openCats[cat.id]
          const mine = custom.filter((it) => it.catId === cat.id)
          const count = cat.rewards.length + cat.penalties.length + mine.length
          const picked =
            [...cat.rewards, ...cat.penalties].filter((it) => it.name in selected).length +
            mine.filter((it) => it.name in selected).length
          const isDragging = drag?.id === cat.id
          let style: CSSProperties | undefined
          let wrapCls = `card overflow-hidden ${dragging === cat.id ? 'shadow-pop ring-2 ring-brand/40' : ''}`
          if (drag) {
            if (isDragging) {
              // 跟着手指浮起来的那张：微微放大 + 半透 + 大投影
              style = {
                position: 'relative',
                zIndex: 50,
                transform: `translateY(${drag.dy}px) scale(1.025)`,
                opacity: 0.94,
                boxShadow: '0 24px 56px rgba(67,49,111,.28)',
                transition: 'none',
                cursor: 'grabbing',
              }
              wrapCls = 'card overflow-hidden select-none shadow-drag ring-2 ring-brand/50'
            } else {
              // 被挤开的卡片滑走让位
              let shift = 0
              if (drag.from < drag.to && idx > drag.from && idx <= drag.to) shift = -(drag.h + drag.gap)
              else if (drag.from > drag.to && idx >= drag.to && idx < drag.from) shift = drag.h + drag.gap
              if (shift)
                style = {
                  transform: `translateY(${shift}px)`,
                  transition: 'transform 180ms cubic-bezier(.22,.61,.36,1)',
                }
            }
          }
          return (
            <section
              key={cat.id}
              ref={(el) => {
                sectionRefs.current[cat.id] = el
              }}
              style={style}
              className={wrapCls}
            >
              {manage && editing === cat.id ? (
                <div className="p-3 tb:p-4">
                  <CatEditor
                    title={`给「${cat.name}」改个名字`}
                    initName={cat.name}
                    initEmoji={cat.emoji}
                    onSave={(name, emoji) => {
                      renameCat(cat.id, name)
                      if (!cat.builtin) setEmojiForUserCat(cat.id, emoji)
                    }}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              ) : (
                <div className="flex min-h-[56px] items-center gap-2 px-4 py-3 tb:gap-3 tb:px-5">
                  {manage && (
                    <span
                      onPointerDown={onHandleDown(cat.id)}
                      onPointerMove={onHandleMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      aria-label={`拖动排序 ${cat.name}`}
                      role="button"
                      className={`flex h-11 w-8 shrink-0 touch-none select-none items-center justify-center rounded-ctl text-lg transition-colors duration-150 ${
                        isDragging
                          ? 'cursor-grabbing bg-brand text-white'
                          : 'cursor-grab bg-canvas text-mut active:bg-brand-soft active:text-brand'
                      }`}
                    >
                      ⠿
                    </span>
                  )}
                  <button
                    onClick={() => setOpenCats((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
                    aria-expanded={open}
                    className="tap flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {catIcon(cat).src ? (
                      <img src={catIcon(cat).src} alt="" aria-hidden className="h-7 w-7 object-contain" />
                    ) : (
                      <span aria-hidden className="flex h-7 w-7 items-center justify-center text-2xl">
                        {catIcon(cat).emoji}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 text-lg font-bold">{cat.name}</span>
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
                  {manage && (
                    <>
                      <button
                        onClick={() => setEditing(cat.id)}
                        aria-label={`给${cat.name}改名`}
                        title={`给${cat.name}改名`}
                        className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas text-base text-mut"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => {
                          setOpenCats((p) => ({ ...p, [cat.id]: true }))
                          setAdding((cur) => (cur === cat.id ? null : cat.id))
                        }}
                        aria-label={`给${cat.name}加一项`}
                        title={`给${cat.name}加一项`}
                        className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xl font-bold text-brand"
                      >
                        ＋
                      </button>
                      {!cat.builtin && (
                        <button
                          onClick={() => deleteCat(cat)}
                          aria-label={`删除大类 ${cat.name}`}
                          title={`删除大类 ${cat.name}`}
                          className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas text-base text-mut"
                        >
                          🗑
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

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

                  {count === 0 && adding !== cat.id && (
                    <p className="mt-3 rounded-ctl bg-canvas px-4 py-3 text-sm leading-6 text-mut">
                      这个大类还是空的，点标题右边的 <b>＋</b> 加第一条吧。
                    </p>
                  )}

                  {mine.length > 0 && (
                    <>
                      <div className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-bold text-brand">
                        我加的 {manage && <span className="font-normal text-mut">（点右上角 ✕ 删掉）</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
                        {mine.map((it) => (
                          <ItemChip
                            key={it.id}
                            name={it.name}
                            delta={it.delta}
                            selected={it.name in selected}
                            onClick={() => toggle(it.name, it.delta)}
                            onDelete={
                              manage
                                ? () => {
                                    if (!window.confirm(`删掉「${it.name}」？已经记过的分不会变。`)) return
                                    setCustom(removeCustomRule(it.id))
                                    removeCustom(it.name)
                                  }
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {adding === cat.id && (
                    <CategoryAdd
                      catName={cat.name}
                      onCancel={() => setAdding(null)}
                      onAdd={(name, delta) => {
                        setCustom(addCustomRule(cat.id, name, delta))
                        setAdding(null)
                      }}
                    />
                  )}
                </div>
              )}
            </section>
          )
        })}

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
                    onClick={() => toggle(e.name, e.delta)}
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
