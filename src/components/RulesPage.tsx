import { CATEGORIES, REDEEM_RULE_TEXT, REDEEM_TIERS } from '../data/rules'

/** 分类 id → 素材包图标（与打分页一致） */
const CAT_ICON: Record<string, string> = {
  life: '/ui/category-life.png',
  study: '/ui/category-study.png',
  result: '/ui/category-achievement.png',
  character: '/ui/category-character.png',
}

export default function RulesPage() {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        {CATEGORIES.map((cat) => (
          <section key={cat.id} className="card p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <img src={CAT_ICON[cat.id]} alt="" aria-hidden className="h-7 w-7 object-contain" />
              <h2 className="text-lg font-bold">{cat.name}</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-bold text-posdeep">奖 励</div>
                <div className="space-y-1.5">
                  {cat.rewards.map((it) => (
                    <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 text-ink/85">{it.name}</span>
                      <span className="shrink-0 rounded-full bg-rosy px-2.5 py-0.5 text-xs font-bold tabular-nums text-posdeep">
                        +{it.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-bold text-negdeep">惩 罚</div>
                <div className="space-y-1.5">
                  {cat.penalties.map((it) => (
                    <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 text-ink/85">{it.name}</span>
                      <span className="shrink-0 rounded-full bg-mint px-2.5 py-0.5 text-xs font-bold tabular-nums text-negdeep">
                        -{it.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}

        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2 font-bold">🎁 积分兑换表</div>
          <div className="space-y-2">
            {REDEEM_TIERS.map((t) => (
              <div key={t.points} className="flex gap-3 rounded-ctl bg-canvas px-3.5 py-2.5">
                <div className="w-16 shrink-0 text-base font-extrabold tabular-nums text-brand">
                  {t.points}分
                </div>
                <div className="min-w-0 text-sm leading-6 text-ink/75">{t.options.join('、')}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-ctl bg-peach px-4 py-2.5 text-xs text-golddeep">
            📌 {REDEEM_RULE_TEXT}
          </div>
        </section>
      </div>

      {/* 右栏：阅读星星装饰 + 小结 */}
      <aside className="hidden lg:sticky lg:top-5 lg:block lg:w-[300px]">
        <div className="card relative overflow-hidden p-5 text-center">
          <img
            src="/ui/mascot-reading.png"
            alt=""
            aria-hidden
            className="pointer-events-none mx-auto h-28 select-none object-contain"
          />
          <div className="mt-2 font-bold">规则小提醒</div>
          <p className="mt-1.5 text-xs leading-6 text-mut">
            规则与纸质登记表一致，打分时勾选即可。
            <br />
            好习惯每天攒一点，奖励兑换看得见！
          </p>
        </div>
      </aside>
    </div>
  )
}
