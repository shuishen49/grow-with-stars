import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { REDEEM_TIERS } from './data/rules'
import {
  countLocalRows,
  getStore,
  isMissingTableError,
  uploadLocalRows,
  type DayEntry,
  type LedgerRow,
  type SourceMode,
} from './lib/store'
import { sameWeek, todayStr } from './lib/dates'
import { getSession, onAuthChange, signOut } from './lib/auth'
import { supabaseConfigured, useMock } from './lib/supabase'
import AuthPage from './components/AuthPage'
import ScorePage from './components/ScorePage'
import LogPage from './components/LogPage'
import RedeemPage from './components/RedeemPage'
import RulesPage from './components/RulesPage'
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
  /** 登录后询问是否上传本机记录 */
  const [mergeAsk, setMergeAsk] = useState(false)
  const [mergeBusy, setMergeBusy] = useState(false)
  const [mergeDone, setMergeDone] = useState(false)
  const [localCount, setLocalCount] = useState(0)

  const [rows, setRows] = useState<LedgerRow[] | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('score')
  const [scoreDate, setScoreDate] = useState(todayStr())
  const [toastMsg, setToastMsg] = useState<ToastMsg | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const authEnabled = supabaseConfigured && !useMock
  /** 演示 → 云端（已登录）→ 本机（未登录也能用） */
  const mode: SourceMode = demo ? 'demo' : session ? 'cloud' : 'local'

  const showToast = useCallback((text: string) => {
    setToastMsg({ text, id: Date.now() })
  }, [])

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

  // 刚登录且本机有记录 → 询问是否上传合并
  useEffect(() => {
    if (!session || demo || mergeDone) return
    const n = countLocalRows()
    if (n === 0) return
    setLocalCount(n)
    setMergeAsk(true)
  }, [session, demo, mergeDone])

  const enableDemo = () => {
    localStorage.setItem('tp_demo', '1')
    setDemo(true)
    setShowAuth(false)
  }

  const exitDemo = () => {
    localStorage.removeItem('tp_demo')
    setDemo(false)
  }

  const handleLogout = async () => {
    if (!window.confirm('确定退出登录吗？退出后本机仍可继续记账（不同步到云端）。')) return
    await signOut()
    setSession(null)
    setShowAuth(false)
    setMergeDone(false)
    showToast('已退出登录，现在用本机数据')
  }

  const doMerge = async () => {
    setMergeBusy(true)
    try {
      const n = await uploadLocalRows()
      setMergeDone(true)
      setMergeAsk(false)
      await refresh()
      showToast(`已把本机 ${n} 条记录同步到云端`)
    } catch (e) {
      showToast('同步失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setMergeBusy(false)
    }
  }

  const balance = useMemo(() => (rows ?? []).reduce((s, r) => s + r.delta, 0), [rows])
  const dayRow = useMemo(
    () => (rows ?? []).find((r) => r.kind === 'score' && r.entry_date === scoreDate),
    [rows, scoreDate],
  )

  const handleSave = async (entries: DayEntry[]) => {
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
            onExitDemo={exitDemo}
            onLogin={() => setShowAuth(true)}
            onLogout={handleLogout}
          />

          {loading ? (
            <div className="card flex h-[50vh] items-center justify-center">
              <div className="text-center text-mut">
                <img
                  src="/ui/mascot-wave.png"
                  alt=""
                  aria-hidden
                  className="mx-auto h-24 animate-bounce object-contain"
                />
                加载中…
              </div>
            </div>
          ) : showAuth && !demo ? (
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
              {tab === 'rules' && <RulesPage />}
            </main>
          ) : null}
        </div>
      </div>

      {/* 登录后询问：把本机记录上传合并到云端 */}
      <Modal open={mergeAsk} onClose={() => setMergeAsk(false)} title="同步本机记录">
        <p className="text-sm leading-6 text-ink/80">
          检测到这台设备上还有 <b className="text-brand">{localCount}</b> 条未登录时记录的数据。
          要同步到云端吗？同步后换设备登录也能看到。
        </p>
        <p className="mt-2 rounded-ctl bg-canvas px-4 py-3 text-xs leading-6 text-mut">
          同一天云端已有记录时，以这台设备的数据为准覆盖；其他日期的记录会保留。
        </p>
        <button
          onClick={doMerge}
          disabled={mergeBusy}
          className="btn-primary mt-3 flex min-h-[48px] w-full items-center justify-center text-base disabled:opacity-40"
        >
          {mergeBusy ? '同步中…' : '一键上传合并'}
        </button>
        <button
          onClick={() => {
            setMergeDone(true)
            setMergeAsk(false)
          }}
          disabled={mergeBusy}
          className="tap mt-2 flex min-h-[44px] w-full items-center justify-center rounded-ctl bg-canvas text-sm font-medium text-mut hover:text-ink"
        >
          暂不，先只看云端数据
        </button>
      </Modal>

      <Toast msg={toastMsg} />
    </div>
  )
}
