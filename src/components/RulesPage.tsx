import { useState } from 'react'
import { REDEEM_RULE_TEXT, REDEEM_TIERS } from '../data/rules'
import { loadCustomRules } from '../lib/customRules'
import { buildCategories, catIcon } from '../lib/cats'
import SettingsCard from './SettingsCard'

/**
 * 规则手风琴（RuleAccordion）
 * 展开/折叠只影响显示，不改变任何规则与分值；默认全部展开（规则页的目的就是查规则）。
 */
interface Props {
  onToast: (text: string) => void
  onCheckUpdate: () => void
  checking: boolean
}

export default function RulesPage({ onToast, onCheckUpdate, checking }: Props) {
  /** 内置大类 + 家长自己新建/改名的，跟打分页看到的一致 */
  const [cats] = useState(buildCategories)
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(buildCategories().map((c) => [c.id, true])),
  )
  const [openTiers, setOpenTiers] = useState(true)
  const [custom] = useState(loadCustomRules)

  const toggle = (id: string) => setOpen((p) => ({ ...p, [id]: !p[id] }))
  const allOpen = cats.every((c) => open[c.id])

  return (
    <div className="grid items-start gap-5 tb:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        {/* 一键展开/收起 */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-mut">共 {cats.length} 类规则</span>
          <button
            onClick={() => setOpen(Object.fromEntries(cats.map((c) => [c.id, !allOpen])))}
            className="tap flex min-h-[44px] items-center gap-1.5 rounded-ctl px-3 text-sm font-bold text-brand hover:bg-brand-soft"
          >
            <span aria-hidden>{allOpen ? '▴' : '▾'}</span>
            {allOpen ? '全部收起' : '全部展开'}
          </button>
        </div>

        {cats.map((cat) => {
          const isOpen = !!open[cat.id]
          /** 家长自己往这个类里加的项目（打分页「管理」里加的） */
          const mine = custom.filter((it) => it.catId === cat.id)
          return (
            <section key={cat.id} className="card overflow-hidden">
              <button
                onClick={() => toggle(cat.id)}
                aria-expanded={isOpen}
                className="tap flex min-h-[56px] w-full items-center gap-3 px-5 py-3 text-left"
              >
                {catIcon(cat).src ? (
                  <img src={catIcon(cat).src} alt="" aria-hidden className="h-7 w-7 object-contain" />
                ) : (
                  <span aria-hidden className="flex h-7 w-7 items-center justify-center text-2xl">
                    {catIcon(cat).emoji}
                  </span>
                )}
                <span className="flex-1 text-lg font-bold">{cat.name}</span>
                <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs text-mut">
                  奖 {cat.rewards.length} · 罚 {cat.penalties.length}
                </span>
                <span
                  aria-hidden
                  className={`text-mut transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                >
                  ▾
                </span>
              </button>

              {isOpen && (
                <div className="grid grid-cols-1 gap-6 border-t border-line px-5 py-4 md:grid-cols-2">
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
                    {mine.length > 0 && (
                      <div className="mt-4 rounded-ctl bg-brand-soft px-3.5 py-3">
                        <div className="mb-1.5 text-xs font-bold text-brand">我加的</div>
                        <div className="space-y-1.5">
                          {mine.map((it) => (
                            <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
                              <span className="min-w-0 text-ink/85">{it.name}</span>
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                                  it.delta > 0 ? 'bg-rosy text-posdeep' : 'bg-mint text-negdeep'
                                }`}
                              >
                                {it.delta > 0 ? `+${it.delta}` : it.delta}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {cat.rewards.length + cat.penalties.length + mine.length === 0 && (
                      <p className="mt-3 rounded-ctl bg-canvas px-3.5 py-3 text-sm text-mut">
                        这个类还没有项目，去「打分」页点「管理」给它加一条吧。
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>
          )
        })}

        <section className="card overflow-hidden">
          <button
            onClick={() => setOpenTiers((v) => !v)}
            aria-expanded={openTiers}
            className="tap flex min-h-[56px] w-full items-center gap-3 px-5 py-3 text-left"
          >
            <img src="/ui/mascot-gift.webp" alt="" aria-hidden className="h-7 w-7 object-contain" />
            <span className="flex-1 text-lg font-bold">🎁 积分兑换表</span>
            <span className="rounded-full bg-peach px-2.5 py-0.5 text-xs text-golddeep">
              {REDEEM_TIERS.length} 档
            </span>
            <span
              aria-hidden
              className={`text-mut transition-transform duration-200 ${openTiers ? 'rotate-180' : ''}`}
            >
              ▾
            </span>
          </button>
          {openTiers && (
            <div className="border-t border-line px-5 py-4">
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
            </div>
          )}
        </section>
        {/* 家长锁 + 版本更新 */}
        <SettingsCard onToast={onToast} onCheckUpdate={onCheckUpdate} checking={checking} />
      </div>

      {/* 右栏：阅读星星装饰 + 小结 */}
      <aside className="hidden tb:sticky tb:top-5 tb:block tb:w-[300px]">
        <div className="card relative overflow-hidden p-5 text-center">
          <img
            src="/ui/mascot-reading.webp"
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
