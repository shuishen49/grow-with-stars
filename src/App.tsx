import { useCallback, useEffect, useMemo, useState } from 'react'
import { REDEEM_TIERS } from './data/rules'
import { getStore, isMissingTableError, type DayEntry, type LedgerRow } from './lib/store'
import { sameWeek, todayStr } from './lib/dates'
import ScorePage from './components/ScorePage'
import LogPage from './components/LogPage'
import RedeemPage from './components/RedeemPage'
import RulesPage from './components/RulesPage'
import SetupGuide from './components/SetupGuide'
import SideNav from './components/SideNav'
import AppHeader from './components/AppHeader'
import Toast, { type ToastMsg } from './components/Toast'

export type Tab = 'score' | 'log' | 'redeem' | 'rules'

export default function App() {
  const [demo, setDemo] = useState(
    () =>
      new URLSearchParams(window.location.search).has('demo') ||
      localStorage.getItem('tp_demo') === '1',
  )
  const [rows, setRows] = useState<LedgerRow[] | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('score')
  const [scoreDate, setScoreDate] = useState(todayStr())
  const [toastMsg, setToastMsg] = useState<ToastMsg | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const showToast = useCallback((text: string) => {
    setToastMsg({ text, id: Date.now() })
  }, [])

  const refresh = useCallback(async () => {
    const store = getStore(demo)
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
  }, [demo])

  useEffect(() => {
    refresh()
  }, [refresh])

  const enableDemo = () => {
    localStorage.setItem('tp_demo', '1')
    setDemo(true)
  }

  const exitDemo = () => {
    localStorage.removeItem('tp_demo')
    setDemo(false)
  }

  const balance = useMemo(() => (rows ?? []).reduce((s, r) => s + r.delta, 0), [rows])
  const dayRow = useMemo(
    () => (rows ?? []).find((r) => r.kind === 'score' && r.entry_date === scoreDate),
    [rows, scoreDate],
  )

  const handleSave = async (entries: DayEntry[]) => {
    const store = getStore(demo)
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
    const store = getStore(demo)
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
    const store = getStore(demo)
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
    const store = getStore(demo)
    try {
      await store.deleteRow(row.id)
      await refresh()
      showToast('已撤销兑换，积分已退回')
    } catch (e) {
      showToast('撤销失败：' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const showSetup = dbError !== null && !demo

  const loading = rows === null && !showSetup

  return (
    <div className="min-h-screen">
      {/* 平板骨架：左侧 88px 导航 + 右侧内容，整体限宽居中 */}
      <div className="mx-auto flex max-w-[1280px] items-start gap-5 px-5 py-5 lg:gap-6 lg:px-6">
        <SideNav tab={tab} onChange={setTab} />

        <div className="min-w-0 flex-1">
          <AppHeader
            balance={balance}
            demo={demo}
            refreshing={refreshing}
            onRefresh={refresh}
            onExitDemo={exitDemo}
          />

          {loading ? (
            <div className="card flex h-[50vh] items-center justify-center">
              <div className="text-center text-mut">
                <img src="/ui/mascot-wave.png" alt="" aria-hidden className="mx-auto h-24 animate-bounce object-contain" />
                加载中…
              </div>
            </div>
          ) : showSetup && isMissingTableError(dbError!) ? (
            <SetupGuide error={dbError!} onRetry={refresh} onDemo={enableDemo} />
          ) : showSetup ? (
            <div className="card p-5">
              <h2 className="font-bold text-pos">连接数据库出错</h2>
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

      <Toast msg={toastMsg} />
    </div>
  )
}
