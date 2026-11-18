'use client'
import { useState } from 'react'
import { initials } from '@/lib/format'

// Profil şəkli varsa onu, yoxsa adın baş hərflərini göstərir. size: small | (boş) | lg | xl
export default function Avatar({ user, size, title }) {
    const [failedUrl, setFailedUrl] = useState('')
    const className = `avatar${size ? ` avatar-${size}` : ''}`
    const name = user ? user.name : ''
    const avatarUrl = user && user.avatar_url
    if (avatarUrl && failedUrl !== avatarUrl) {
        return <img className={`${className} avatar-img`} src={avatarUrl} alt={name} title={title || name} onError={() => setFailedUrl(avatarUrl)} />
    }
    return <div className={className} title={title || name}>{initials(name)}</div>
}
