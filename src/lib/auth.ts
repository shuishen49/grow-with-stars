import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * 注册：邮箱 + 密码。
 * 只要后台关掉了「Confirm email」，注册完当场就有登录状态，**一封邮件都不发**。
 */
export async function signUpWithPassword(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('未配置 Supabase，只能使用本机模式')
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  })
  if (error) throw new Error(authErrorCN(error.message))
  if (!data.session) {
    throw new Error(
      '这个账号还需要邮件确认才能登录。请到 Supabase 后台 Authentication → Sign In / Providers → Email，关掉「Confirm email」后重新注册一次。',
    )
  }
}

/** 登录：邮箱 + 密码 */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('未配置 Supabase，只能使用本机模式')
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
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
  if (m.includes('invalid login credentials')) return '邮箱或密码不对，再试一次'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return '这个邮箱已经注册过了，请切到「登录」'
  if (m.includes('email not confirmed')) return '邮箱还没确认，请去邮箱点确认链接'
  if (m.includes('password should be at least')) return '密码至少 6 位'
  if (m.includes('password is too weak') || m.includes('weak password'))
    return '密码太简单了，换长一点或混上数字'
  if (m.includes('unable to validate email address') || m.includes('invalid email'))
    return '邮箱格式不对，请检查'
  if (m.includes('signup is disabled') || m.includes('signups not allowed'))
    return '这个 Supabase 项目关掉了注册，请到后台 Authentication → Sign In / Providers → Email 打开「Allow new users to sign up」'
  if (m.includes('rate limit'))
    return 'Supabase 想发确认邮件但被限流了。请到后台 Authentication → Sign In / Providers → Email 关掉「Confirm email」，之后注册和登录都不用发邮件。'
  if (m.includes('for security purposes')) return '操作太频繁，请等一分钟再试'
  if (m.includes('both auth code and code verifier')) return '请在打开验证码邮件的同一个浏览器里完成登录'
  return msg
}
