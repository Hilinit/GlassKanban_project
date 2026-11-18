'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

// Workspace dəyişdirici: yalnız aktiv üzv olduğum workspace-lər. Seçiləndə həmin workspace-in səhifəsinə keçir
// (eyni bölmədə qalır: Board-lar, Komanda və ya Layihə haqqında).
export default function WorkspaceSwitcher({ currentId, tab }) {
    const router = useRouter()
    const [workspaces, setWorkspaces] = useState([])

    useEffect(() => {
        let active = true
        function load() {
            api('/api/workspaces')
                .then(data => { if (active) setWorkspaces(data.workspaces) })
                .catch(() => {})
        }
        load()
        window.addEventListener('gk-memberships-changed', load)
        window.addEventListener('gk-workspaces-changed', load)
        return () => {
            active = false
            window.removeEventListener('gk-memberships-changed', load)
            window.removeEventListener('gk-workspaces-changed', load)
        }
    }, [])

    if (workspaces.length === 0) return null

    return (
        <div className="switcher">
            <i className="fa-solid fa-layer-group"></i>
            <select
                className="filter-select switcher-select"
                value={currentId}
                onChange={e => router.push(`/workspace/${e.target.value}${tab === 'team' ? '/team' : tab === 'about' ? '/about' : ''}`)}
                aria-label="Workspace seç"
            >
                {workspaces.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                ))}
            </select>
        </div>
    )
}
