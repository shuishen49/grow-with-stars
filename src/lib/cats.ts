/**
 * 把「写死的规则表」和「家长自己改的东西」合并成一份分类列表
 *
 * 内置四个大类来自 data/rules.ts（跟纸质登记表一致）；
 * 家长新建的大类、改过的分类名都存在本机 localStorage，
 * 两边在这里合并后，打分页和规则页看到的就是同一份。
 */
import { CATEGORIES, type Category } from '../data/rules'
import { loadCatNames, loadUserCats } from './customRules'

/** 内置分类的素材包图标 */
const BUILTIN_ICON: Record<string, string> = {
  life: '/ui/category-life.webp',
  study: '/ui/category-study.webp',
  result: '/ui/category-achievement.webp',
  character: '/ui/category-character.webp',
}

/** 新建大类时可以挑的头象 */
export const CAT_EMOJI_CHOICES = ['⭐', '🎯', '🏀', '🎵', '🎨', '🧹', '🍎', '🛏️', '🚿', '🌱', '🐶', '🎲']

export interface BuiltCat extends Category {
  /** 是不是规则表自带的（自带的不能删，只能改名） */
  builtin: boolean
  /** 素材包图标地址；空的就用 emoji */
  icon: string
}

export function buildCategories(): BuiltCat[] {
  const names = loadCatNames()
  const builtin: BuiltCat[] = CATEGORIES.map((c) => ({
    ...c,
    name: names[c.id] || c.name,
    builtin: true,
    icon: BUILTIN_ICON[c.id] || '',
  }))
  const extras: BuiltCat[] = loadUserCats().map((u) => ({
    id: u.id,
    name: names[u.id] || u.name,
    emoji: u.emoji,
    rewards: [],
    penalties: [],
    builtin: false,
    icon: '',
  }))
  return [...builtin, ...extras]
}

/** 图标怎么渲染：有素材用素材，没有就退化成 emoji */
export function catIcon(cat: { icon: string; emoji: string }): { src: string; emoji: string } {
  return { src: cat.icon || '', emoji: cat.emoji || '⭐' }
}
