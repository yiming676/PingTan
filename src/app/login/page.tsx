'use client'

import TextType from '@/components/react-bits/TextType'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Icon from '@/components/Icon'
import Toast from '@/components/Toast'
import { isEmailIdentifier, normalizePhoneDigits } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading, signIn, signUp } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard')
    }
  }, [authLoading, user, router])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!identifier.trim() || !password) {
      setToast({ message: '请填写邮箱/手机号和密码', type: 'error' })
      return
    }

    setLoading(true)
    const { error } = await signIn(identifier, password)
    setLoading(false)

    if (error) {
      setToast({ message: `登录失败：${error.message}`, type: 'error' })
    } else {
      router.replace('/dashboard')
    }
  }

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()

    const email = regEmail.trim()
    const phone = normalizePhoneDigits(regPhone)

    if (!regName.trim() || !regPassword) {
      setToast({ message: '请填写姓名和密码', type: 'error' })
      return
    }

    if (!phone) {
      setToast({ message: '请填写手机号', type: 'error' })
      return
    }

    if (email && !isEmailIdentifier(email)) {
      setToast({ message: '请输入有效邮箱', type: 'error' })
      return
    }

    if (!/^1\d{10}$/.test(phone)) {
      setToast({ message: '请输入有效的 11 位手机号', type: 'error' })
      return
    }

    if (regPassword.length < 6) {
      setToast({ message: '密码至少需要 6 位', type: 'error' })
      return
    }

    setLoading(true)
    const { error } = await signUp(email, phone, regPassword, {
      name: regName,
    })
    setLoading(false)

    if (error) {
      setToast({ message: `注册失败：${error.message}`, type: 'error' })
    } else {
      router.replace('/dashboard')
    }
  }

  return (
    <div className="bg-background-light min-h-screen flex items-center justify-center p-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main className="w-full max-w-[420px] bg-surface-light rounded-3xl shadow-soft border border-white/50 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 mb-8">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-emerald-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
              <div className="relative w-24 h-24 bg-white rounded-xl shadow-sm flex items-center justify-center p-2 border border-gray-100">
                <div className="w-full h-full bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon name="school" className="text-primary text-4xl" />
                </div>
              </div>
            </div>
            <div className="text-center space-y-1 min-h-[68px]">
              <TextType
                as="h1"
                text="平潭二中移动校园"
                typingSpeed={90}
                initialDelay={150}
                loop={false}
                showCursor
                cursorCharacter="_"
                cursorBlinkDuration={0.6}
                className="text-2xl font-bold text-text-main"
              />

              <TextType
                key={isRegister ? 'register-subtitle' : 'login-subtitle'}
                as="p"
                text={isRegister ? '创建教职工账号' : '欢迎回来，请登录教职工账号'}
                typingSpeed={45}
                initialDelay={900}
                loop={false}
                showCursor
                cursorCharacter="_"
                cursorClassName="text-primary"
                className="text-text-muted text-sm font-medium"
              />
            </div>
          </div>
          
          {!isRegister ? (
            <form className="flex flex-col gap-5" onSubmit={handleLogin}>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main ml-1">邮箱或手机号</label>
                <div className="relative flex items-center group">
                  <Icon name="mail" className="absolute left-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-background-light border border-transparent rounded-xl focus:bg-white focus:border-primary focus:ring-0 transition-all outline-none text-text-main placeholder:text-gray-400 font-medium"
                    placeholder="请输入邮箱或手机号"
                    type="text"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main ml-1">密码</label>
                <div className="relative flex items-center group">
                  <Icon name="lock" className="absolute left-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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
            <form className="flex flex-col gap-4" onSubmit={handleRegister}>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main ml-1">姓名 *</label>
                <div className="relative flex items-center group">
                  <Icon name="person" className="absolute left-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    value={regName}
                    onChange={(event) => setRegName(event.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-background-light border border-transparent rounded-xl focus:bg-white focus:border-primary focus:ring-0 transition-all outline-none text-text-main placeholder:text-gray-400 font-medium"
                    placeholder="请输入姓名"
                    type="text"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main ml-1">邮箱</label>
                <div className="relative flex items-center group">
                  <Icon name="mail" className="absolute left-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    value={regEmail}
                    onChange={(event) => setRegEmail(event.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-background-light border border-transparent rounded-xl focus:bg-white focus:border-primary focus:ring-0 transition-all outline-none text-text-main placeholder:text-gray-400 font-medium"
                    placeholder="请输入邮箱"
                    type="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main ml-1">手机号 *</label>
                <div className="relative flex items-center group">
                  <Icon name="phone" className="absolute left-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    value={regPhone}
                    onChange={(event) => setRegPhone(event.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-background-light border border-transparent rounded-xl focus:bg-white focus:border-primary focus:ring-0 transition-all outline-none text-text-main placeholder:text-gray-400 font-medium"
                    placeholder="请输入 11 位手机号"
                    type="tel"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-main ml-1">密码 *</label>
                <div className="relative flex items-center group">
                  <Icon name="lock" className="absolute left-4 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    value={regPassword}
                    onChange={(event) => setRegPassword(event.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-background-light border border-transparent rounded-xl focus:bg-white focus:border-primary focus:ring-0 transition-all outline-none text-text-main placeholder:text-gray-400 font-medium"
                    placeholder="请设置密码（至少 6 位）"
                    type="password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full h-12 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-base shadow-lg shadow-primary/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Icon name="progress_activity" className="animate-spin text-lg" />
                ) : (
                  <>
                    <span>注册账号</span>
                    <Icon name="how_to_reg" className="text-lg" />
                  </>
                )}
              </button>
            </form>
          )}

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
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="inline-flex items-center justify-center w-full h-12 rounded-xl border border-gray-200 bg-transparent hover:bg-gray-50 text-text-main font-semibold transition-colors"
            >
              {isRegister ? '返回登录' : '注册新账号'}
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">© 2024 平潭二中信息化中心 v2.1.0</p>
          </div>
        </div>
      </main>
    </div>
  )
}
