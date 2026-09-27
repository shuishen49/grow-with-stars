// 家庭勋章积分规则（与纸质规则表一致）
export type ItemKind = 'reward' | 'penalty'

export interface RuleItem {
  id: string
  name: string
  points: number // 正数分值，惩罚项在扣分列表中取负
}

export interface QuickItem {
  id: string
  name: string
  delta: number // 带符号
}

export interface Category {
  id: string
  name: string
  emoji: string
  rewards: RuleItem[]
  penalties: RuleItem[]
}

export const CATEGORIES: Category[] = [
  {
    id: 'life',
    name: '生活习惯',
    emoji: '🌅',
    rewards: [
      { id: 'rise_early', name: '早上自主按时7:30前起床', points: 1 },
      { id: 'eat_well', name: '吃饭认真不挑食', points: 1 },
      { id: 'exercise', name: '每天坚持锻炼、拉伸合计1小时', points: 1 },
      { id: 'tidy_up', name: '睡前整理书包、书桌', points: 1 },
      { id: 'sleep_early', name: '晚上9:30主动洗漱、按时睡觉', points: 1 },
    ],
    penalties: [
      { id: 'p_late_wake', name: '起床拖拉、上学迟到', points: 1 },
      { id: 'p_picky_eat', name: '吃饭不认真、挑食', points: 1 },
      { id: 'p_skip_exercise', name: '没完成每天运动任务', points: 1 },
      { id: 'p_no_tidy', name: '不整理书包、书桌', points: 1 },
      { id: 'p_sleep_late', name: '睡觉拖沓磨蹭', points: 1 },
    ],
  },
  {
    id: 'study',
    name: '学习习惯',
    emoji: '📚',
    rewards: [
      { id: 'morning_reading', name: '大声晨读', points: 1 },
      { id: 'school_work', name: '尽量校内完成各科作业', points: 2 },
      { id: 'review', name: '到家后先复习今日所学内容', points: 1 },
      { id: 'words_math', name: '每天坚持记单词、口算一页', points: 2 },
      { id: 'pomodoro', name: '坐姿规范、番茄学习法', points: 1 },
      { id: 'preview', name: '完成预习', points: 1 },
      { id: 'homework', name: '认真及时完成校外作业', points: 3 },
      { id: 'mistake_book', name: '规范及时整理错题', points: 2 },
      { id: 'reading20', name: '课外阅读20分钟', points: 2 },
    ],
    penalties: [
      { id: 'p_no_reading', name: '无故不晨读', points: 1 },
      { id: 'p_school_work_bad', name: '不认真、及时完成校内各科作业', points: 2 },
      { id: 'p_no_review', name: '没有复习今日所学内容', points: 1 },
      { id: 'p_no_words_math', name: '无故不完成记单词、口算', points: 1 },
      { id: 'p_bad_posture', name: '坐姿不规范', points: 1 },
      { id: 'p_no_preview', name: '无故不完成预习', points: 1 },
      { id: 'p_no_homework', name: '未完成校外作业', points: 3 },
      { id: 'p_no_mistake_book', name: '未及时规范整理错题', points: 1 },
      { id: 'p_no_reading20', name: '无故未完成课外阅读', points: 2 },
    ],
  },
  {
    id: 'result',
    name: '学习成果',
    emoji: '🏆',
    rewards: [
      { id: 'dictation', name: '课堂听写、默写全对', points: 2 },
      { id: 'chinese_aplus', name: '校内测试语文A+', points: 5 },
      { id: 'math_aplusp', name: '校内测试数学A++', points: 5 },
      { id: 'english_aplusp', name: '校内测试英语A++', points: 5 },
      { id: 'praise', name: '被老师表扬一次', points: 3 },
      { id: 'award', name: '获得学校奖状一张', points: 8 },
    ],
    penalties: [
      { id: 'p_dictation_err', name: '课堂听写、默写错误2个以上', points: 2 },
      { id: 'p_chinese_below', name: '校内测试语文A+以下', points: 5 },
      { id: 'p_math_below', name: '校内测试数学A+以下', points: 8 },
      { id: 'p_english_below', name: '校内测试英语A+以下', points: 8 },
      { id: 'p_criticized', name: '被老师点名批评一次', points: 3 },
      { id: 'p_parent_called', name: '表现差，老师请家长', points: 5 },
    ],
  },
  {
    id: 'character',
    name: '性格养成',
    emoji: '🌟',
    rewards: [
      { id: 'no_temper', name: '一天不发脾气，有事好好说', points: 3 },
      { id: 'solve_problems', name: '遇到困难不着急、想办法解决', points: 2 },
      { id: 'stranger_safety', name: '不靠近陌生人，不吃他人食物饮料', points: 3 },
      { id: 'eye_care', name: '按时望远、眼保健操、保护眼睛', points: 2 },
      { id: 'polite', name: '有礼貌，尊敬长辈', points: 1 },
      { id: 'clean', name: '保持自身整洁、卫生', points: 1 },
    ],
    penalties: [
      { id: 'p_lying', name: '说谎或者乱发脾气', points: 3 },
      { id: 'p_rude', name: '说脏话，和长辈顶嘴', points: 2 },
      { id: 'p_messy', name: '物品乱放不收拾', points: 2 },
      { id: 'p_screen', name: '长时间看电子产品', points: 4 },
    ],
  },
]

// 打分页顶部的「常用速记」：源自 9 月实际登记习惯，与正式规则表分开显示
export const QUICK_ITEMS: QuickItem[] = [
  { id: 'q_dictation', name: '听默写全对', delta: 1 },
  { id: 'q_words', name: '记单词', delta: 1 },
  { id: 'q_math', name: '计算/口算', delta: 1 },
  { id: 'q_morning_read', name: '晨读', delta: 1 },
  { id: 'q_all_hw', name: '完成所有作业', delta: 2 },
  { id: 'q_oly_math', name: '完成奥数作业', delta: 2 },
  { id: 'q_dance', name: '练舞', delta: 2 },
  { id: 'q_essay', name: '作文', delta: 1 },
  { id: 'q_go_school', name: '坚持上学', delta: 2 },
  { id: 'q_praise_math', name: '数学老师表扬', delta: 3 },
  { id: 'q_five_beauty', name: '五美少年', delta: 8 },
  { id: 'q_math_star', name: '月度数学之星', delta: 8 },
  { id: 'q_sleep_late', name: '晚睡', delta: -2 },
  { id: 'q_forget_cup', name: '水杯遗忘', delta: -2 },
]

// 名称 → 带符号分值 的统一映射（规则项 + 速记项）
export const NAMED_DELTA: Record<string, number> = (() => {
  const map: Record<string, number> = {}
  for (const c of CATEGORIES) {
    for (const i of c.rewards) map[i.name] = i.points
    for (const i of c.penalties) map[i.name] = -i.points
  }
  for (const i of QUICK_ITEMS) map[i.name] = i.delta
  return map
})()

export interface RedeemTier {
  points: number
  options: string[]
}

export const REDEEM_TIERS: RedeemTier[] = [
  {
    points: 20,
    options: ['文具盲盒一个', '零食一个', '玩平板10分钟', '听故事15分钟', '和家人玩桌游或下棋一次', '兑换现金5元'],
  },
  {
    points: 50,
    options: ['看电影一次', '打游戏40分钟以内一次', '游戏厅一次', '奶茶一杯', '自选水果一种', '兑换现金15元'],
  },
  {
    points: 100,
    options: ['儿童乐园一次', '大餐一顿', '小礼物一件', '周末自选活动一项', '兑换现金30元'],
  },
  { points: 200, options: ['实现一个合理愿望（200元内）'] },
  { points: 300, options: ['实现一个合理愿望（300元内）'] },
  { points: 500, options: ['实现一个合理愿望（500元内）'] },
  { points: 1000, options: ['旅行一次'] },
]

export const REDEEM_RULE_TEXT = '兑换规则：一周最多兑换一次积分奖励，兑换后剩余积分累积至下周。'
