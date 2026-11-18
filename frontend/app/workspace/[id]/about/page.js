'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'
import { useUI } from '@/components/UIProvider'
import Header from '@/components/Header'
import LoadingScreen from '@/components/LoadingScreen'
import WorkspaceNav from '@/components/WorkspaceNav'
import { formatDate } from '@/lib/format'

function formFromWorkspace(workspace) {
    return {
        name: workspace.name || '',
        description: workspace.description || '',
        goal: workspace.goal || '',
        category: workspace.category || '',
        start_date: workspace.start_date || '',
        end_date: workspace.end_date || ''
    }
}

export default function WorkspaceAboutPage() {
    const { id } = useParams()
    const user = useRequireAuth()
    const { toast } = useUI()
    const [workspace, setWorkspace] = useState(null)
    const [form, setForm] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [notFound, setNotFound] = useState(false)
    const [saving, setSaving] = useState(false)
    const loadRequest = useRef(0)

    const loadWorkspace = useCallback(async () => {
        const request = ++loadRequest.current
        try {
            const data = await api(`/api/workspaces/${id}`)
            if (request !== loadRequest.current) return
            setWorkspace(data.workspace)
            setForm(formFromWorkspace(data.workspace))
            setLoadError('')
            setNotFound(false)
        } catch (err) {
            if (request !== loadRequest.current) return
            setWorkspace(null)
            setForm(null)
            if (err.status === 404) setNotFound(true)
            else setLoadError(err.message)
        }
    }, [id])

    useEffect(() => {
        if (!user) return
        setWorkspace(null)
        setForm(null)
        setLoadError('')
        setNotFound(false)
        loadWorkspace()
        return () => { loadRequest.current++ }
    }, [user, loadWorkspace])

    function updateField(key, value) {
        setForm(current => ({ ...current, [key]: value }))
    }

    async function save(e) {
        e.preventDefault()
        if (!form || saving) return

        setSaving(true)
        try {
            const data = await api(`/api/workspaces/${id}`, {
                method: 'PATCH',
                body: {
                    ...form,
                    name: form.name.trim(),
                    description: form.description.trim(),
                    goal: form.goal.trim(),
                    category: form.category.trim(),
                    start_date: form.start_date || null,
                    end_date: form.end_date || null
                }
            })
            setWorkspace(current => ({ ...current, ...data.workspace }))
            setForm(formFromWorkspace(data.workspace))
            window.dispatchEvent(new Event('gk-workspaces-changed'))
            toast('Layihə məlumatları yadda saxlanıldı', 'success')
        } catch (err) {
            toast(err.message, 'error')
        } finally {
            setSaving(false)
        }
    }

    if (!user) return <LoadingScreen />

    return (
        <div className="container">
            <Header user={user} workspaceId={workspace ? workspace.id : undefined} tab="about" />

            {notFound && (
                <div className="glass-panel center-panel">
                    <i className="fa-regular fa-face-frown big-icon"></i>
                    <p>Bu workspace tapılmadı və ya onun aktiv üzvü deyilsən.</p>
                    <Link href="/" className="btn">Ana səhifəyə qayıt</Link>
                </div>
            )}
            {loadError && (
                <div className="error-box">
                    {loadError}{' '}
                    <button className="link-btn" onClick={loadWorkspace} type="button">Yenidən cəhd et</button>
                </div>
            )}
            {!workspace && !notFound && !loadError && <LoadingScreen text="Layihə məlumatları yüklənir..." />}

            {workspace && (
                <>
                    <WorkspaceNav workspace={workspace} tab="about" />
                    <section className="glass-panel project-about-panel">
                        <div className="section-bar">
                            <h3>{workspace.role === 'owner' ? 'Layihə məlumatlarını redaktə et' : 'Layihə məlumatları'}</h3>
                            {workspace.role !== 'owner' && <span className="role-tag">Yalnız owner dəyişə bilər</span>}
                        </div>

                        {workspace.role === 'owner' && form ? (
                            <form onSubmit={save}>
                                <div className="field-row">
                                    <div className="field">
                                        <label htmlFor="project-name">Workspace / layihə adı</label>
                                        <input
                                            id="project-name"
                                            className="input"
                                            value={form.name}
                                            onChange={e => updateField('name', e.target.value)}
                                            maxLength={100}
                                            required
                                        />
                                    </div>
                                    <div className="field">
                                        <label htmlFor="project-category">Kateqoriya</label>
                                        <input
                                            id="project-category"
                                            className="input"
                                            value={form.category}
                                            onChange={e => updateField('category', e.target.value)}
                                            maxLength={60}
                                            placeholder="Məs: Təhsil, IT"
                                        />
                                    </div>
                                </div>
                                <div className="field">
                                    <label htmlFor="project-description">Layihənin təsviri</label>
                                    <textarea
                                        id="project-description"
                                        className="input"
                                        rows={3}
                                        value={form.description}
                                        onChange={e => updateField('description', e.target.value)}
                                        maxLength={2000}
                                        placeholder="Layihə haqqında qısa məlumat"
                                    />
                                </div>
                                <div className="field">
                                    <label htmlFor="project-goal">Layihənin məqsədi</label>
                                    <textarea
                                        id="project-goal"
                                        className="input"
                                        rows={2}
                                        value={form.goal}
                                        onChange={e => updateField('goal', e.target.value)}
                                        maxLength={2000}
                                        placeholder="Layihənin əsas məqsədi"
                                    />
                                </div>
                                <div className="field-row">
                                    <div className="field">
                                        <label htmlFor="project-start-date">Başlama tarixi</label>
                                        <input
                                            id="project-start-date"
                                            className="input"
                                            type="date"
                                            value={form.start_date}
                                            max={form.end_date || undefined}
                                            onChange={e => updateField('start_date', e.target.value)}
                                        />
                                    </div>
                                    <div className="field">
                                        <label htmlFor="project-end-date">Bitmə tarixi</label>
                                        <input
                                            id="project-end-date"
                                            className="input"
                                            type="date"
                                            value={form.end_date}
                                            min={form.start_date || undefined}
                                            onChange={e => updateField('end_date', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="project-about-actions">
                                    <p className="hint">Dəyişikliklər workspace üzvlərinin hamısına görünəcək.</p>
                                    <button className="btn" type="submit" disabled={saving}>
                                        {saving ? 'Yadda saxlanılır...' : 'Dəyişiklikləri yadda saxla'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <dl className="profile-list wide project-about-view">
                                <dt>Workspace / layihə adı</dt><dd>{workspace.name}</dd>
                                <dt>Kateqoriya</dt><dd>{workspace.category || 'Daxil edilməyib'}</dd>
                                <dt>Layihənin təsviri</dt><dd>{workspace.description || 'Daxil edilməyib'}</dd>
                                <dt>Layihənin məqsədi</dt><dd>{workspace.goal || 'Daxil edilməyib'}</dd>
                                <dt>Başlama tarixi</dt><dd>{workspace.start_date ? formatDate(workspace.start_date) : 'Daxil edilməyib'}</dd>
                                <dt>Bitmə tarixi</dt><dd>{workspace.end_date ? formatDate(workspace.end_date) : 'Daxil edilməyib'}</dd>
                            </dl>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}
