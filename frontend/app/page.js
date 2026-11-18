'use client'
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'
import { useUI } from '@/components/UIProvider'
import Header from '@/components/Header'
import LoadingScreen from '@/components/LoadingScreen'
import Modal from '@/components/Modal'
import WorkspaceSection from '@/components/WorkspaceSection'

const EMPTY_WORKSPACE_FORM = {
    name: '',
    description: '',
    goal: '',
    category: '',
    start_date: '',
    end_date: ''
}

export default function HomePage() {
    const user = useRequireAuth()
    const { toast } = useUI()
    const [workspaces, setWorkspaces] = useState(null)
    const [workspaceForm, setWorkspaceForm] = useState(EMPTY_WORKSPACE_FORM)
    const [loadError, setLoadError] = useState('')
    const [creating, setCreating] = useState(false)
    const [createModalOpen, setCreateModalOpen] = useState(false)

    const loadWorkspaces = useCallback(async () => {
        try {
            const data = await api('/api/workspaces')
            setWorkspaces(data.workspaces)
            setLoadError('')
        } catch (err) {
            setLoadError(err.message)
        }
    }, [])

    useEffect(() => {
        if (!user) return
        loadWorkspaces()
        window.addEventListener('gk-workspaces-changed', loadWorkspaces)
        return () => window.removeEventListener('gk-workspaces-changed', loadWorkspaces)
    }, [user, loadWorkspaces])

    async function createWorkspace(e) {
        e.preventDefault()
        const name = workspaceForm.name.trim()
        if (!name || creating) return

        setCreating(true)
        try {
            await api('/api/workspaces', {
                method: 'POST',
                body: {
                    ...workspaceForm,
                    name,
                    description: workspaceForm.description.trim(),
                    goal: workspaceForm.goal.trim(),
                    category: workspaceForm.category.trim(),
                    start_date: workspaceForm.start_date || null,
                    end_date: workspaceForm.end_date || null
                }
            })
            setWorkspaceForm(EMPTY_WORKSPACE_FORM)
            setCreateModalOpen(false)
            await loadWorkspaces()
            toast('Workspace yaradıldı', 'success')
        } catch (err) {
            toast(err.message, 'error')
        } finally {
            setCreating(false)
        }
    }

    if (!user) return <LoadingScreen />

    return (
        <div className="container">
            <Header user={user} />

            <div className="board-bar">
                <h2>Workspace-lər</h2>
                <button className="btn" type="button" onClick={() => setCreateModalOpen(true)}>
                    <i className="fa-solid fa-plus"></i> Workspace yarat
                </button>
            </div>

            {createModalOpen && (
                <Modal
                    title="Yeni workspace / layihə"
                    size="wide"
                    onClose={() => { if (!creating) setCreateModalOpen(false) }}
                >
                    <form className="workspace-create-form" onSubmit={createWorkspace}>
                        <p className="hint workspace-create-intro">Workspace yaradın və layihə haqqında əsas məlumatları daxil edin.</p>
                        <div className="field-row">
                            <div className="field">
                                <label htmlFor="workspace-name">Workspace adı</label>
                                <input
                                    id="workspace-name"
                                    className="input"
                                    value={workspaceForm.name}
                                    onChange={e => setWorkspaceForm({ ...workspaceForm, name: e.target.value })}
                                    maxLength={100}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="workspace-category">Kateqoriya</label>
                                <input
                                    id="workspace-category"
                                    className="input"
                                    value={workspaceForm.category}
                                    onChange={e => setWorkspaceForm({ ...workspaceForm, category: e.target.value })}
                                    maxLength={60}
                                    placeholder="Məs: Təhsil, IT"
                                />
                            </div>
                        </div>
                        <div className="field">
                            <label htmlFor="workspace-description">Layihənin təsviri</label>
                            <textarea
                                id="workspace-description"
                                className="input"
                                rows={3}
                                value={workspaceForm.description}
                                onChange={e => setWorkspaceForm({ ...workspaceForm, description: e.target.value })}
                                maxLength={2000}
                                placeholder="Layihə haqqında qısa məlumat"
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="workspace-goal">Layihənin məqsədi</label>
                            <textarea
                                id="workspace-goal"
                                className="input"
                                rows={2}
                                value={workspaceForm.goal}
                                onChange={e => setWorkspaceForm({ ...workspaceForm, goal: e.target.value })}
                                maxLength={2000}
                                placeholder="Layihənin əsas məqsədi"
                            />
                        </div>
                        <div className="field-row">
                            <div className="field">
                                <label htmlFor="workspace-start-date">Başlama tarixi</label>
                                <input
                                    id="workspace-start-date"
                                    className="input"
                                    type="date"
                                    value={workspaceForm.start_date}
                                    max={workspaceForm.end_date || undefined}
                                    onChange={e => setWorkspaceForm({ ...workspaceForm, start_date: e.target.value })}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="workspace-end-date">Bitmə tarixi</label>
                                <input
                                    id="workspace-end-date"
                                    className="input"
                                    type="date"
                                    value={workspaceForm.end_date}
                                    min={workspaceForm.start_date || undefined}
                                    onChange={e => setWorkspaceForm({ ...workspaceForm, end_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button
                                className="btn-cancel"
                                type="button"
                                disabled={creating}
                                onClick={() => setCreateModalOpen(false)}
                            >
                                Ləğv et
                            </button>
                            <button className="btn" type="submit" disabled={creating}>
                                {creating ? 'Yaradılır...' : 'Workspace yarat'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {loadError && (
                <div className="error-box">
                    {loadError}{' '}
                    <button className="link-btn" onClick={loadWorkspaces} type="button">Yenidən cəhd et</button>
                </div>
            )}

            {workspaces === null && !loadError && <LoadingScreen text="Workspace-lər yüklənir..." />}
            {workspaces && workspaces.length === 0 && (
                <div className="glass-panel center-panel">
                    <i className="fa-solid fa-layer-group big-icon"></i>
                    <p>Hələ workspace yoxdur. Başlamaq üçün birini yarat.</p>
                </div>
            )}
            {workspaces && workspaces.map(workspace => (
                <WorkspaceSection
                    key={workspace.id}
                    workspace={workspace}
                    user={user}
                    onChange={loadWorkspaces}
                />
            ))}
        </div>
    )
}
