'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, saveSession } from '@/lib/api'

// Həm giriş, həm qeydiyyat üçün eyni forma. mode = 'login' | 'register'
export default function AuthForm({ mode }) {
    const router = useRouter()
    const isRegister = mode === 'register'

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const body = isRegister ? { name, email, password } : { email, password }
            const data = await api(isRegister ? '/api/auth/register' : '/api/auth/login', { method: 'POST', body })
            saveSession(data.token)
            router.replace('/')
        } catch (err) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="logo-box auth-logo">
                    <div className="logo-icon">GK</div>
                    <h1 className="logo-text">GlassKanban</h1>
                </div>
                <h2 className="auth-title">{isRegister ? 'Qeydiyyat' : 'Daxil ol'}</h2>

                <form onSubmit={handleSubmit}>
                    {isRegister && (
                        <div className="field">
                            <label>Ad</label>
                            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Məs: Abi" required />
                        </div>
                    )}
                    <div className="field">
                        <label>E-poçt</label>
                        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ad@mail.com" required />
                    </div>
                    <div className="field">
                        <label>Şifrə</label>
                        <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ən azı 6 simvol" minLength={6} required />
                    </div>

                    {error && <div className="error-box">{error}</div>}

                    <button className="btn btn-full" type="submit" disabled={loading}>
                        {loading ? 'Gözlə...' : isRegister ? 'Qeydiyyatdan keç' : 'Daxil ol'}
                    </button>
                </form>

                <p className="auth-switch">
                    {isRegister ? 'Artıq hesabın var? ' : 'Hesabın yoxdur? '}
                    <Link href={isRegister ? '/login' : '/register'}>
                        {isRegister ? 'Daxil ol' : 'Qeydiyyatdan keç'}
                    </Link>
                </p>
            </div>
        </div>
    )
}
