// 由 src/data/seed.json 生成 supabase/setup.sql（建表 + 9月历史数据），保证两处数据一致
import { readFileSync, writeFileSync } from 'node:fs'
import { mkdirSync } from 'node:fs'

const seed = JSON.parse(readFileSync(new URL('../src/data/seed.json', import.meta.url), 'utf8'))

const values = seed.rows
  .map((r) => `  ('${r.date}', 'score', '${r.detail}', ${r.delta})`)
  .join(',\n')

const sql = `-- ============================================================
-- 家庭积分本 · Supabase 初始化脚本
-- 用法：Supabase 控制台 → SQL Editor → New query → 粘贴全部内容 → Run
-- 可重复运行（重复执行不会产生重复数据）
-- ============================================================

create table if not exists public.ledger (
  id         bigint      generated always as identity primary key,
  entry_date date        not null,
  kind       text        not null check (kind in ('score', 'redeem')),
  detail     text        not null default '',
  delta      int         not null default 0,
  created_at timestamptz not null default now(),
  unique (entry_date, kind)
);

create index if not exists ledger_entry_date_idx on public.ledger (entry_date);

alter table public.ledger enable row level security;

drop policy if exists "family_all_access" on public.ledger;
create policy "family_all_access"
  on public.ledger
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- ------------------------------------------------------------
-- 2026年9月历史积分（与纸质登记表一致）
-- 注：9月9日纸质表明细合计+2、当日增减记+3，此处按纸质表数字录入
-- ------------------------------------------------------------
insert into public.ledger (entry_date, kind, detail, delta) values
${values}
on conflict (entry_date, kind) do nothing;
`

mkdirSync(new URL('../supabase/', import.meta.url), { recursive: true })
writeFileSync(new URL('../supabase/setup.sql', import.meta.url), sql)
console.log('setup.sql generated,', seed.rows.length, 'seed rows')
