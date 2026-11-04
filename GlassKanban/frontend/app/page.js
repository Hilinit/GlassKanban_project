'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'
import { useUI } from '@/components/UIProvider'
import Header from '@/components/Header'
import LoadingScreen from '@/components/LoadingScreen'
import WorkspaceSection from '@/components/WorkspaceSection'

function greeting(name) {
    const hour = new Date().getHours()
    const text = hour < 12 ? 'Sabahın xeyir' : hour < 18 ? 'Salam' : 'Axşamın xeyir'
    return `${text}, ${name.split(' ')[0]}`
}

// Ana səhifə: mənim workspace-lərim və onların board-ları
export default function DashboardPage() {
    const user = useRequireAuth()
    const { toast } = useUI()
    const [workspaces, setWorkspaces] = useState(null) // null = hələ yüklənməyib
    const [loadError, setLoadError] = useState('')
    const [creating, setCreating] = useState(false)
    const [newName, setNewName] = useState('')

    async function loadWorkspaces() {
        try {
            const data = await api('/api/workspaces')
            setWorkspaces(data.workspaces)
            setLoadError('')
        } catch (err) {
            setLoadError(err.message)
        }
    }

    useEffect(() => {
        if (user) loadWorkspaces()
    }, [user])

    async function createWorkspace(e) {
        e.preventDefault()
        if (!newName.trim()) return
        try {
            await api('/api/workspaces', { method: 'POST', body: { name: newName } })
            toast(`"${newName.trim()}" workspace-i yaradıldı`, 'success')
            setNewName('')
            setCreating(false)
            loadWorkspaces()
        } catch (err) {
            toast(err.message, 'error')
        }
    }

    if (!user) return <LoadingScreen />

    const boardCount = workspaces ? workspaces.reduce((sum, w) => sum + w.boards.length, 0) : 0
    const ownerCount = workspaces ? workspaces.filter(w => w.role === 'owner').length : 0

    return (
        <div className="container">
            <Header user={user} />

            <main>
                <section className="hero">
                    <div>
                        <h2 className="hero-title">{greeting(user.name)}</h2>
                        <p className="hero-sub">Bu gün hansı layihə üzərində işləyirsən?</p>
                    </div>

                    {workspaces && (
                        <div className="stat-row">
                            <div className="stat"><strong>{workspaces.length}</strong><span>Workspace</span></div>
                            <div className="stat"><strong>{boardCount}</strong><span>Board</span></div>
                            <div className="stat"><strong>{ownerCount}</strong><span>Sahibi olduğun</span></div>
                        </div>
                    )}
                </section>

                <div className="section-bar">
                    <h3>Workspace-lərin</h3>
                    {!creating && (
                        <button className="btn" onClick={() => setCreating(true)} type="button">
                            <i className="fa-solid fa-plus"></i> Yeni workspace
                        </button>
                    )}
                </div>

                {creating && (
                    <form className="glass-panel new-workspace" onSubmit={createWorkspace}>
                        <input
                            className="input"
                            autoFocus
                            placeholder="Workspace adı (məs: Universitet, Komanda)"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                        <button className="btn" type="submit">Yarat</button>
                        <button className="btn-cancel" type="button" onClick={() => { setCreating(false); setNewName('') }}>Ləğv et</button>
                    </form>
                )}

                {loadError && (
                    <div className="error-box">
                        {loadError}{' '}
                        <button className="link-btn" onClick={loadWorkspaces} type="button">Yenidən cəhd et</button>
                    </div>
                )}

                {!workspaces && !loadError && (
                    <>
                        <div className="workspace skeleton-block"></div>
                        <div className="workspace skeleton-block"></div>
                    </>
                )}

                {workspaces && workspaces.length === 0 && (
                    <div className="glass-panel center-panel">
                        <i className="fa-regular fa-folder-open big-icon"></i>
                        <p>Hələ workspace-in yoxdur. İlk workspace-ini yarat!</p>
                    </div>
                )}

                {workspaces && workspaces.map(ws => (
                    <WorkspaceSection
                        key={ws.id}
                        workspace={ws}
                        user={user}
                        onChange={loadWorkspaces}
                    />
                ))}
            </main>
        </div>
    )
}
