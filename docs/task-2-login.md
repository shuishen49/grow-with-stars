# 任务 2：加登录 / 注册（Supabase Auth 邮箱 + 密码）

## 背景
项目是 Vite + React + TypeScript + Tailwind + Supabase 的家庭积分本。
- Supabase 客户端：`src/lib/supabase.ts`（导出 `supabase`，可能为 null）
- 数据层：`src/lib/store.ts`，`SupabaseStore` 读写表 `public.ledger`；`MockStore` 是演示模式（数据存 localStorage）
- 入口：`src/App.tsx`
- 表结构见 `supabase/setup.sql`。现在的 RLS 策略 `family_all_access` 允许 **anon 随便读写**，这是要解决的问题。
- `scripts/apply-sql.mjs` 能用 `.env.local` 里的数据库密码直连 Supabase 执行 SQL（运行方式：`node --env-file=.env.local scripts/apply-sql.mjs`）。

## 目标
1. 不登录看不到、改不了任何数据。
2. 每个账号只看得到自己的积分数据（一个家庭共用一个账号即可，平板登录一次后一直保持登录）。
3. 演示模式（`?demo=1` / 「先体验演示模式」按钮）继续可用，不需要登录。

## 数据库（新建 `supabase/auth-migration.sql`，可重复执行）
```sql
alter table public.ledger add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

-- 唯一约束从 (entry_date, kind) 改为 (user_id, entry_date, kind)
alter table public.ledger drop constraint if exists ledger_entry_date_kind_key;
create unique index if not exists ledger_user_date_kind_uidx on public.ledger (user_id, entry_date, kind);

drop policy if exists "family_all_access" on public.ledger;
drop policy if exists "own_rows" on public.ledger;
create policy "own_rows" on public.ledger
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```
（先用 `select conname from pg_constraint where conrelid = 'public.ledger'::regclass;` 确认旧唯一约束的真实名字再删。）

再写 `scripts/apply-auth-migration.mjs`（照抄 apply-sql.mjs 的连接逻辑）执行这个文件并打印结果。

**已有的 9 月历史数据**（user_id 为空）需要归到用户账号下。写 `scripts/claim-rows.mjs <邮箱>`：
`update public.ledger set user_id = (select id from auth.users where email = $1) where user_id is null;`
打印更新了多少行。（用户先在网页注册账号，再运行这个脚本。）

同时把 `supabase/setup.sql` 更新成新结构（新装的库直接就是带 user_id + own_rows 策略的版本），`scripts/gen-sql.mjs` 如果生成 setup.sql 也要同步改。

## 前端
### 数据层 `src/lib/store.ts`
- 两处 `upsert(..., { onConflict: 'entry_date,kind' })` 改成 `'user_id,entry_date,kind'`，并在 row 里显式带上 `user_id`（从 `supabase.auth.getUser()` 或 session 取），不要只依赖数据库默认值。
- 其他接口不变。

### 登录页（新建 `src/components/AuthPage.tsx`）
- 一个卡片，两个 tab：「登录」「注册」
- 字段：邮箱、密码（注册时再加「确认密码」，两次不一致要提示；密码至少 6 位）
- 登录：`supabase.auth.signInWithPassword({ email, password })`
- 注册：`supabase.auth.signUp({ email, password })`。如果返回的 `data.session` 为空，说明 Supabase 开了邮箱验证，提示「注册成功，请去邮箱点确认链接后再登录」；有 session 就直接进入。
- 错误信息翻成中文友好提示（至少：`Invalid login credentials` → 邮箱或密码错误；`User already registered` → 该邮箱已注册；其他原样显示）。
- 按钮提交中显示「登录中…」并禁用，防止重复点。
- 底部保留一个「🎈 先体验演示模式」按钮（调用 App 里已有的 `enableDemo`）。
- 风格和现有页面一致：Tailwind、`card` / `tap` 样式类、中文文案、适合平板大按钮。

### `src/App.tsx`
- 用 `supabase.auth.getSession()` 取初始 session，`supabase.auth.onAuthStateChange` 监听变化，存到 state。
- 判断顺序：演示模式 → 直接进；Supabase 模式且没 session → 显示 AuthPage；有 session → 原来的逻辑（加载数据等）。session 变化后要重新 `refresh()`。
- session 还在读取时显示原来的「加载中…」。
- 顶部标题栏加一个退出按钮（比如在 🔄 旁边放「退出」小字按钮，或点标题弹确认）：`supabase.auth.signOut()`，退出前 `confirm('确定退出登录？')`。标题下可以小字显示当前邮箱。
- `SetupGuide` 相关逻辑保持不变。

### README.md
- 删掉「家庭工具为省去注册登录…」那段安全提示，改成说明：需要注册账号登录；首次注册后运行 `node --env-file=.env.local scripts/claim-rows.mjs 你的邮箱` 认领 9 月历史数据；如不想收验证邮件，可在 Supabase 控制台 Authentication → Sign In / Providers → Email 关闭「Confirm email」。

## 执行顺序
1. 写好 SQL 和脚本，运行 `node --env-file=.env.local scripts/apply-auth-migration.mjs` 应用到线上库。
2. 改前端，`npm run build` 必须无报错。
3. `npm run dev` 自测：未登录显示登录页；注册 → 登录 → 能看到空数据（历史数据还没认领）；保存一次打分成功；退出后回到登录页；`?demo=1` 不需要登录也能用。
4. 测试完把测试时产生的打分记录删掉。**不要替用户运行 claim-rows**（要用他自己的邮箱），在最后告诉他怎么运行。

## 约束
- 不加新 npm 依赖（`@supabase/supabase-js` 已经有 auth 功能）。
- 不要把 `.env.local` 里的密码写进任何会提交的文件。
