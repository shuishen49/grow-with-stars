// 连接 Supabase Postgres 并执行 supabase/setup.sql（建表 + RLS + 9月历史数据）
// 用法：node --env-file=.env.local scripts/apply-sql.mjs
import { readFileSync } from 'node:fs'
import pg from 'pg'

const PROJECT_REF = 'yplgskqifsjtdvdkcnmd'
const PASSWORD = process.env.SUPABASE_DB_PASSWORD
if (!PASSWORD) {
  console.error('缺少 SUPABASE_DB_PASSWORD（用 node --env-file=.env.local 运行）')
  process.exit(1)
}

// 依次尝试：直连（需 IPv6）→ 常见区域的 session pooler（IPv4）
const CANDIDATES = [
  { label: '直连', host: `db.${PROJECT_REF}.supabase.co`, port: 5432, user: 'postgres' },
  ...['ap-southeast-1', 'ap-northeast-1', 'ap-northeast-2', 'us-east-1', 'us-west-1', 'eu-west-1', 'eu-central-1'].map(
    (region) => ({
      label: `pooler ${region}`,
      host: `aws-0-${region}.pooler.supabase.com`,
      port: 5432,
      user: `postgres.${PROJECT_REF}`,
    }),
  ),
]

async function tryConnect(c) {
  const client = new pg.Client({
    host: c.host,
    port: c.port,
    user: c.user,
    password: PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 12000,
  })
  await client.connect()
  return client
}

let client = null
let used = null
for (const c of CANDIDATES) {
  process.stdout.write(`尝试 ${c.label} (${c.host}) ... `)
  try {
    client = await tryConnect(c)
    used = c
    console.log('✓ 连接成功')
    break
  } catch (e) {
    console.log(`✗ ${e.message.split('\n')[0]}`)
  }
}

if (!client) {
  console.error('\n所有连接方式均失败。请从 Dashboard → Database 设置页复制 Connection string 作为备用。')
  process.exit(1)
}

try {
  const sql = readFileSync(new URL('../supabase/setup.sql', import.meta.url), 'utf8')
  await client.query(sql)
  console.log(`\nsetup.sql 已通过 ${used.label} 执行完成`)

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
