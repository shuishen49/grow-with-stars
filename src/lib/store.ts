import { supabase, useMock } from './supabase'
import seedData from '../data/seed.json'

export interface LedgerRow {
  id: number
  entry_date: string
  kind: 'score' | 'redeem'
  detail: string
  delta: number
  created_at?: string
}

export interface DayEntry {
  name: string
  delta: number
}

export interface DataStore {
  mode: 'supabase' | 'mock'
  fetchAll(): Promise<LedgerRow[]>
  /** 保存某日打分记录；entries 为空则删除该日记录 */
  saveDayScore(date: string, entries: DayEntry[]): Promise<void>
  addRedemption(date: string, detail: string, points: number): Promise<void>
  deleteRow(id: number): Promise<void>
}

export function joinDetail(entries: DayEntry[]): string {
  return entries.map((e) => `${e.name}${e.delta < 0 ? '' : '+'}${e.delta}`).join('、')
}

/** 解析明细字符串（如 "晨读+1、听默写-1"）为条目列表 */
export function parseDetail(detail: string): DayEntry[] {
  return detail
    .split(/[、，,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(.+?)\s*([+-]\d+)分?$/)
      if (m) return { name: m[1].trim(), delta: parseInt(m[2], 10) }
      return { name: s, delta: 0 }
    })
}

class SupabaseStore implements DataStore {
  mode = 'supabase' as const

  private db() {
    if (!supabase) throw new Error('Supabase 未配置')
    return supabase
  }

  async fetchAll(): Promise<LedgerRow[]> {
    const { data, error } = await this.db()
      .from('ledger')
      .select('id,entry_date,kind,detail,delta,created_at')
      .order('entry_date')
      .order('id')
    if (error) throw new Error(error.message)
    return (data ?? []) as LedgerRow[]
  }

  async saveDayScore(date: string, entries: DayEntry[]): Promise<void> {
    const db = this.db()
    if (entries.length === 0) {
      const { error } = await db.from('ledger').delete().eq('entry_date', date).eq('kind', 'score')
      if (error) throw new Error(error.message)
      return
    }
    const row = {
      entry_date: date,
      kind: 'score' as const,
      detail: joinDetail(entries),
      delta: entries.reduce((s, e) => s + e.delta, 0),
    }
    const { error } = await db.from('ledger').upsert(row, { onConflict: 'entry_date,kind' })
    if (error) throw new Error(error.message)
  }

  async addRedemption(date: string, detail: string, points: number): Promise<void> {
    const row = { entry_date: date, kind: 'redeem' as const, detail: `兑换：${detail}`, delta: -points }
    const { error } = await this.db().from('ledger').upsert(row, { onConflict: 'entry_date,kind' })
    if (error) throw new Error(error.message)
  }

  async deleteRow(id: number): Promise<void> {
    const { error } = await this.db().from('ledger').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}

const LS_KEY = 'tp_mock_ledger'

function seedRows(): LedgerRow[] {
  return (seedData.rows as { date: string; detail: string; delta: number }[]).map((r, i) => ({
    id: i + 1,
    entry_date: r.date,
    kind: 'score' as const,
    detail: r.detail,
    delta: r.delta,
    created_at: `${r.date}T08:00:00Z`,
  }))
}

class MockStore implements DataStore {
  mode = 'mock' as const

  private load(): LedgerRow[] {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      const rows = seedRows()
      localStorage.setItem(LS_KEY, JSON.stringify(rows))
      return rows
    }
    return JSON.parse(raw) as LedgerRow[]
  }

  private save(rows: LedgerRow[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(rows))
  }

  async fetchAll(): Promise<LedgerRow[]> {
    await new Promise((res) => setTimeout(res, 120))
    return this.load().sort((a, b) =>
      a.entry_date === b.entry_date ? a.id - b.id : a.entry_date < b.entry_date ? -1 : 1,
    )
  }

  async saveDayScore(date: string, entries: DayEntry[]): Promise<void> {
    const rows = this.load().filter((r) => !(r.entry_date === date && r.kind === 'score'))
    if (entries.length > 0) {
      const maxId = rows.reduce((m, r) => Math.max(m, r.id), 0)
      rows.push({
        id: maxId + 1,
        entry_date: date,
        kind: 'score',
        detail: joinDetail(entries),
        delta: entries.reduce((s, e) => s + e.delta, 0),
      })
    }
    this.save(rows)
  }

  async addRedemption(date: string, detail: string, points: number): Promise<void> {
    const rows = this.load().filter((r) => !(r.entry_date === date && r.kind === 'redeem'))
    const maxId = rows.reduce((m, r) => Math.max(m, r.id), 0)
    rows.push({ id: maxId + 1, entry_date: date, kind: 'redeem', detail: `兑换：${detail}`, delta: -points })
    this.save(rows)
  }

  async deleteRow(id: number): Promise<void> {
    this.save(this.load().filter((r) => r.id !== id))
  }
}

export function getStore(demo: boolean): DataStore {
  return demo || useMock || !supabase ? new MockStore() : new SupabaseStore()
}

export function isMissingTableError(msg: string): boolean {
  return /PGRST205|42P01|Could not find the table|does not exist in the schema cache/i.test(msg)
}
