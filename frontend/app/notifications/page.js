'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'
import Header from '@/components/Header'
import LoadingScreen from '@/components/LoadingScreen'
import NotificationList from '@/components/NotificationList'

// Bütün bildirişlər (tarixçə)
export default function NotificationsPage() {
    const user = useRequireAuth()
    const [notifications, setNotifications] = useState(null)
    const [unread, setUnread] = useState(0)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        try {
            const data = await api('/api/notifications?limit=100')
            setNotifications(data.notifications)
            setUnread(data.unread_count)
            setError('')
        } catch (err) {
            setError(err.message)
        }
    }, [])

    useEffect(() => {
        if (!user) return
        load()
        const refresh = () => {
            if (!document.hidden) load()
        }
        const timer = setInterval(refresh, 30000)
        window.addEventListener('focus', refresh)
        document.addEventListener('visibilitychange', refresh)
        window.addEventListener('gk-memberships-changed', load)
        return () => {
            clearInterval(timer)
            window.removeEventListener('focus', refresh)
            document.removeEventListener('visibilitychange', refresh)
            window.removeEventListener('gk-memberships-changed', load)
        }
    }, [user, load])

    async function markAllRead() {
        try {
            await api('/api/notifications/read-all', { method: 'POST' })
            window.dispatchEvent(new Event('gk-memberships-changed'))
        } catch (err) {
            setError(err.message)
        }
    }

    if (!user) return <LoadingScreen />

    return (
        <div className="container">
            <Header user={user} />
            <div className="page-head">
                <Link href="/" className="back-link" title="Ana səhifə" aria-label="Ana səhifə">
                    <i className="fa-solid fa-arrow-left"></i>
                </Link>
                <h2 className="board-title static">Bildirişlər</h2>
                {unread > 0 && (
                    <button className="btn-cancel btn-small" onClick={markAllRead} type="button">
                        Hamısını oxunmuş et ({unread})
                    </button>
                )}
            </div>

            {error && <div className="error-box">{error}</div>}
            {!notifications && !error && <div className="skeleton-block"></div>}
            {notifications && (
                <div className="glass-panel">
                    <NotificationList notifications={notifications} onChanged={load} />
                </div>
            )}
        </div>
    )
}
