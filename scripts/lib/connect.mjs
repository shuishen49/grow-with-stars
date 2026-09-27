// 连上 Supabase Postgres（直连 → 各区域 session pooler 依次尝试）
// 用法：const client = await connect()
import pg from 'pg'

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'yplgskqifsjtdvdkcnmd'

const CANDIDATES = [
  { label: '直连', host: `db.${PROJECT_REF}.supabase.co`, port: 5432, user: 'postgres' },
  ...[
    'ap-southeast-1',
    'ap-northeast-1',
    'ap-northeast-2',
    'us-east-1',
    'us-west-1',
    'eu-west-1',
    'eu-central-1',
  ].map((region) => ({
    label: `pooler ${region}`,
    host: `aws-0-${region}.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${PROJECT_REF}`,
  })),
]

export async function connect() {
  const password = process.env.SUPABASE_DB_PASSWORD
  if (!password) {
    console.error('缺少 SUPABASE_DB_PASSWORD（请用 node --env-file=.env.local 运行）')
    process.exit(1)
  }

  for (const c of CANDIDATES) {
    process.stdout.write(`尝试 ${c.label} (${c.host}) ... `)
    const client = new pg.Client({
      host: c.host,
      port: c.port,
      user: c.user,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 12000,
    })
    try {
      await client.connect()
      console.log('✓ 连接成功')
      return client
    } catch (e) {
      console.log(`✗ ${e.message.split('\n')[0]}`)
      try {
        await client.end()
      } catch {
        /* ignore */
      }
    }
  }
  console.error('\n所有连接方式均失败。请从 Dashboard → Database 设置页复制 Connection string 作为备用。')
  process.exit(1)
}
