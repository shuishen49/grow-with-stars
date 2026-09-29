/**
 * 自定义评分项 + 分类排序（都只存在本机，不上云）
 *
 * 规则表本身写死在 data/rules.ts 里（跟纸质登记表一致），
 * 家长自己加的项目单独存一份，按分类归档，这样第二天、下周都还在。
 * 分类的上下顺序也记在这里 —— 谁用得多谁排前面。
 */
export interface CustomRule {
  id: string
  /** 属于哪个大类（life / study / result / character） */
  catId: string
  name: string
  /** 带符号：正数是奖励，负数是扣分 */
  delta: number
  createdAt: number
}

/** 家长自己新建的大类 */
export interface UserCat {
  id: string
  name: string
  /** 头像用一个 emoji，不用额外素材 */
  emoji: string
  createdAt: number
}

const KEY_RULES = 'tp_custom_rules'
const KEY_ORDER = 'tp_cat_order'
const KEY_USER_CATS = 'tp_user_cats'
/** 分类重命名：{ [分类id]: 新名字 }，内置和自建的都能改 */
const KEY_CAT_NAMES = 'tp_cat_names'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 存不下就算了，不影响打分 */
  }
}

export function loadCustomRules(): CustomRule[] {
  const list = read<CustomRule[]>(KEY_RULES, [])
  return Array.isArray(list) ? list.filter((r) => r && r.id && r.catId && r.name) : []
}

/** 加一项；同分类下重名就直接覆盖旧的，免得攒出一堆一样的 */
export function addCustomRule(catId: string, name: string, delta: number): CustomRule[] {
  const list = loadCustomRules()
  const same = list.find((r) => r.catId === catId && r.name === name)
  if (same) {
    same.delta = delta
  } else {
    list.push({
      id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      catId,
      name,
      delta,
      createdAt: Date.now(),
    })
  }
  write(KEY_RULES, list)
  return list
}

export function removeCustomRule(id: string): CustomRule[] {
  const list = loadCustomRules().filter((r) => r.id !== id)
  write(KEY_RULES, list)
  return list
}

export function loadCatOrder(): string[] {
  const list = read<string[]>(KEY_ORDER, [])
  return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []
}

export function saveCatOrder(ids: string[]): void {
  write(KEY_ORDER, ids)
}

// ---------- 自己新建的大类 ----------

export function loadUserCats(): UserCat[] {
  const list = read<UserCat[]>(KEY_USER_CATS, [])
  return Array.isArray(list) ? list.filter((c) => c && c.id && c.name) : []
}

/** 新建一个大类；重名就直接返回原来的列表 */
export function addUserCat(name: string, emoji: string): UserCat[] {
  const list = loadUserCats()
  const n = name.trim()
  if (!n || list.some((c) => c.name === n)) return list
  list.push({
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: n,
    emoji: emoji || '⭐',
    createdAt: Date.now(),
  })
  write(KEY_USER_CATS, list)
  return list
}

/** 换一个头像 */
export function setUserCatEmoji(id: string, emoji: string): UserCat[] {
  const list = loadUserCats()
  const hit = list.find((c) => c.id === id)
  if (hit) hit.emoji = emoji || '⭐'
  write(KEY_USER_CATS, list)
  return list
}

/** 删掉一个大类，同时把这个类里自己加的评分项也一起清掉，不留垃圾数据 */
export function removeUserCatAndRules(id: string): { cats: UserCat[]; rules: CustomRule[] } {
  const rules = loadCustomRules().filter((r) => r.catId !== id)
  write(KEY_RULES, rules)
  const cats = loadUserCats().filter((c) => c.id !== id)
  write(KEY_USER_CATS, cats)
  return { cats, rules }
}

// ---------- 分类重命名 ----------

export function loadCatNames(): Record<string, string> {
  return read<Record<string, string>>(KEY_CAT_NAMES, {})
}

/** 改名字；留空就等于用回原来的名字 */
export function saveCatName(id: string, name: string): Record<string, string> {
  const map = loadCatNames()
  const n = name.trim()
  if (n) map[id] = n
  else delete map[id]
  write(KEY_CAT_NAMES, map)
  return map
}
