'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'
import Header from '@/components/Header'
import LoadingScreen from '@/components/LoadingScreen'
import WorkspaceNav from '@/components/WorkspaceNav'
import WorkspaceSection from '@/components/WorkspaceSection'

export default function WorkspacePage() {
    const { id } = useParams()
    const user = useRequireAuth()
    const [workspace, setWorkspace] = useState(null)
    const [notFound, setNotFound] = useState(false)
    const [error, setError] = useState('')

    const loadWorkspace = useCallback(async () => {
        try {
            const data = await api(`/api/workspaces/${id}`)
            setWorkspace(data.workspace)
            setNotFound(false)
            setError('')
        } catch (err) {
            setWorkspace(null)
            if (err.status === 404) setNotFound(true)
            else setError(err.message)
        }
    }, [id])

    useEffect(() => {
        if (!user) return
        let active = true
        setWorkspace(null)
        setNotFound(false)
        setError('')
        api(`/api/workspaces/${id}`)
            .then(data => {
                if (active) setWorkspace(data.workspace)
            })
            .catch(err => {
                if (!active) return
                if (err.status === 404) setNotFound(true)
                else setError(err.message)
            })
        return () => { active = false }
    }, [user, id])

    if (!user) return <LoadingScreen />

    return (
        <div className="container">
            <Header user={user} workspaceId={workspace ? workspace.id : undefined} tab="boards" />

            {workspace && <WorkspaceNav workspace={workspace} tab="boards" />}
            {notFound && (
                <div className="glass-panel center-panel">
                    <i className="fa-regular fa-face-frown big-icon"></i>
                    <p>Bu workspace tapılmadı və ya onun aktiv üzvü deyilsən.</p>
                    <Link href="/" className="btn">Ana səhifəyə qayıt</Link>
                </div>
            )}
            {error && (
                <div className="error-box">
                    {error}{' '}
                    <button className="link-btn" onClick={loadWorkspace} type="button">Yenidən cəhd et</button>
                </div>
            )}
            {!workspace && !notFound && !error && <LoadingScreen text="Workspace yüklənir..." />}
            {workspace && (
                <WorkspaceSection
                    key={workspace.id}
                    workspace={workspace}
                    user={user}
                    onChange={loadWorkspace}
                    showWorkspaceHeader={false}
                />
            )}
        </div>
    )
}
