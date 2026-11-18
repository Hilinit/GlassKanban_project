'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, saveSession } from '@/lib/api'

const FEATURES = [
    { icon: 'fa-layer-group', title: 'Workspace və komanda', text: 'Komanda üzvlərini dəvət et, eyni layihədə birlikdə işləyin.' },
    { icon: 'fa-hand', title: 'Sürüşdürməklə idarə', text: 'Tapşırıqları və sütunları tutub istədiyin yerə at.' },
    { icon: 'fa-cloud', title: 'Hər cihazdan eyni məlumat', text: 'Telefon, noutbuk fərq etmir: hər şey bulud bazasında saxlanılır.' }
]

// Həm giriş, həm qeydiyyat üçün eyni forma. mode = 'login' | 'register'
export default function AuthForm({ mode }) {
    const router = useRouter()
    const isRegister = mode === 'register'

    const [name, setName] = useState('')
    const [surname, setSurname] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const body = isRegister ? { name, surname, email, password } : { email, password }
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
            <div className="auth-layout">
                <div className="auth-intro">
                    <div className="logo-box">
                        <div className="logo-icon">GK</div>
                        <h1 className="logo-text">GlassKanban</h1>
                    </div>
                    <h2 className="auth-headline">Komanda ilə birlikdə işlə,<br />hər şey bir lövhədə.</h2>
                    <ul className="feature-list">
                        {FEATURES.map(f => (
                            <li key={f.title}>
                                <div className="feature-icon"><i className={`fa-solid ${f.icon}`}></i></div>
                                <div>
                                    <strong>{f.title}</strong>
                                    <p>{f.text}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="auth-card">
                    <h2 className="auth-title">{isRegister ? 'Hesab yarat' : 'Xoş gəldin'}</h2>
                    <p className="auth-sub">{isRegister ? 'Qeydiyyatdan keç və ilk workspace-in hazır olsun.' : 'Hesabına daxil ol.'}</p>

                    <form onSubmit={handleSubmit}>
                        {isRegister && (
                            <div className="field-row">
                                <div className="field">
                                    <label>Ad</label>
                                    <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Məs: Abi" required />
                                </div>
                                <div className="field">
                                    <label>Soyad</label>
                                    <input className="input" value={surname} onChange={e => setSurname(e.target.value)} placeholder="Məs: İsmayılzadə" required />
                                </div>
                            </div>
                        )}
                        <div className="field">
                            <label>E-poçt</label>
                            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ad@mail.com" required />
                        </div>
                        <div className="field">
                            <label>Şifrə</label>
                            <div className="password-box">
                                <input
                                    className="input"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Ən azı 6 simvol"
                                    minLength={6}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    title={showPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
                                >
                                    <i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}></i>
                                </button>
                            </div>
                        </div>

                        {error && <div className="error-box">{error}</div>}

                        <button className="btn btn-full" type="submit" disabled={loading}>
                            {loading ? <><span className="spinner spinner-small"></span> Gözlə...</> : isRegister ? 'Qeydiyyatdan keç' : 'Daxil ol'}
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
        </div>
    )
}
