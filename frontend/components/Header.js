'use client'
import Link from 'next/link'
import { logout } from '@/lib/auth'
import Avatar from '@/components/Avatar'
import NotificationBell from '@/components/NotificationBell'
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher'

// Üst panel: loqo + (workspace dəyişdirici) + (idarəetmə elementləri) + bildirişlər + şəxsi profil
export default function Header({ user, workspaceId, tab, children }) {
    return (
        <header className="header">
            <div className="header-left">
                <Link href="/" className="logo-box">
                    <div className="logo-icon">GK</div>
                    <h1 className="logo-text">GlassKanban</h1>
                </Link>
                {workspaceId && <WorkspaceSwitcher currentId={workspaceId} tab={tab} />}
            </div>

            <div className="controls">
                {children}
                {user && (
                    <div className="user-box">
                        <NotificationBell />
                        <Link href="/profile" className="user-link" title="Şəxsi profil">
                            <Avatar user={user} />
                            <span className="user-name">{user.name}</span>
                        </Link>
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
