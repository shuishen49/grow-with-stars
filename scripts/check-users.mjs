// 查看 Supabase Auth 里已有哪些用户（只读，安全）
// 用法：node --env-file=.env.local scripts/check-users.mjs
import { connect } from './lib/connect.mjs'

const client = await connect()
try {
  const { rows } = await client.query(`
    select u.id,
           u.email,
           u.email_confirmed_at,
           (u.encrypted_password is not null and u.encrypted_password <> '') as has_password,
           u.created_at
    from auth.users u
    order by u.created_at
  `)
  if (rows.length === 0) {
    console.log('还没有任何用户。')
  } else {
    console.log(`共 ${rows.length} 个用户：`)
    for (const r of rows) {
      console.log(
        `  ${r.email ?? '(无邮箱)'}  已确认=${r.email_confirmed_at ? '是' : '否'}  设了密码=${r.has_password ? '是' : '否'}  创建于=${r.created_at.toISOString().slice(0, 19)}`
      )
    }
  }
} finally {
  await client.end()
}
