'use client'
import Link from 'next/link'
import { logout } from '@/lib/auth'
import { initials } from '@/lib/format'

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
                        <div className="avatar" title={user.email}>{initials(user.name)}</div>
                        <span className="user-name">{user.name}</span>
                        <button className="btn-cancel" onClick={logout} type="button" title="Çıxış">
                            <i className="fa-solid fa-right-from-bracket"></i>
                            <span className="hide-mobile">Çıxış</span>
                        </button>
                    </div>
                )}
            </div>
        </header>
    )
}
