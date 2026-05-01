'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Icon from '@/components/Icon'
import Toast from '@/components/Toast'
import { normalizePhoneDigits } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signUp } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // 登录表单
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  // 注册表单
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regName, setRegName] = useState('')

  const [regPhone, setRegPhone] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier || !password) {
      setToast({ message: '请填写邮箱/手机号和密码', type: 'error' })
      return
    }
    setLoading(true)
    const { error } = await signIn(identifier, password)
    setLoading(false)
    if (error) {
      setToast({ message: '登录失败：' + error.message, type: 'error' })
    } else {
      router.push('/dashboard')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regEmail || !regPassword || !regName) {
      setToast({ message: '请填写姓名、邮箱和密码', type: 'error' })
      return
    }
    if (regPhone && normalizePhoneDigits(regPhone).length < 6) {
      setToast({ message: '请输入有效手机号，或留空', type: 'error' })
      return
    }
    if (regPassword.length < 6) {
      setToast({ message: '密码至少需要 6 位', type: 'error' })
      return
    }
    setLoading(true)
    const { error } = await signUp(regEmail, regPhone, regPassword, {
      name: regName,
    })
    setLoading(false)
    if (error) {
      setToast({ message: '注册失败：' + error.message, type: 'error' })
    } else {
      setToast({ message: '注册成功！', type: 'success' })
      router.push('/dashboard')
    }
  }

  return (
    <div className="bg-background-light min-h-screen flex items-center justify-center p-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main className="w-full max-w-[420px] bg-surface-light rounded-3xl shadow-soft border border-white/50 overflow-hidden relative">
        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-6 mb-8">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-emerald-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
              <div className="relative w-24 h-24 bg-white rounded-xl shadow-sm flex items-center justify-center p-2 border border-gray-100">
                <div className="w-full h-full bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon name="school" className="text-primary text-4xl" />
                </div>
              </div>
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-text-main">
                平潭二中移动校园
              </h1>
              <p className="text-text-muted text-sm font-medium">
                {isRegister ? '创建您的教职工账户' : '欢迎回来，请登录您的教职工账户'}
              </p>
            </div>
          </div>

          {/* Login Form */}
          {!isRegister ? (
            <form className="flex flex-col gap-5" onSubmit={handleLogin}>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main ml-1">
                  邮箱或手机号
                </label>
                <div className="relative flex items-center group">
                  <Icon name="mail" className="absolute left-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-background-light border border-transparent rounded-xl focus:bg-white focus:border-primary focus:ring-0 transition-all outline-none text-text-main placeholder:text-gray-400 font-medium"
                    placeholder="请输入邮箱或手机号"
                    type="text"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main ml-1">
                  密码
                </label>
                <div className="relative flex items-center group">
                  <Icon name="lock" className="absolute left-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-11 pr-12 bg-background-light border border-transparent rounded-xl focus:bg-white focus:border-primary focus:ring-0 transition-all outline-none text-text-main placeholder:text-gray-400 font-medium"
                    placeholder="请输入密码"
                    type={showPassword ? 'text' : 'password'}
                  />
                  <button
                    className="absolute right-0 top-0 bottom-0 px-4 flex items-center justify-center text-text-muted hover:text-primary transition-colors focus:outline-none"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-xl" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full h-12 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Icon name="progress_activity" className="animate-spin text-lg" />
                ) : (
                  <>
                    <span>立即登录</span>
                    <Icon name="arrow_forward" className="text-lg" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Register Form */
            <form className="flex flex-col gap-4" onSubmit={handleRegister}>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main ml-1">姓名 *</label>
                <div className="relative flex items-center group">
                  <Icon name="person" className="absolute left-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full h-12 pl-11 pr-4 bg-background-light border border-transparent rounded-xl focus:bg-white focus:border-primary focus:ring-0 transition-all outline-none text-text-main placeholder:text-gray-400 font-medium" placeholder="请输入姓名" type="text" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main ml-1">邮箱 *</label>
                <div className="relative flex items-center group">
                  <Icon name="mail" className="absolute left-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full h-12 pl-11 pr-4 bg-background-light border border-transparent rounded-xl focus:bg-white focus:border-primary focus:ring-0 transition-all outline-none text-text-main placeholder:text-gray-400 font-medium" placeholder="请输入邮箱" type="email" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main ml-1">手机号（选填）</label>
                <div className="relative flex items-center group">
                  <Icon name="phone" className="absolute left-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className="w-full h-12 pl-11 pr-4 bg-background-light border border-transparent rounded-xl focus:bg-white focus:border-primary focus:ring-0 transition-all outline-none text-text-main placeholder:text-gray-400 font-medium" placeholder="填写后可用手机号登录" type="tel" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main ml-1">密码 *</label>
                <div className="relative flex items-center group">
                  <Icon name="lock" className="absolute left-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full h-12 pl-11 pr-4 bg-background-light border border-transparent rounded-xl focus:bg-white focus:border-primary focus:ring-0 transition-all outline-none text-text-main placeholder:text-gray-400 font-medium" placeholder="请设置密码（至少6位）" type="password" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="mt-2 w-full h-12 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-base shadow-lg shadow-primary/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Icon name="progress_activity" className="animate-spin text-lg" /> : <><span>注册账号</span><Icon name="how_to_reg" className="text-lg" /></>}
              </button>
            </form>
          )}

          {/* Toggle */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="relative w-full text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-surface-light px-2 text-text-muted">
                  {isRegister ? '已有账号?' : '还没有账号?'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="inline-flex items-center justify-center w-full h-12 rounded-xl border border-gray-200 bg-transparent hover:bg-gray-50 text-text-main font-semibold transition-colors"
            >
              {isRegister ? '返回登录' : '注册新账号'}
            </button>
          </div>

          {/* Version */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">© 2024 平潭二中信息化中心 v2.1.0</p>
          </div>
        </div>
      </main>
    </div>
  )
}
