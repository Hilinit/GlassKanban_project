'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getToken, clearSession } from '@/lib/api'

// Qorunan səhifələrdə istifadə olunur. Giriş edilməyibsə /login-ə göndərir.
// Giriş edilibsə user obyektini qaytarır (yüklənənə qədər null).
export function useRequireAuth() {
    const router = useRouter()
    const [user, setUser] = useState(null)

    useEffect(() => {
        if (!getToken()) {
            router.replace('/login')
            return
        }
        api('/api/auth/me')
            .then(data => setUser(data.user))
            .catch(() => {}) // 401 olarsa api() özü login-ə yönləndirir
    }, [router])

    return user
}

export function logout() {
    clearSession()
    window.location.href = '/login'
}
