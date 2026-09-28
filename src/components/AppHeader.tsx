import type { SourceMode } from '../lib/store'

interface Props {
  balance: number
  demo: boolean
  mode: SourceMode
  email?: string
  authEnabled: boolean
  refreshing: boolean
  onRefresh: () => void
  /** 打开「关于 / 版本信息」弹窗 */
  onAbout: () => void
  onExitDemo: () => void
  onLogin: () => void
  onLogout: () => void
}

const MODE_TAG: Record<SourceMode, { text: string; cls: string }> = {
  cloud: { text: '已登录 · 云端同步', cls: 'bg-brand-soft text-brand' },
  local: { text: '未登录 · 仅本机', cls: 'bg-canvas text-mut' },
  demo: { text: '演示数据', cls: 'bg-peach text-golddeep' },
}

// 打包时没带 Supabase 地址（云构建缺 VITE_SUPABASE_*）→ 登录按钮压根不会渲染。
// 这种情况要明确说「未配置」，否则会被误以为是登录功能坏了。
const NO_CLOUD_TAG = { text: '未配置云同步 · 仅本机', cls: 'bg-peach text-golddeep' }

/** 平板顶栏：勋章 + 标题口号 + 吉祥物装饰 + 当前积分徽章 + 登录/退出 */
export default function AppHeader({
  balance,
  demo,
  mode,
  email,
  authEnabled,
  refreshing,
  onRefresh,
  onAbout,
  onExitDemo,
  onLogin,
  onLogout,
}: Props) {
  const tag = !authEnabled && mode === 'local' ? NO_CLOUD_TAG : MODE_TAG[mode]

  return (
    <header className="relative mb-5 flex min-h-[72px] items-center gap-3 pr-2">
      <img src="/ui/brand-medal.webp" alt="" aria-hidden className="h-9 w-9 object-contain" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold leading-tight text-ink">家庭积分本</h1>
          <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tag.cls}`}>
            {tag.text}
          </span>
        </div>
        <p className="text-sm font-medium text-golddeep">好习惯 · 好学习 · 每天进步一点点！</p>
        {email && <p className="truncate text-xs text-mut">{email}</p>}
        {demo && (
          <button
            onClick={onExitDemo}
            className="tap mt-1 rounded-full bg-peach px-2.5 py-0.5 text-xs font-medium text-golddeep"
          >
            演示模式（数据存本机）· 点此退出
          </button>
        )}
      </div>

      {/* 右边那颗星（原来的装饰图）现在是「关于 / 版本信息」入口 */}
      <div className="relative z-10 ml-auto flex items-center gap-2 tb:gap-3">
        <button
          onClick={onAbout}
          title="关于 · 版本信息"
          aria-label="关于与版本信息"
          className="tap flex shrink-0 flex-col items-center gap-0.5 rounded-card px-1.5 py-1 hover:bg-white/70"
        >
          <img
            src="/ui/mascot-books.webp"
            alt=""
            aria-hidden
            className="h-11 w-11 select-none object-contain tb:h-14 tb:w-14"
          />
          <span className="text-[10px] font-medium leading-none text-mut">版本</span>
        </button>
        <button
          onClick={onRefresh}
          title="刷新"
          aria-label="刷新数据"
          className={`tap flex h-11 w-11 items-center justify-center rounded-ctl border border-line bg-white text-lg shadow-card ${
            refreshing ? 'animate-spin' : ''
          }`}
        >
          🔄
        </button>

        {authEnabled &&
          (mode === 'cloud' ? (
            <button
              onClick={onLogout}
              className="tap flex h-11 items-center whitespace-nowrap rounded-ctl border border-line bg-white px-3.5 text-sm font-medium text-mut shadow-card hover:text-ink"
            >
              退出登录
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="tap flex h-11 items-center gap-1.5 whitespace-nowrap rounded-ctl border border-brand bg-brand-soft px-3.5 text-sm font-bold text-brand shadow-card"
            >
              🔑 登录同步
            </button>
          ))}

        <div className="flex items-center gap-2.5 rounded-card border border-line bg-white px-4 py-2 shadow-card">
          <img src="/ui/nav-score.webp" alt="" aria-hidden className="h-8 w-8 object-contain" />
          <div className="text-right">
            <div className="text-xs leading-none text-mut">当前积分</div>
            <div className="text-2xl font-extrabold leading-8 tabular-nums text-brand">{balance}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
