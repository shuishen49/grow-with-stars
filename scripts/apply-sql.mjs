// 连接 Supabase Postgres 并执行 supabase/setup.sql（建表 + RLS + 9月历史数据）
// 用法：node --env-file=.env.local scripts/apply-sql.mjs
import { readFileSync } from 'node:fs'
import { connect } from './lib/connect.mjs'

const client = await connect()

try {
  const sql = readFileSync(new URL('../supabase/setup.sql', import.meta.url), 'utf8')
  await client.query(sql)
  console.log('\nsetup.sql 执行完成')

  // 验证
  const { rows } = await client.query(
    'select count(*)::int as n, sum(delta)::int as total, min(entry_date)::text as from, max(entry_date)::text as to from public.ledger',
  )
  console.log(`历史记录：${rows[0].n} 条（${rows[0].from} ~ ${rows[0].to}），累计余额 ${rows[0].total}`)
  if (rows[0].n !== 22 || rows[0].total !== 70) {
    console.error('⚠ 数据与预期不符（应为 22 条、余额 70）')
    process.exit(1)
  }
  console.log('✓ 与纸质登记表一致（22 天、期末余额 70）')
} finally {
  await client.end()
}
