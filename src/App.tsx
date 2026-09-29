import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { REDEEM_TIERS } from './data/rules'
import {
  getStore,
  isMissingTableError,
  mergeRowsIntoCloud,
  readLocalRows,
  replaceCloudRows,
  rowsSignature,
  sumPoints,
  writeLocalRows,
  type DayEntry,
  type LedgerRow,
  type SourceMode,
} from './lib/store'
import { sameWeek, todayStr } from './lib/dates'
import { getSession, isAuthDeadError, onAuthChange, sessionState, signOut } from './lib/auth'
import { supabaseConfigured, useMock } from './lib/supabase'
import { requireParent } from './lib/parentLock'
import {
  applyHotUpdate,
  checkForUpdate,
  markBundleReady,
  takePendingNotes,
  type HotUpdateInfo,
} from './lib/hotUpdate'
import AuthPage from './components/AuthPage'
import ScorePage from './components/ScorePage'
import LogPage from './components/LogPage'
import RedeemPage from './components/RedeemPage'
import RulesPage from './components/RulesPage'
import AboutModal from './components/AboutModal'
import UpdateModal from './components/UpdateModal'
import SetupGuide from './components/SetupGuide'
import SideNav from './components/SideNav'
import AppHeader from './components/AppHeader'
import Modal from './components/Modal'
import Toast, { type ToastMsg } from './components/Toast'

export type Tab = 'score' | 'log' | 'redeem' | 'rules'

export default function App() {
  const [demo, setDemo] = useState(
    () =>
      new URLSearchParams(window.location.search).has('demo') ||
      localStorage.getItem('tp_demo') === '1',
  )
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  /** 主动打开登录页（不登录也能用，所以登录页不是首屏） */
  const [showAuth, setShowAuth] = useState(false)
  /**
   * 登录后两边的账不一致时，弹窗让家长自己选「以哪边为准」。
   * 默认立场是云端（登录后以云端为准），但绝不会偷偷覆盖本机数据。
   */
  const [syncChoice, setSyncChoice] = useState<{ cloud: LedgerRow[]; local: LedgerRow[] } | null>(
    null,
  )
  const [syncBusy, setSyncBusy] = useState(false)
  /** 本次登录已经处理过同步，别反复弹窗 */
  const [syncChecked, setSyncChecked] = useState(false)

  const [rows, setRows] = useState<LedgerRow[] | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('score')
  const [scoreDate, setScoreDate] = useState(todayStr())
  const [toastMsg, setToastMsg] = useState<ToastMsg | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  /** 热更新：待安装的新版本 / 刚装完要展示的更新说明 */
  const [updateInfo, setUpdateInfo] = useState<HotUpdateInfo | null>(null)
  const [installedInfo, setInstalledInfo] = useState<HotUpdateInfo | null>(null)
  const [updateBusy, setUpdateBusy] = useState(false)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  /** 「关于 · 版本信息」弹窗：顶栏那颗星点开的 */
  const [aboutOpen, setAboutOpen] = useState(false)

  const authEnabled = supabaseConfigured && !useMock
  /** 演示 → 云端（已登录）→ 本机（未登录也能用） */
  const mode: SourceMode = demo ? 'demo' : session ? 'cloud' : 'local'

  const showToast = useCallback((text: string) => {
    setToastMsg({ text, id: Date.now() })
  }, [])

  /**
   * 家长锁守门：会改数据的操作（打分保存/清空、兑换、撤销）先验证一次。
   * 没开家长锁时 requireParent 直接放行，日常使用完全不受影响。
   */
  const guard = useCallback(
    async (action: string): Promise<boolean> => {
      const r = await requireParent(action)
      if (!r.ok) {
        showToast(r.msg ?? '验证失败，没有改动')
        return false
      }
      return true
    },
    [showToast],
  )

  // 启动后：报平安（否则新包会被回滚）+ 自动检查一次更新
  useEffect(() => {
    markBundleReady()
    // 刚热更新完 → 弹一次「本次更新了什么」
    const done = takePendingNotes()
    if (done) {
      setInstalledInfo(done)
      return
    }
    let alive = true
    checkForUpdate()
      .then((info) => {
        if (alive && info) setUpdateInfo(info)
      })
      .catch(() => {
        // 启动时的自动检查失败就算了（可能断网），别打扰使用；
        // 用户手动点「检查更新」时才把具体原因报出来
      })
    return () => {
      alive = false
    }
  }, [])

  const handleCheckUpdate = useCallback(async () => {
    setCheckingUpdate(true)
    try {
      const info = await checkForUpdate()
      if (info) {
        setUpdateInfo(info)
      } else {
        showToast('已经是最新版本了 🎉')
      }
    } catch (e) {
      showToast('检查更新失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setCheckingUpdate(false)
    }
  }, [showToast])

  /** 「关于」弹窗里的检查更新：发现有版本时把弹窗让给更新提示，避免两层叠着 */
  const handleCheckUpdateFromAbout = useCallback(async () => {
    setCheckingUpdate(true)
    try {
      const info = await checkForUpdate()
      if (info) {
        setAboutOpen(false)
        setUpdateInfo(info)
      } else {
        showToast('已经是最新版本了 🎉')
      }
    } catch (e) {
      showToast('检查更新失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setCheckingUpdate(false)
    }
  }, [showToast])

  const handleApplyUpdate = useCallback(async () => {
    if (!updateInfo) return
    setUpdateBusy(true)
    try {
      // 注意：这一步成功后 App 会立刻重启，后面的代码不会执行
      await applyHotUpdate(updateInfo)
    } catch (e) {
      setUpdateBusy(false)
      showToast('更新失败：' + (e instanceof Error ? e.message : String(e)))
    }
  }, [updateInfo, showToast])

  // 读取 / 监听登录状态
  useEffect(() => {
    if (!authEnabled) {
      setAuthReady(true)
      return
    }
    let alive = true
    getSession().then((s) => {
      if (!alive) return
      setSession(s)
      setAuthReady(true)
    })
    const un = onAuthChange((s) => {
      setSession(s)
      setAuthReady(true)
    })
    return () => {
      alive = false
      un()
    }
  }, [authEnabled])

  const refresh = useCallback(async () => {
    const store = getStore(mode)
    setRefreshing(true)
    try {
      const r = await store.fetchAll()
      setRows(r)
      setDbError(null)
    } catch (e) {
      setDbError(e instanceof Error ? e.message : String(e))
    } finally {
      setRefreshing(false)
    }
  }, [mode])

  useEffect(() => {
    if (!authReady) return
    refresh()
  }, [refresh, authReady])

  /**
   * 强制退回本机模式。用在登录凭据失效（账号被删、密码改了等）的场合：
   * 不退出来的话，云端查询只会安静地返回空，界面就一直卡在「假登录」里。
   */
  const forceSignOut = useCallback(
    async (msg: string) => {
      try {
        await signOut()
      } catch {
        /* 就算服务器联系不上，也要把本地状态清掉 */
      }
      setSession(null)
      setShowAuth(false)
      setSyncChecked(true)
      setSyncChoice(null)
      showToast(msg)
    },
    [showToast],
  )

  /**
   * 登录后同步策略：默认以云端为准。
   * 只有当这台设备上确实另有记录、而且和云端不一样时，才弹窗让家长自己选。
   */
  useEffect(() => {
    if (!session || demo || syncChecked || syncChoice) return
    let alive = true
    void (async () => {
      // 先验登录是不是真的还活着。账号被删后 session 仍在本地，云端查询
      // 不报错只会返回 0 条 —— 直接比下去会误判成「云端是空的」。
      const st = await sessionState()
      if (!alive) return
      if (st === 'dead') {
        await forceSignOut('登录已失效（账号可能被删除或密码改了），已自动退出。这台设备上的数据都还在。')
        return
      }
      const local = readLocalRows()
      if (local.length === 0) {
        // 本机本来就空的：没什么可选的，直接用云端
        setSyncChecked(true)
        return
      }
      let cloud: LedgerRow[]
      try {
        cloud = await getStore('cloud').fetchAll()
      } catch {
        // 云端读不出来时交给页面上的错误提示，这里不弹窗
        return
      }
      if (!alive) return
      if (rowsSignature(local) === rowsSignature(cloud)) {
        // 两边一模一样：以云端为准，顺手让本机保持同一份
        writeLocalRows(cloud)
        setSyncChecked(true)
        return
      }
      setSyncChoice({ cloud, local })
    })()
    return () => {
      alive = false
    }
  }, [session, demo, syncChecked, syncChoice, forceSignOut])

  const enableDemo = () => {
    localStorage.setItem('tp_demo', '1')
    setDemo(true)
    setShowAuth(false)
  }

  /**
   * 顶栏「登录同步」。
   * 演示模式下必须先退出演示：否则 mode 恒为 'demo'，登录页不会显示，
   * 就算登录成功了也还是用演示数据（demo 优先级高于 session）。
   */
  const handleLoginClick = () => {
    if (demo) {
      localStorage.removeItem('tp_demo')
      setDemo(false)
    }
    setShowAuth(true)
  }

  const exitDemo = () => {
    localStorage.removeItem('tp_demo')
    setDemo(false)
  }

  const handleLogout = async () => {
    const ok = window.confirm(
      '确定退出登录吗？\n\n退出只是「不再和云端同步」：这台设备上现在看到的积分和记录会原样留着，照样能打分、看日历、兑换。\n以后再登录时，如果两边不一样，会让你自己选以哪边为准。',
    )
    if (!ok) return
    // 关键：退出前把当前这份数据留在本机，不然退出后积分会变成 0
    if (rows && rows.length > 0) writeLocalRows(rows)
    await signOut()
    setSession(null)
    setShowAuth(false)
    setSyncChecked(false)
    showToast('已退出登录：不再同步云端，本机数据照常使用')
  }

  /** 家长在弹窗里选了以哪边为准 */
  const applySyncChoice = async (which: 'cloud' | 'local' | 'merge') => {
    if (!syncChoice) return
    setSyncBusy(true)
    try {
      if (which === 'cloud') {
        writeLocalRows(syncChoice.cloud)
        showToast('已按云端数据为准，这台设备同步成同一份')
      } else if (which === 'local') {
        await replaceCloudRows(syncChoice.local)
        writeLocalRows(syncChoice.local)
        showToast('已按这台设备的数据为准，云端已同步')
      } else {
        const merged = await mergeRowsIntoCloud(syncChoice.local)
        writeLocalRows(merged)
        showToast(`两边都留下了，合并后共 ${merged.length} 条`)
      }
      setSyncChecked(true)
      setSyncChoice(null)
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (isAuthDeadError(msg)) {
        // 凭据失效：退回本机模式，别让家长反复点反复失败
        await forceSignOut('登录已失效，已自动退出。你的数据都还在这台设备上，重新登录后再同步。')
      } else {
        showToast('同步失败：' + msg)
      }
    } finally {
      setSyncBusy(false)
    }
  }

  const balance = useMemo(() => (rows ?? []).reduce((s, r) => s + r.delta, 0), [rows])
  const dayRow = useMemo(
    () => (rows ?? []).find((r) => r.kind === 'score' && r.entry_date === scoreDate),
    [rows, scoreDate],
  )

  const handleSave = async (entries: DayEntry[]) => {
    if (!(await guard('保存打分'))) return
    const store = getStore(mode)
    const oldBalance = balance
    const oldDayDelta = dayRow?.delta ?? 0
    try {
      await store.saveDayScore(scoreDate, entries)
      await refresh()
      const newBalance = oldBalance - oldDayDelta + entries.reduce((s, e) => s + e.delta, 0)
      const newlyReachable = REDEEM_TIERS.filter((t) => t.points > oldBalance && t.points <= newBalance)
      const hint = newlyReachable.length > 0 ? `，已达 ${newlyReachable[0].points} 分可以兑换奖励啦🎁` : ''
      showToast(`已保存 ${scoreDate}，当前积分 ${newBalance}${hint}`)
    } catch (e) {
      showToast('保存失败：' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const handleClear = async () => {
    if (!(await guard('清空当天记录'))) return
    const store = getStore(mode)
    try {
      await store.saveDayScore(scoreDate, [])
      await refresh()
      showToast(`已清空 ${scoreDate} 的记录`)
    } catch (e) {
      showToast('操作失败：' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const handleRedeem = async (detail: string, points: number): Promise<boolean> => {
    if (!(await guard('兑换奖励'))) return false
    const today = todayStr()
    const weekUsed = (rows ?? []).some((r) => r.kind === 'redeem' && sameWeek(r.entry_date, today))
    if (weekUsed) {
      showToast('本周已兑换过，下周再来吧')
      return false
    }
    if (balance < points) {
      showToast('积分不足，先攒攒吧')
      return false
    }
    const store = getStore(mode)
    try {
      await store.addRedemption(today, detail, points)
      await refresh()
      showToast(`兑换成功 -${points} 分，剩余 ${balance - points} 分`)
      return true
    } catch (e) {
      showToast('兑换失败：' + (e instanceof Error ? e.message : String(e)))
      return false
    }
  }

  const handleUndo = async (row: LedgerRow) => {
    if (!(await guard('撤销兑换'))) return
    const store = getStore(mode)
    try {
      await store.deleteRow(row.id)
      await refresh()
      showToast('已撤销兑换，积分已退回')
    } catch (e) {
      showToast('撤销失败：' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const showSetup = dbError !== null && !demo && mode === 'cloud'
  const loading = (rows === null && !showSetup) || !authReady

  return (
    <div className="min-h-screen">
      {/* 平板骨架：左侧导航 + 右侧内容。素材包建议：外边距 24、导航与正文间距 24、整体限宽 1280 */}
      <div className="mx-auto flex max-w-[1280px] items-start gap-5 px-5 py-5 tb:gap-6 tb:px-6">
        <SideNav tab={tab} onChange={setTab} />

        <div className="min-w-0 flex-1">
          <AppHeader
            balance={balance}
            demo={demo}
            mode={mode}
            email={session?.user?.email}
            authEnabled={authEnabled}
            refreshing={refreshing}
            onRefresh={refresh}
            onAbout={() => setAboutOpen(true)}
            onExitDemo={exitDemo}
            onLogin={handleLoginClick}
            onLogout={handleLogout}
          />

          {loading ? (
            <div className="card flex h-[50vh] items-center justify-center">
              <div className="text-center text-mut">
                <img
                  src="/ui/mascot-wave.webp"
                  alt=""
                  aria-hidden
                  className="mx-auto h-24 animate-bounce object-contain"
                />
                加载中…
              </div>
            </div>
          ) : showAuth ? (
            <AuthPage
              onSignedIn={() => setShowAuth(false)}
              onStayLocal={() => setShowAuth(false)}
              onDemo={enableDemo}
            />
          ) : showSetup && isMissingTableError(dbError!) ? (
            <SetupGuide error={dbError!} onRetry={refresh} onDemo={enableDemo} />
          ) : showSetup ? (
            <div className="card p-5">
              <h2 className="font-bold text-pos">读取云端数据出错</h2>
              <p className="mt-2 break-all text-sm text-mut">{dbError}</p>
              <button onClick={refresh} className="btn-primary mt-4 px-5 py-3">
                🔄 重试
              </button>
            </div>
          ) : rows !== null ? (
            <main className="pb-6">
              {tab === 'score' && (
                <ScorePage
                  date={scoreDate}
                  onDateChange={setScoreDate}
                  dayRow={dayRow}
                  onSave={handleSave}
                  onClear={handleClear}
                  guard={guard}
                />
              )}
              {tab === 'log' && (
                <LogPage
                  rows={rows}
                  onPickDate={(d) => {
                    setScoreDate(d)
                    setTab('score')
                  }}
                />
              )}
              {tab === 'redeem' && (
                <RedeemPage rows={rows} balance={balance} onRedeem={handleRedeem} onUndo={handleUndo} />
              )}
              {tab === 'rules' && (
                <RulesPage
                  onToast={showToast}
                  onCheckUpdate={handleCheckUpdate}
                  checking={checkingUpdate}
                />
              )}
            </main>
          ) : null}
        </div>
      </div>

      {/* 登录后：本机和云端账不一致 → 让家长自己选以哪边为准 */}
      <Modal
        open={syncChoice !== null}
        onClose={() => {
          // 关掉 = 「先只看云端」，这次登录不再弹。
          // 之前关掉后 effect 又重新跑一遍，弹窗立刻原地复活，像死循环。
          setSyncChecked(true)
          setSyncChoice(null)
        }}
        title="两边的数据不一样"
      >
        {syncChoice && (
          <>
            <p className="text-sm leading-6 text-ink/80">
              这台设备和云端账号里的积分对不上，想以哪边为准？
              {syncChoice.cloud.length === 0 ? (
                <>
                  云端这个账号还是空的，<b className="text-ink">建议用这台设备的数据</b>。
                </>
              ) : (
                <>
                  <b className="text-ink">不确定的话选云端更稳妥</b>
                  （它是多设备共享的那一份）。
                </>
              )}
            </p>

            <div className="mt-3 grid gap-2 tb:grid-cols-2">
              <div className="rounded-ctl bg-canvas px-4 py-3">
                <div className="text-xs text-mut">☁️ 云端（{session?.user?.email}）</div>
                <div className="mt-1 text-2xl font-extrabold text-pos">
                  {sumPoints(syncChoice.cloud)}
                  <span className="ml-1 text-sm font-bold text-mut">分</span>
                </div>
                <div className="text-xs text-mut">{syncChoice.cloud.length} 条记录</div>
              </div>
              <div className="rounded-ctl bg-canvas px-4 py-3">
                <div className="text-xs text-mut">📱 这台设备</div>
                <div className="mt-1 text-2xl font-extrabold text-pos">
                  {sumPoints(syncChoice.local)}
                  <span className="ml-1 text-sm font-bold text-mut">分</span>
                </div>
                <div className="text-xs text-mut">{syncChoice.local.length} 条记录</div>
              </div>
            </div>

            {syncChoice.cloud.length === 0 ? (
              <>
                <button
                  onClick={() => applySyncChoice('local')}
                  disabled={syncBusy}
                  className="btn-primary mt-3 flex min-h-[52px] w-full items-center justify-center text-base disabled:opacity-40"
                >
                  📱 用这台设备的数据（推荐）
                </button>
                <button
                  onClick={() => applySyncChoice('cloud')}
                  disabled={syncBusy}
                  className="tap mt-2 flex min-h-[52px] w-full items-center justify-center rounded-ctl border border-line bg-white text-base font-bold text-ink hover:border-brand/40 disabled:opacity-40"
                >
                  ☁️ 用云端的（会从这台设备清掉这些数据）
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => applySyncChoice('cloud')}
                  disabled={syncBusy}
                  className="btn-primary mt-3 flex min-h-[52px] w-full items-center justify-center text-base disabled:opacity-40"
                >
                  ☁️ 用云端的数据（推荐）
                </button>
                <button
                  onClick={() => applySyncChoice('local')}
                  disabled={syncBusy}
                  className="tap mt-2 flex min-h-[52px] w-full items-center justify-center rounded-ctl border border-line bg-white text-base font-bold text-ink hover:border-brand/40 disabled:opacity-40"
                >
                  📱 用这台设备的数据（覆盖云端）
                </button>
              </>
            )}
            <button
              onClick={() => applySyncChoice('merge')}
              disabled={syncBusy}
              className="tap mt-2 flex min-h-[48px] w-full items-center justify-center rounded-ctl bg-brand-soft text-sm font-bold text-brand disabled:opacity-40"
            >
              🔀 两边都留着（合并，同一天以本机为准）
            </button>

            <p className="mt-3 rounded-ctl bg-canvas px-4 py-3 text-xs leading-6 text-mut">
              {syncBusy
                ? '正在同步…'
                : '不管选哪个，另一边的数据都会先显示给你看过；选完可以随时退出登录，退出只是不再同步，不会清空任何一边。'}
            </p>
          </>
        )}
      </Modal>

      {/* 顶栏那颗星：版本信息 + 开发者 + 检查更新 */}
      <AboutModal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        mode={mode}
        email={session?.user?.email}
        checking={checkingUpdate}
        onCheckUpdate={handleCheckUpdateFromAbout}
      />

      {/* 热更新：更新前展示「改了什么」；更新完展示「本次更新内容」 */}
      <UpdateModal
        info={updateInfo}
        busy={updateBusy}
        onConfirm={handleApplyUpdate}
        onLater={() => setUpdateInfo(null)}
      />
      <UpdateModal
        info={installedInfo}
        busy={false}
        installed
        onConfirm={() => setInstalledInfo(null)}
        onLater={() => setInstalledInfo(null)}
      />

      <Toast msg={toastMsg} />
    </div>
  )
}
