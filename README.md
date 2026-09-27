# 🏅 家庭积分本

适配平板的家庭积分打分工具（Web App），配套「家庭勋章积分规则」：打分、登记表、积分兑换、规则查询四大功能。

> **只做平板**：布局按 1280 横屏 / 834 竖屏（iPad）两档设计，不再针对手机宽度做断点优化。手机上可用但排版以平板为准。

## 登录是可选的

| 状态 | 数据存在哪 | 说明 |
|---|---|---|
| **未登录（默认）** | 浏览器本机（localStorage） | 打开就能用，无需任何账号。换设备 / 清缓存数据会丢 |
| **已登录** | Supabase 云端 | 邮箱 + 密码登录，平板 / 手机 / 电脑多设备同步 |
| **演示模式** | 本机 + 内置 9 月示例数据 | `?demo=1` 或登录页「先看看演示数据」，用来体验功能 |

一个家庭共用**一个邮箱 + 一个密码**即可，全程不发邮件、不用验证码。
第一次用选「注册」，密码填两次；之后选「登录」。
登录后如果本机已有记录，会询问是否「一键上传合并」到云端。

## 功能

- **⭐ 打分**：左侧 88px 侧边导航 + 内容区（宽屏左右分栏）。按日期勾选加分/扣分项（四大类折叠面板 + ⚡ 常用速记 + 自定义项），右侧常驻「今日已选」面板实时显示今日总分，一键保存；回看/修改任意历史日期
- **📋 记录**：**日历视图**（默认）+ **表格视图**，两种视图共用月份切换与本月奖励/扣分/兑换/月末结余统计
  - 日历：周一开头，每格显示当日净增减（大字）、当天加分/扣分（双色微码）、🎁 兑换角标；未来日期不可点，今天有描边高亮
  - 点任意一天弹窗看逐条明细、加分/扣分小计、当日结束后剩余积分，并可「✏️ 修改这天」跳回打分页
  - 表格视图为原来的月度登记表（日期 / 星期 / 积分增减 / 增减明细 / 兑换记录 / 剩余积分），点任意一行同样可跳回打分页修改
- **🎁 兑换**：20/50/100/200/300/500/1000 积分七档兑换，自动执行「一周最多兑换一次」规则；积分不足自动禁用；兑换历史可撤销（积分退回）
- **📖 规则**：四大类奖惩规则 + 兑换表，手风琴式可逐类展开/收起（也可一键全部展开/收起）

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

**响应式断点**（`tailwind.config.js` 里自定义了 `tb: 1100px`）：

| 宽度 | 布局 |
|---|---|
| ≥1100（`tb:`） | 左右双栏：主内容 + 右侧 300px 面板；侧边导航 88px |
| 768–1099 | 单栏，右侧面板移到内容下方；侧边导航收窄到 72px（打分页的「今日已选」保留） |

> 素材包原建议 `<768` 切底部导航，本项目按「只做平板」处理，手机宽度不再单独优化。

无障碍：可见焦点环 3px（`:focus-visible`）、折叠面板 `aria-expanded`、视图切换 `aria-selected`、导航 `aria-current`、触摸目标 ≥44px、`prefers-reduced-motion` 降级。

## 首次使用

### 0. 只想单机用？跳过这一步

不配置 Supabase 也能跑：打开就是「未登录 · 仅本机」模式，数据存在浏览器里，功能一个不少。

### 1. 初始化数据库（只需一次）

打开 [supabase.com/dashboard](https://supabase.com/dashboard) 进入你的项目 → 左侧 **SQL Editor** → **New query** → 粘贴 [`supabase/setup.sql`](supabase/setup.sql) 的全部内容 → **Run**。

这一步会建表（带 `user_id` + 「只能读写自己的行」的 RLS 策略），并导入 2026 年 9 月的纸质登记表历史数据（22 天，期末余额 70 分）。

**已经建过旧版库的**，改跑 [`supabase/auth-migration.sql`](supabase/auth-migration.sql) 升级；也可以用脚本：
```bash
node --env-file=.env.local scripts/apply-auth-migration.mjs
```

### 2. 配置环境变量

`.env` 已按你提供的 Supabase 信息配置好（`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`，也兼容 `NEXT_PUBLIC_*` 写法）。换库时改这两个值即可。

### 3. 关掉邮箱确认（只需一步，不用配 SMTP）

本项目用**邮箱 + 密码**登录，全程不发邮件。唯一需要动的开关：

Supabase 控制台（本项目：https://supabase.com/dashboard/project/yplgskqifsjtdvdkcnmd ）
→ **Authentication → Sign In / Providers → Email**
→ 把 **Confirm email** **关掉** → Save
→ 顺手确认 **Allow new users to sign up** 是**开**着的。

> 这个开关不关的话，注册完会要求先点邮件链接确认，你收不到/不想收就永远登不进去。
> 关掉之后：注册 = 当场登录，一封邮件都不发。

**不用**配 SMTP、**不用**改邮件模板。
（之前给邮件验证码准备的 [`supabase/email-magic-link-otp.html`](supabase/email-magic-link-otp.html)
留着备用，现在用不上。）

#### 邮箱已经被注册过？

```bash
node --env-file=.env.local scripts/db-status.mjs                        # 体检：表/列/RLS/用户/数据都够不够
node --env-file=.env.local scripts/check-users.mjs                      # 看看有哪些用户、是否已确认、有没有设密码
node --env-file=.env.local scripts/delete-user.mjs 你的邮箱 --yes        # 删掉某个账号重新注册
node --env-file=.env.local scripts/import-ledger.mjs 你的邮箱 --yes      # 导入纸质积分表（会先校验明细，可先不加 --yes 预览）
```

删账号会连带删掉它在 `ledger` 里的数据行（on delete cascade）。
- **粘贴链接登录**：登录页第二屏底部有「邮件里是『链接』不是 6 位数字？点这里粘贴链接登录」，
  把邮件按钮的完整链接地址粘进去同样能登录成功。

### 4. 运行

```bash
npm install
npm run dev          # 本机访问 http://localhost:5173
npm run dev -- --host # 局域网访问，平板连同一 Wi-Fi 后打开终端里显示的 Network 地址
```

平板上用 Safari/Chrome 打开该地址 → 分享 → 「添加到主屏幕」，即可像 App 一样使用。

## 打包成安卓 APK（不用装 Android Studio）

项目已经套了 **Capacitor**，安卓 APK 由 **GitHub Actions 在云端编译**，本机一个安卓 SDK 都不用装。

### 只需做一次：填两个密钥

`.env` 不入库，所以要在 GitHub 上告诉 Actions 你的 Supabase 地址：

仓库页面 → **Settings → Secrets and variables → Actions → New repository secret**，加两条：

| Name | Secret |
|---|---|
| `VITE_SUPABASE_URL` | `https://yplgskqifsjtdvdkcnmd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `.env` 里 `VITE_SUPABASE_ANON_KEY` 的值（anon / publishable key 本来就是公开的，安全靠 RLS） |

> 这两个**不填也能出包**，打出来的是「本机模式」：能记账、能看日历，但不能登录云同步。
> 想让 APK 能登录同步就填上，然后重跑一次流水线。

### 出包

- **自动**：往 `main` push 一次就出一份调试版 APK；打 tag（`v1.0.0` 之类）也会触发
- **手动**：Actions 页面 →「打包安卓 APK」→ **Run workflow**

APK 有两个地方能下：

- **Releases 页面（推荐）**：仓库首页右侧 → **Releases** → `latest`，APK 直接挂在附件里，名字像 `FamilyPoints-20260928-debug.apk`
- **Artifacts**：Actions 运行详情页最下面（文件名 `家庭积分本-debug-apk`），90 天后会过期

把 APK 传到安卓平板上装就行（首次安装会提示「未知来源」，允许一次即可）。

调试版可以直接装用。想要能上架的正式签名版，再补 4 个密钥即可（缺了会自动跳过这一步）：
`KEYSTORE_BASE64`（`.jks` 文件 base64）、`KEYSTORE_PASSWORD`、`KEY_ALIAS`、`KEY_PASSWORD`。

### 在本机用雷电模拟器验证（比每次真机方便）

1. 装 **雷电模拟器 9**（官网 <https://www.ldmnq.com/>，免费）
2. **先设成平板分辨率**，否则会显示成窄屏手机布局：
   设置 → 分辨率 → 选 **平板**（或自定义 2560×1600、320 DPI）
3. 把 Actions 下载下来的 APK **直接拖进模拟器窗口**即可安装

> ⚠️ 平板双栏布局的断点是 **1100 CSS 像素**，而 CSS 像素 = 物理像素 ÷ (DPI ÷ 160)。
> 横屏 2560×1600@320dpi → 1280 CSS px，**正常显示双栏**；
> 竖屏只有 800 CSS px → 收窄成单栏（这是设计如此，768–1099 就该是单栏 + 收窄导航）。

> **iPad 用户注意**：苹果不允许这种打包方式，iOS 必须 Mac + Xcode + 苹果开发者账号（¥688/年）。
> iPad 上用 Safari 打开网页版 →「添加到主屏幕」，体验和原生 App 几乎一样。

## 部署到公网（可选）

```bash
npm run build   # 产物在 dist/
```

`dist/` 是纯静态文件，可托管到任意静态服务：

- **腾讯云开发 CloudBase**：控制台 → 静态网站托管 → 上传 `dist` 目录（你提供的 AI 网关地址与令牌已记录在 `.env.example`，当前版本未使用，如需「AI 生成周评/鼓励语」等功能可后续接入）
- Vercel / Netlify：导入仓库自动构建即可

## 把已有的历史数据认领到自己账号

`setup.sql` 导入的 9 月历史数据 `user_id` 是空的（不属于任何账号）。先在网页上用你的邮箱登录一次，然后在本机运行：

```bash
node --env-file=.env.local scripts/claim-rows.mjs 你的邮箱
```

脚本会把这些空记录归到你的账号下（同一天你已自己录过数据的会跳过，不会覆盖）。

## 演示模式

不连数据库也能体验完整功能（带 9 月示例数据，保存在本机浏览器）：

- 登录页点「🎈 先看看演示数据」
- 或访问任意地址加 `?demo=1` 参数
- 页面顶部会显示「演示数据」，点击可退出

## 数据说明

- 表 `ledger`：`user_id`（归属账号）、`entry_date`（日期）、`kind`（score 打分 / redeem 兑换）、`detail`（明细文本）、`delta`（当日增减），每个账号每天最多一条打分 + 一条兑换记录
- RLS 策略 `own_rows`：**未登录不能读写数据库**，登录后只能读写 `user_id = 自己的` 的行
- 剩余积分 = 全部记录 `delta` 累加，兑换后剩余积分自动累积到下周
- **9 月 9 日注**：纸质表明细合计为 +2，但当日增减与余额均按 +3 计算（17→20），本工具按纸质表数字录入，保持期末余额 70 一致
- 修改规则/兑换档位：编辑 `src/data/rules.ts`；修改历史种子数据：编辑 `src/data/seed.json` 后运行 `npm run gen:sql` 重新生成 `supabase/setup.sql`

## 安全说明

- 数据库**不再对匿名访问开放**：RLS 策略 `own_rows` 只放行 `authenticated` 且 `user_id = 自己的` 行。未登录时前端根本不连数据库（走本机存储）。
- anon key 本身是公开的，但配合上面的 RLS，拿到 key 也读不到任何人的数据。
- 邮箱 + 密码登录由 Supabase Auth 托管，密码不落本项目，会话由 supabase-js 保管。

## 目录结构

```
├─ supabase/setup.sql          # 数据库初始化脚本（新结构，含 9 月历史数据）
├─ supabase/auth-migration.sql # 旧库升级：加 user_id + 收紧 RLS
├─ src/
│  ├─ data/rules.ts            # 奖惩规则、常用速记、兑换档位（改规则改这里）
│  ├─ data/seed.json           # 9 月历史种子数据
│  ├─ lib/auth.ts              # 邮箱密码注册/登录、会话监听、报错中文化
│  ├─ lib/store.ts             # 数据层（云端 / 本机 / 演示 三模式）
│  ├─ lib/dates.ts             # 日期工具（周一定义一周）
│  └─ components/
│     ├─ AuthPage.tsx          # 登录页（登录/注册切换，注册填两次密码，可跳过）
│     ├─ SideNav.tsx           # 左侧侧边导航（打分/记录/兑换/规则）
│     ├─ AppHeader.tsx         # 顶部标题栏（状态标签 + 登录/退出 + 余额）
│     ├─ CalendarView.tsx      # 记录页日历视图（月历格子 + 月战绩 + 当日详情弹窗）
│     └─ …                     # 打分、记录、兑换、规则、弹窗、引导页等组件
├─ public/ui/                  # 平板 UI 素材包图标（PNG）
├─ scripts/apply-sql.mjs       # 直连执行 setup.sql
├─ scripts/apply-auth-migration.mjs  # 直连执行 auth-migration.sql
├─ scripts/claim-rows.mjs      # 认领历史数据到指定邮箱账号
├─ scripts/gen-icons.mjs       # 生成 PWA 图标
└─ scripts/gen-sql.mjs         # 由 seed.json 生成 setup.sql
```
