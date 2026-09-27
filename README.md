# 🏅 家庭积分本

适配平板的家庭积分打分工具（Web App），配套「家庭勋章积分规则」：打分、登记表、积分兑换、规则查询四大功能，数据存在 Supabase 云端，全家共用一台平板随时打开。

> **只做平板**：布局按 1280 横屏 / 834 竖屏（iPad）两档设计，不再针对手机宽度做断点优化。手机上可用但排版以平板为准。

## 功能

- **⭐ 打分**：左侧 88px 侧边导航 + 内容区（宽屏左右分栏）。按日期勾选加分/扣分项（四大类折叠面板 + ⚡ 常用速记 + 自定义项），右侧常驻「今日已选」面板实时显示今日总分，一键保存；回看/修改任意历史日期
- **📋 记录**：**日历视图**（默认）+ **表格视图**，两种视图共用月份切换与本月奖励/扣分/兑换/月末结余统计
  - 日历：周一开头，每格显示当日净增减（大字）、当天加分/扣分（双色微码）、🎁 兑换角标；未来日期不可点，今天有描边高亮
  - 点任意一天弹窗看逐条明细、加分/扣分小计、当日结束后剩余积分，并可「✏️ 修改这天」跳回打分页
  - 表格视图为原来的月度登记表（日期 / 星期 / 积分增减 / 增减明细 / 兑换记录 / 剩余积分），点任意一行同样可跳回打分页修改
- **🎁 兑换**：20/50/100/200/300/500/1000 积分七档兑换，自动执行「一周最多兑换一次」规则；积分不足自动禁用；兑换历史可撤销（积分退回）
- **📖 规则**：完整奖惩规则表 + 兑换表随时查看

技术栈：Vite + React + TypeScript + Tailwind CSS + Supabase。支持 PWA，iPad 上可「添加到主屏幕」像 App 一样全屏使用。

## 设计系统

配色与圆角来自 `tablet-ui-kit`，已落到 `tailwind.config.js` 与 `src/index.css`：

| 令牌 | 值 | 用途 |
|---|---|---|
| `canvas` | `#F8F6F0` | 奶油白页面底 |
| `ink` / `mut` / `line` | `#202B49` / `#6F7D96` / `#E8EAF4` | 正文 / 次要文字 / 发丝边框 |
| `brand` / `brand-dark` / `brand-soft` | `#7052F5` / `#5738E8` / `#F0EBFF` | 主色紫 |
| `pos` / `posdeep` | `#EE3566` / `#D01F52` | **加分 / 正分（红）** |
| `neg` / `negdeep` | `#07886D` / `#067763` | **扣分 / 负分（绿）** |
| `gold` / `golddeep` | `#F3B735` / `#9C6B00` | 星星金 |
| `rosy` / `mint` / `peach` | `#FFF0F5` / `#E9FBF3` / `#FFF3DD` | 浅底徽章 |
| `rounded-card` / `rounded-ctl` | 20px / 12px | 卡片 / 控件 |
| `shadow-card` / `shadow-pop` | 4px / 16px 紫调投影 | 卡片 / 弹层 |

> **配色约定**：按国内习惯「涨红跌绿」——**加分 / 正分 = 玫红 `pos`**、**扣分 / 负分 = 薄荷绿 `neg`**（与西方「绿涨红跌」相反，别改回去）。
> 小号文字用 `posdeep` / `negdeep`（≥4.5:1 对比度），大号数字用 `pos` / `neg`。
> 素材图在 `public/ui/`（勋章、四类图标、吉祥物、导航图标、统计图标），导航激活态是紫色渐变 `from-[#9274FF] to-brand-dark` + 白字。

无障碍：可见焦点环 3px（`:focus-visible`）、折叠面板 `aria-expanded`、视图切换 `aria-pressed`、导航 `aria-current`、触摸目标 ≥44px、`prefers-reduced-motion` 降级。

## 首次使用（3 步）

### 1. 初始化数据库（只需一次）

打开 [supabase.com/dashboard](https://supabase.com/dashboard) 进入你的项目 → 左侧 **SQL Editor** → **New query** → 粘贴 [`supabase/setup.sql`](supabase/setup.sql) 的全部内容 → **Run**。

这一步会建表、开读写权限，并导入 2026 年 9 月的纸质登记表历史数据（22 天，期末余额 70 分）。

> 项目已内置引导：如果数据库没初始化，网页打开后会自动显示这个 SQL 和复制按钮，照着做即可。

### 2. 配置环境变量

`.env` 已按你提供的 Supabase 信息配置好（`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`，也兼容 `NEXT_PUBLIC_*` 写法）。换库时改这两个值即可。

### 3. 运行

```bash
npm install
npm run dev          # 本机访问 http://localhost:5173
npm run dev -- --host # 局域网访问，平板连同一 Wi-Fi 后打开终端里显示的 Network 地址
```

平板上用 Safari/Chrome 打开该地址 → 分享 → 「添加到主屏幕」，即可像 App 一样使用。

## 部署到公网（可选）

```bash
npm run build   # 产物在 dist/
```

`dist/` 是纯静态文件，可托管到任意静态服务：

- **腾讯云开发 CloudBase**：控制台 → 静态网站托管 → 上传 `dist` 目录（你提供的 AI 网关地址与令牌已记录在 `.env.example`，当前版本未使用，如需「AI 生成周评/鼓励语」等功能可后续接入）
- Vercel / Netlify：导入仓库自动构建即可

## 演示模式

不连数据库也能体验完整功能（数据保存在本机浏览器）：

- 首次打开如果数据库未初始化，点「🎈 先体验演示模式」
- 或访问任意地址加 `?demo=1` 参数
- 页面顶部会显示「演示模式」，点击可退出

## 数据说明

- 表 `ledger`：`entry_date`（日期）、`kind`（score 打分 / redeem 兑换）、`detail`（明细文本）、`delta`（当日增减），每天最多一条打分 + 一条兑换记录
- 剩余积分 = 全部记录 `delta` 累加，兑换后剩余积分自动累积到下周
- **9 月 9 日注**：纸质表明细合计为 +2，但当日增减与余额均按 +3 计算（17→20），本工具按纸质表数字录入，保持期末余额 70 一致
- 修改规则/兑换档位：编辑 `src/data/rules.ts`；修改历史种子数据：编辑 `src/data/seed.json` 后运行 `npm run gen:sql` 重新生成 `supabase/setup.sql`

## 安全提示

家庭工具为省去注册登录，数据库对持有链接的人开放读写（Supabase anon key 本身就是公开的）。不要把网页地址公开传播；如需限制，后续可给 Supabase 加邮箱登录（Auth）。

## 目录结构

```
├─ supabase/setup.sql      # 数据库初始化脚本（含 9 月历史数据）
├─ src/
│  ├─ data/rules.ts        # 奖惩规则、常用速记、兑换档位（改规则改这里）
│  ├─ data/seed.json       # 9 月历史种子数据
│  ├─ lib/store.ts         # 数据层（Supabase / 本地演示双模式）
│  ├─ lib/dates.ts         # 日期工具（周一定义一周）
│  └─ components/
│     ├─ SideNav.tsx       # 左侧 88px 侧边导航（打分/记录/兑换/规则）
│     ├─ AppHeader.tsx     # 顶部标题栏（勋章 + 口号 + 余额 + 刷新）
│     ├─ CalendarView.tsx  # 记录页日历视图（月历格子 + 月战绩 + 当日详情弹窗）
│     └─ …                 # 打分、记录、兑换、规则、弹窗、引导页等组件
├─ public/ui/              # 平板 UI 素材包图标（PNG）
├─ scripts/gen-icons.mjs   # 生成 PWA 图标
└─ scripts/gen-sql.mjs     # 由 seed.json 生成 setup.sql
```
