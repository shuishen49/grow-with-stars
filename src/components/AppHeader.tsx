interface Props {
  balance: number
  demo: boolean
  refreshing: boolean
  onRefresh: () => void
  onExitDemo: () => void
}

/** 平板顶栏：勋章 + 标题口号 + 星星吉祥物装饰 + 当前积分徽章 */
export default function AppHeader({ balance, demo, refreshing, onRefresh, onExitDemo }: Props) {
  return (
    <header className="relative mb-5 flex items-center gap-3 pr-2">
      <img src="/ui/brand-medal.png" alt="" aria-hidden className="h-10 w-10 object-contain" />
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold leading-tight text-ink">家庭积分本</h1>
        <p className="text-sm font-medium text-golddeep">好习惯 · 好学习 · 每天进步一点点！</p>
        {demo && (
          <button
            onClick={onExitDemo}
            className="tap mt-1 rounded-full bg-peach px-2.5 py-0.5 text-xs font-medium text-golddeep"
          >
            演示模式（数据存本机）· 点此退出
          </button>
        )}
      </div>

      {/* 吉祥物仅装饰：不参与点击、不挡按钮 */}
      <img
        src="/ui/mascot-books.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -top-7 right-36 hidden h-24 select-none lg:block"
      />

      <div className="ml-auto flex items-center gap-3">
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
        <div className="flex items-center gap-2.5 rounded-card border border-line bg-white px-4 py-2 shadow-card">
          <img src="/ui/nav-score.png" alt="" aria-hidden className="h-8 w-8 object-contain" />
          <div className="text-right">
            <div className="text-xs leading-none text-mut">当前积分</div>
            <div className="text-2xl font-extrabold leading-8 tabular-nums text-brand">{balance}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
