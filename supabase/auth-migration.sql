-- ============================================================
-- 家庭积分本 · 登录功能迁移（可重复执行）
-- 用法 A：Supabase 控制台 → SQL Editor → 粘贴全部 → Run
-- 用法 B：node --env-file=.env.local scripts/apply-auth-migration.mjs
--
-- 目标：
--   1. ledger 增加 user_id，每个账号只看得到自己的数据
--   2. 收紧 RLS：未登录（anon）不再能读写，只有 authenticated 能读写自己的行
--   3. 唯一约束从 (entry_date, kind) 改成 (user_id, entry_date, kind)
--
-- 注意：已存在的 9 月历史数据 user_id 为空（谁都不属于），
--       注册账号后运行 node --env-file=.env.local scripts/claim-rows.mjs 你的邮箱 认领。
-- ============================================================

-- 1) 加列（可空，默认当前登录用户；历史行会保持 NULL 待认领）
alter table public.ledger
  add column if not exists user_id uuid
  references auth.users(id) on delete cascade
  default auth.uid();

create index if not exists ledger_user_id_idx on public.ledger (user_id);

-- 2) 唯一约束改为按用户维度
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.ledger'::regclass and conname = 'ledger_entry_date_kind_key'
  ) then
    alter table public.ledger drop constraint ledger_entry_date_kind_key;
  end if;
end $$;

create unique index if not exists ledger_user_date_kind_uidx
  on public.ledger (user_id, entry_date, kind);

-- 未认领的历史行（user_id 为空）也按日期去重，保证 setup.sql 可重复执行
create unique index if not exists ledger_unclaimed_date_kind_uidx
  on public.ledger (entry_date, kind)
  where user_id is null;

-- 3) 收紧 RLS：删掉 anon 全开策略，只留「自己的行」
alter table public.ledger enable row level security;

drop policy if exists "family_all_access" on public.ledger;
drop policy if exists "own_rows" on public.ledger;

create policy "own_rows"
  on public.ledger
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4) 验认结果
select
  (select count(*) from public.ledger) as total_rows,
  (select count(*) from public.ledger where user_id is null) as unclaimed_rows;
