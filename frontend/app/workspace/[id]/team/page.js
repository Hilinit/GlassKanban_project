'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'
import Header from '@/components/Header'
import LoadingScreen from '@/components/LoadingScreen'
import TeamManagement from '@/components/TeamManagement'
import WorkspaceNav from '@/components/WorkspaceNav'

// Team Management: yalnız seçilmiş workspace-in komandası (workspace dəyişəndə əvvəlki məlumat silinir)
export default function TeamPage() {
    const { id } = useParams()
    const user = useRequireAuth()
    const [workspace, setWorkspace] = useState(null)
    const [notFound, setNotFound] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!user) return
        let active = true
        setWorkspace(null); setNotFound(false); setError('')

        function load() {
            api(`/api/workspaces/${id}`)
                .then(data => { if (active) { setWorkspace(data.workspace); setNotFound(false) } })
                .catch(err => { if (active) { if (err.status === 404) setNotFound(true); else setError(err.message) } })
        }
        load()
        window.addEventListener('gk-memberships-changed', load)
        return () => { active = false; window.removeEventListener('gk-memberships-changed', load) }
    }, [user, id])

    if (!user) return <LoadingScreen />

    return (
        <div className="container">
            <Header user={user} workspaceId={workspace ? workspace.id : undefined} tab="team" />

            {notFound && (
                <div className="glass-panel center-panel">
                    <i className="fa-regular fa-face-frown big-icon"></i>
                    <p>Bu workspace tapılmadı və ya onun aktiv üzvü deyilsən.</p>
                    <Link href="/" className="btn">Ana səhifəyə qayıt</Link>
                </div>
            )}
            {error && <div className="error-box">{error}</div>}
            {!workspace && !notFound && !error && <LoadingScreen text="Workspace yüklənir..." />}

            {workspace && (
                <>
                    <WorkspaceNav workspace={workspace} tab="team" />
                    <TeamManagement key={workspace.id} workspaceId={workspace.id} />
                </>
            )}
        </div>
    )
}
