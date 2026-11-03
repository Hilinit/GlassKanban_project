// Backend ilə danışmaq üçün tək yer.
// İstifadə: const data = await api('/api/workspaces')
//           await api('/api/workspaces', { method: 'POST', body: { name: 'Komanda' } })

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export function getToken() {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('gk-token')
}

export function saveSession(token) {
    localStorage.setItem('gk-token', token)
}

export function clearSession() {
    localStorage.removeItem('gk-token')
}

export async function api(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) headers.Authorization = 'Bearer ' + token

    let response
    try {
        response = await fetch(API_URL + path, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        })
    } catch (err) {
        // Render pulsuz planda server yatır və ilk sorğuda oyanması 30-60 saniyə çəkə bilər
        throw new Error('Serverlə əlaqə qurulmadı. Server oyanırsa bir az gözləyib yenidən cəhd et.')
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
        // Token köhnəlibsə, login səhifəsinə qaytar (login/register sorğuları istisnadır)
        if (response.status === 401 && !path.startsWith('/api/auth/login') && !path.startsWith('/api/auth/register')) {
            clearSession()
            window.location.href = '/login'
        }
        const error = new Error(data.error || 'Xəta baş verdi')
        error.status = response.status
        throw error
    }
    return data
}
