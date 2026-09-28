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

/** 读取本机（未登录时）攒下的记录 */
export function readLocalRows(): LedgerRow[] {
  const raw = localStorage.getItem(LS_LOCAL)
  if (!raw) return []
  try {
    return JSON.parse(raw) as LedgerRow[]
  } catch {
    return []
  }
}

/**
 * 把一批记录写回本机。
 * 两个用途：① 退出登录时留一份快照，退出后照样能看能记；
 * ② 家长选了「以云端为准」后，让本机和云端保持一致，避免下次登录又问一遍。
 */
export function writeLocalRows(rows: LedgerRow[]): void {
  localStorage.setItem(LS_LOCAL, JSON.stringify(rows))
}

/**
 * 两份数据的「指纹」：按 日期|类型|分值 排序后拼起来。
 * 用来判断云端和本机是不是完全一样 —— 一样就不用弹窗烦人了。
 */
export function rowsSignature(rows: LedgerRow[]): string {
  return rows
    .map((r) => `${r.entry_date}|${r.kind}|${r.delta}`)
    .sort()
    .join(',')
}

export function sumPoints(rows: LedgerRow[]): number {
  return rows.reduce((s, r) => s + r.delta, 0)
}

/** 登录用户 id；会话失效就抛错 */
async function currentUid(): Promise<string> {
  if (!supabase) throw new Error('Supabase 未配置')
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('登录已失效，请重新登录')
  return data.user.id
}

function toPayload(user_id: string, rows: LedgerRow[]) {
  return rows.map((r) => ({
    user_id,
    entry_date: r.entry_date,
    kind: r.kind,
    detail: r.detail,
    delta: r.delta,
  }))
}

/**
 * 家长选「以本机为准」：用本机数据整体覆盖云端。
 * 顺序是「先写后删」—— 先把本机记录全部 upsert 进去，再删掉云端多出来的行，
 * 这样中途出错也只是少删，不会把数据清空。
 */
export async function replaceCloudRows(rows: LedgerRow[]): Promise<void> {
  const db = supabase!
  const user_id = await currentUid()
  if (rows.length > 0) {
    const { error } = await db
      .from('ledger')
      .upsert(toPayload(user_id, rows), { onConflict: 'user_id,entry_date,kind' })
    if (error) throw new Error(error.message)
  }
  const keep = new Set(rows.map((r) => `${r.entry_date}|${r.kind}`))
  const { data: cloud, error: e2 } = await db
    .from('ledger')
    .select('id,entry_date,kind')
    .eq('user_id', user_id)
  if (e2) throw new Error(e2.message)
  const del = (cloud ?? []).filter((r) => !keep.has(`${r.entry_date}|${r.kind}`)).map((r) => r.id)
  if (del.length > 0) {
    const { error } = await db.from('ledger').delete().in('id', del)
    if (error) throw new Error(error.message)
  }
}

/**
 * 家长选「两边都留着」：合并两套记录。
 * 同一天同一类型两边都有时，以这台设备的为准（它通常是刚记的、最新的）。
 * 返回合并后的完整记录，方便写回本机。
 */
export async function mergeRowsIntoCloud(local: LedgerRow[]): Promise<LedgerRow[]> {
  const db = supabase!
  const user_id = await currentUid()
  if (local.length > 0) {
    const { error } = await db
      .from('ledger')
      .upsert(toPayload(user_id, local), { onConflict: 'user_id,entry_date,kind' })
    if (error) throw new Error(error.message)
  }
  const { data, error } = await db
    .from('ledger')
    .select('id,entry_date,kind,detail,delta,created_at')
    .eq('user_id', user_id)
    .order('entry_date')
    .order('id')
  if (error) throw new Error(error.message)
  return (data ?? []) as LedgerRow[]
}

export function isMissingTableError(msg: string): boolean {
  return /PGRST205|42P01|Could not find the table|does not exist in the schema cache/i.test(msg)
}
