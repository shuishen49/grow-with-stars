import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

/** 邮箱验证码登录：发送 6 位数字验证码（没有账号会自动创建，家庭自用无需审核） */
export async function sendEmailCode(email: string): Promise<void> {
  if (!supabase) throw new Error('未配置 Supabase，只能使用本机模式')
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  })
  if (error) throw new Error(authErrorCN(error.message))
}

/** 校验 6 位数字验证码，成功即登录 */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  if (!supabase) throw new Error('未配置 Supabase，只能使用本机模式')
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'email',
  })
  if (error) throw new Error(authErrorCN(error.message))
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session ?? null
}

/** 订阅登录状态变化，返回取消订阅函数 */
export function onAuthChange(cb: (s: Session | null) => void): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s))
  return () => data.subscription.unsubscribe()
}

/** Supabase 英文报错 → 中文友好提示 */
export function authErrorCN(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return '邮箱或密码错误'
  if (m.includes('email not confirmed')) return '邮箱还没确认，请先去邮箱点确认链接'
  if (m.includes('user already registered')) return '该邮箱已注册，请直接登录'
  if (m.includes('token has expired') || m.includes('otp_expired')) return '验证码已过期，请重新获取'
  if (m.includes('invalid token') || m.includes('token is invalid'))
    return '验证码不对，请检查后重填'
  if (m.includes('email rate limit') || m.includes('over_email_send_rate_limit'))
    return '发邮件太频繁了，请稍等一会儿再试'
  if (m.includes('password should be at least')) return '密码至少 6 位'
  if (m.includes('unable to validate email address') || m.includes('invalid email'))
    return '邮箱格式不对，请检查'
  if (m.includes('signup is disabled')) return '该站点暂未开放注册'
  if (m.includes('both auth code and code verifier')) return '请在打开验证码邮件的同一个浏览器里完成登录'
  return msg
}
