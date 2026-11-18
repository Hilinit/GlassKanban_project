'use client'
import { useEffect, useState } from 'react'

// Yüklənmə göstəricisi. 5 saniyədən uzun çəkərsə, serverin yatmış ola biləcəyini deyir
export default function LoadingScreen({ text = 'Yüklənir...' }) {
    const [slow, setSlow] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setSlow(true), 5000)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="page-loading">
            <div className="spinner"></div>
            <p>{text}</p>
            {slow && <p className="slow-hint">Server yatmış ola bilər, oyanması 30-60 saniyə çəkə bilər. Bir az gözlə.</p>}
        </div>
    )
}
