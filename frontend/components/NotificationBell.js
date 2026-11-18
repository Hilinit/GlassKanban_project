'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import NotificationList from '@/components/NotificationList'

// Header-dəki zəng: oxunmamış sayı + açılan bildiriş paneli
export default function NotificationBell() {
    const [count, setCount] = useState(0)
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState(null)
    const wrapRef = useRef(null)
    const openRef = useRef(false)

    const refreshCount = useCallback(async () => {
        try {
            const data = await api('/api/notifications/unread-count')
            setCount(data.unread_count)
        } catch (err) { /* şəbəkə problemi: növbəti dəfə yenilənəcək */ }
    }, [])

    const loadItems = useCallback(async () => {
        try {
            const data = await api('/api/notifications?limit=10')
            setItems(data.notifications)
            setCount(data.unread_count)
        } catch (err) { /* vacib deyil */ }
    }, [])

    useEffect(() => { openRef.current = open }, [open])

    // 30 saniyədən bir, pəncərə fokuslananda və dəvət cavablananda sayı yenilə
    useEffect(() => {
        refreshCount()
        const refresh = () => (openRef.current ? loadItems() : refreshCount())
        const timer = setInterval(() => { if (!document.hidden) refresh() }, 30000)
        window.addEventListener('focus', refresh)
        window.addEventListener('gk-memberships-changed', refresh)
        return () => {
            clearInterval(timer)
            window.removeEventListener('focus', refresh)
            window.removeEventListener('gk-memberships-changed', refresh)
        }
    }, [refreshCount, loadItems])

    // Panelin kənarına klik edəndə bağla
    useEffect(() => {
        function onClick(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onClick)
        return () => document.removeEventListener('mousedown', onClick)
    }, [])

    function toggle() {
        const next = !open
        setOpen(next)
        if (next) loadItems()
    }

    async function markAllRead() {
        try {
            await api('/api/notifications/read-all', { method: 'POST' })
            loadItems()
        } catch (err) { /* vacib deyil */ }
    }

    return (
        <div className="bell-wrap" ref={wrapRef}>
            <button className="icon-btn icon-btn-lg bell-btn" onClick={toggle} title="Bildirişlər" aria-label="Bildirişlər" type="button">
                <i className="fa-regular fa-bell"></i>
                {count > 0 && <span className="bell-badge" data-testid="bell-count">{count > 9 ? '9+' : count}</span>}
            </button>

            {open && (
                <div className="bell-panel">
                    <div className="bell-panel-head">
                        <strong>Bildirişlər</strong>
                        {count > 0 && <button className="link-btn" onClick={markAllRead} type="button">Hamısını oxunmuş et</button>}
                    </div>
                    {items === null
                        ? <div className="skeleton-line"></div>
                        : <NotificationList notifications={items} onChanged={loadItems} />}
                    <Link href="/notifications" className="bell-panel-footer" onClick={() => setOpen(false)}>
                        Bütün bildirişlər (tarixçə)
                    </Link>
                </div>
            )}
        </div>
    )
}
