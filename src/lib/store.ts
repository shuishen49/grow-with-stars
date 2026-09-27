import { supabase, useMock } from './supabase'
import seedData from '../data/seed.json'

/**
 * 数据来源（三选一）：
 * - 'cloud' 已登录，读写 Supabase，多设备同步
 * - 'local' 未登录，读写浏览器本机 localStorage，单机可用
 * - 'demo'  演示模式，本机 + 内置 9 月示例数据
 */
export type SourceMode = 'cloud' | 'local' | 'demo'

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
  mode: SourceMode
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
  mode = 'cloud' as const

  private db() {
    if (!supabase) throw new Error('Supabase 未配置')
    return supabase
  }

  /** 当前登录用户 id；拿不到就说明会话已失效 */
  private async uid(): Promise<string> {
    const { data } = await supabase!.auth.getUser()
    if (!data.user) throw new Error('登录已失效，请重新登录')
    return data.user.id
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
    const user_id = await this.uid()
    if (entries.length === 0) {
      const { error } = await db
        .from('ledger')
        .delete()
        .eq('user_id', user_id)
        .eq('entry_date', date)
        .eq('kind', 'score')
      if (error) throw new Error(error.message)
      return
    }
    const row = {
      user_id,
      entry_date: date,
      kind: 'score' as const,
      detail: joinDetail(entries),
      delta: entries.reduce((s, e) => s + e.delta, 0),
    }
    const { error } = await db
      .from('ledger')
      .upsert(row, { onConflict: 'user_id,entry_date,kind' })
    if (error) throw new Error(error.message)
  }

  async addRedemption(date: string, detail: string, points: number): Promise<void> {
    const user_id = await this.uid()
    const row = {
      user_id,
      entry_date: date,
      kind: 'redeem' as const,
      detail: `兑换：${detail}`,
      delta: -points,
    }
    const { error } = await this.db()
      .from('ledger')
      .upsert(row, { onConflict: 'user_id,entry_date,kind' })
    if (error) throw new Error(error.message)
  }

  async deleteRow(id: number): Promise<void> {
    const { error } = await this.db().from('ledger').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}

const LS_LOCAL = 'tp_local_ledger' // 未登录：本机真实使用
const LS_DEMO = 'tp_mock_ledger' // 演示模式：内置示例数据

export function seedRows(): LedgerRow[] {
  return (seedData.rows as { date: string; detail: string; delta: number }[]).map((r, i) => ({
    id: i + 1,
    entry_date: r.date,
    kind: 'score' as const,
    detail: r.detail,
    delta: r.delta,
    created_at: `${r.date}T08:00:00Z`,
  }))
}

/** 浏览器本机存储：未登录时用（起始为空）；演示模式用它并预置示例数据 */
class LocalStore implements DataStore {
  mode: SourceMode

  constructor(
    private key: string,
    mode: SourceMode,
    /** 首次使用时是否写入内置示例数据 */
    private seed = false,
  ) {
    this.mode = mode
  }

  private load(): LedgerRow[] {
    const raw = localStorage.getItem(this.key)
    if (!raw) {
      const rows = this.seed ? seedRows() : []
      localStorage.setItem(this.key, JSON.stringify(rows))
      return rows
    }
    try {
      return JSON.parse(raw) as LedgerRow[]
    } catch {
      return []
    }
  }

  private save(rows: LedgerRow[]) {
    localStorage.setItem(this.key, JSON.stringify(rows))
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

  /** 清空本机数据（登录并已上传合并后调用） */
  clearAll() {
    this.save([])
  }
}

/** 未登录也要能用：没有配置 Supabase 时退回本机模式 */
export function getStore(mode: SourceMode): DataStore {
  if (mode === 'demo') return new LocalStore(LS_DEMO, 'demo', true)
  if (mode === 'cloud' && supabase && !useMock) return new SupabaseStore()
  return new LocalStore(LS_LOCAL, 'local')
}

/** 读取本机（未登录）已攒下的记录条数，用于登录后询问是否上传 */
export function countLocalRows(): number {
  const raw = localStorage.getItem(LS_LOCAL)
  if (!raw) return 0
  try {
    return (JSON.parse(raw) as LedgerRow[]).length
  } catch {
    return 0
  }
}

/** 登录后把本机记录上传合并到云端；同一天已有记录时以本机为准覆盖 */
export async function uploadLocalRows(): Promise<number> {
  if (!supabase) return 0
  const raw = localStorage.getItem(LS_LOCAL)
  if (!raw) return 0
  let rows: LedgerRow[]
  try {
    rows = JSON.parse(raw) as LedgerRow[]
  } catch {
    return 0
  }
  if (rows.length === 0) return 0

  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('登录已失效，请重新登录')
  const user_id = data.user.id

  const payload = rows.map((r) => ({
    user_id,
    entry_date: r.entry_date,
    kind: r.kind,
    detail: r.detail,
    delta: r.delta,
  }))
  const { error, count } = await supabase
    .from('ledger')
    .upsert(payload, { onConflict: 'user_id,entry_date,kind', count: 'exact' })
  if (error) throw new Error(error.message)
  return count ?? payload.length
}

export function isMissingTableError(msg: string): boolean {
  return /PGRST205|42P01|Could not find the table|does not exist in the schema cache/i.test(msg)
}
