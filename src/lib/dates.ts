export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayStr(): string {
  return dateToStr(new Date())
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return dateToStr(d)
}

export function weekdayCN(s: string): string {
  return '星期' + '日一二三四五六'[parseDate(s).getDay()]
}

export function shortDate(s: string): string {
  const d = parseDate(s)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

export function monthKey(s: string): string {
  return s.slice(0, 7)
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${y}年${Number(m)}月`
}

export function shiftMonth(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function daysOfMonth(key: string, uptoToday = false): string[] {
  const [y, m] = key.split('-').map(Number)
  const total = new Date(y, m, 0).getDate()
  const list: string[] = []
  const today = todayStr()
  for (let d = 1; d <= total; d++) {
    const s = `${key}-${pad(d)}`
    if (uptoToday && s > today) break
    list.push(s)
  }
  return list
}

/** 该日期所在一周的周一（一周 = 周一 ~ 周日） */
export function weekMonday(s: string): string {
  const d = parseDate(s)
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  return dateToStr(d)
}

export function sameWeek(a: string, b: string): boolean {
  return weekMonday(a) === weekMonday(b)
}
