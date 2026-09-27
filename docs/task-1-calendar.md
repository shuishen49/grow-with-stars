# 任务 1：记录页增加「日历视图」

## 背景
项目是 Vite + React + TypeScript + Tailwind + Supabase 的家庭积分本。数据全部在 `src/App.tsx` 里通过 `getStore(demo).fetchAll()` 取到 `rows: LedgerRow[]`（已按日期排序），传给各页面。
`LedgerRow` 定义在 `src/lib/store.ts`：`{ id, entry_date: 'YYYY-MM-DD', kind: 'score' | 'redeem', detail, delta }`。
每天最多 1 条 score（打分）+ 1 条 redeem（兑换，delta 为负数）。

日期工具在 `src/lib/dates.ts`（`todayStr / monthKey / monthLabel / shiftMonth / daysOfMonth / parseDate / weekdayCN / shortDate`），请复用，不要新增日期库。
`fmtDelta` 从 `src/components/ScorePage.tsx` 导入（正数带 + 号）。

## 要做的事
在「📋 记录」页（`src/components/LogPage.tsx`）顶部月份切换栏下面加一个切换按钮：**日历 / 表格**，默认显示日历。原来的表格保持不变，切到「表格」时显示。
月份切换、上面 4 个统计卡（本月奖励/扣分/兑换/月末结余）两种视图共用。

### 日历视图（新建 `src/components/CalendarView.tsx`）
- 标准月历：7 列，表头「一 二 三 四 五 六 日」（**周一开头**，项目里一周按周一~周日算）。月初前面用空格补齐。
- 每个格子显示：
  - 日期数字（小字，左上）
  - 当天打分 delta（大字居中）：正数绿色 `text-emerald-600` 带 +，负数红色 `text-rose-500`，0 灰色；没有记录显示空白
  - 当天有兑换：右上角显示 🎁
- 今天的格子加 `ring-2 ring-indigo-400` 高亮；未来日期变淡（`opacity-40`）且不能点。
- 点击某天（今天及以前）→ 弹出详情（用现有的 `src/components/Modal.tsx`，先看它的 props 怎么用）：
  - 标题：`2026.9.24 星期四`
  - 当天打分明细：把 `detail` 按 `、` 拆成一行一条显示（可用 `store.ts` 里的 `parseDetail`），每条后面显示分值，颜色同上
  - 兑换记录（如有）
  - 当天结束后的剩余积分（和表格里「剩余积分」列算法一样，从 LogPage 的 `closingAt` 逻辑拿，建议把 closingAt 作为 prop 传进去或把计算挪到共用处）
  - 底部按钮「✏️ 修改这天」→ 调用已有的 `onPickDate(d)`（会跳到打分页并选中该日期）
- 格子要适合手指点（平板/手机），格子最小高度约 `h-16`，整体放在 `card` 样式容器里，跟页面其他卡片风格一致。

## 约束
- 不要改数据库、不要改 `store.ts` 的接口、不要加新 npm 依赖。
- 保持现有代码风格（函数组件 + Tailwind class，中文文案，已有的 `tap`、`card` 样式类）。
- 完成后运行 `npm run build`，必须没有 TypeScript 报错。
- 用 `npm run dev` 打开 `http://localhost:5173/?demo=1`（演示模式，有 2026 年 9 月的示例数据）自测：9 月 23 日应显示 +11，9 月 15 日显示 -5，点 9 月 24 日弹窗里剩余积分为 70。
