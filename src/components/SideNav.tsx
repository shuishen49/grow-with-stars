import type { Tab } from '../App'

/** 左侧导航图标（平板 UI 素材包 assets/，见 public/ui/） */
const NAV: { id: Tab; icon: string; label: string }[] = [
  { id: 'score', icon: '/ui/nav-score.webp', label: '打分' },
  { id: 'log', icon: '/ui/nav-record.webp', label: '记录' },
  { id: 'redeem', icon: '/ui/nav-redeem.webp', label: '兑换' },
  { id: 'rules', icon: '/ui/nav-rules.webp', label: '规则' },
]

/** 平板左侧导航：选中项紫色底白字（参考图样式） */
export default function SideNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      aria-label="主导航"
      className="sticky top-6 flex w-[72px] shrink-0 flex-col gap-2 self-start tb:w-[88px]"
    >
      {NAV.map((n) => {
        const active = tab === n.id
        return (
          <button
            key={n.id}
            onClick={() => onChange(n.id)}
            aria-current={active ? 'page' : undefined}
            className={`tap flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-card px-1 py-2.5 text-[15px] font-bold transition-colors ${
              active
                ? 'bg-gradient-to-br from-[#9274FF] to-brand-dark text-white shadow-card'
                : 'text-mut hover:bg-white hover:text-ink'
            }`}
          >
            <img src={n.icon} alt="" aria-hidden className="h-8 w-8 object-contain" />
            {n.label}
          </button>
        )
      })}
    </nav>
  )
}
