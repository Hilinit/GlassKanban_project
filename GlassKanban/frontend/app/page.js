'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'
import Header from '@/components/Header'
import WorkspaceSection from '@/components/WorkspaceSection'

// Ana səhifə: mənim workspace-lərim və onların board-ları
export default function DashboardPage() {
    const user = useRequireAuth()
    const [workspaces, setWorkspaces] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [newName, setNewName] = useState('')

    async function loadWorkspaces() {
        try {
            const data = await api('/api/workspaces')
            setWorkspaces(data.workspaces)
            setError('')
        } catch (err) {
            setError(err.message)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (user) loadWorkspaces()
    }, [user])

    async function createWorkspace(e) {
        e.preventDefault()
        if (!newName.trim()) return
        try {
            await api('/api/workspaces', { method: 'POST', body: { name: newName } })
            setNewName('')
            loadWorkspaces()
        } catch (err) {
            setError(err.message)
        }
    }

    if (!user) return <div className="page-loading">Yüklənir...</div>

    return (
        <div className="container">
            <Header user={user} />

            <main>
                <form className="glass-panel new-workspace" onSubmit={createWorkspace}>
                    <input
                        className="input"
                        placeholder="Yeni workspace adı (məs: Universitet, Komanda)"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                    />
                    <button className="btn" type="submit">
                        <i className="fa-solid fa-plus"></i> Workspace yarat
                    </button>
                </form>

                {error && <div className="error-box">{error}</div>}
                {loading && <div className="page-loading">Yüklənir...</div>}

                {workspaces.map(ws => (
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
