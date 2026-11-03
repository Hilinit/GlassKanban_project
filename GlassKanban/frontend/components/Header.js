'use client'
import Link from 'next/link'
import { logout } from '@/lib/auth'

// Üst panel: loqo + (istəyə görə) idarəetmə elementləri + istifadəçi
export default function Header({ user, children }) {
    return (
        <header className="header">
            <Link href="/" className="logo-box">
                <div className="logo-icon">GK</div>
                <h1 className="logo-text">GlassKanban</h1>
            </Link>

            <div className="controls">
                {children}
                {user && (
                    <div className="user-box">
                        <span className="user-name"><i className="fa-regular fa-user"></i> {user.name}</span>
                        <button className="btn-cancel" onClick={logout} type="button">
                            <i className="fa-solid fa-right-from-bracket"></i> Çıxış
                        </button>
                    </div>
                )}
            </div>
        </header>
    )
}
