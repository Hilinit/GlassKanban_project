'use client'
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useUI } from '@/components/UIProvider'
import Avatar from '@/components/Avatar'
import MemberEditModal from '@/components/MemberEditModal'
import MemberProfileModal from '@/components/MemberProfileModal'
import { timeAgo } from '@/lib/format'
import { JOB_TITLES, ROLE_LABELS, STATUS_LABELS } from '@/lib/permissions'

const CUSTOM = '__custom__'

// Team Management: üzvlər, statuslar (Active / Pending / Rejected / Removed), dəvət, rol və icazələr
export default function TeamManagement({ workspaceId }) {
    const { toast, confirm } = useUI()
    const [data, setData] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [editing, setEditing] = useState(null)
    const [profileFor, setProfileFor] = useState(null)

    // dəvət formu
    const [email, setEmail] = useState('')
    const [inviteRole, setInviteRole] = useState('member')
    const [titleChoice, setTitleChoice] = useState('')
    const [customTitle, setCustomTitle] = useState('')
    const [inviteError, setInviteError] = useState('')
    const [sending, setSending] = useState(false)

    const load = useCallback(async () => {
        try {
            setData(await api(`/api/workspaces/${workspaceId}/team`))
            setLoadError('')
        } catch (err) {
            setLoadError(err.message)
        }
    }, [workspaceId])

    useEffect(() => { load() }, [load])

    if (loadError) return <div className="error-box">{loadError}</div>
    if (!data) return <div className="skeleton-block"></div>

    const me = data.me
    const canInvite = me.permissions.invite_members
    const canRemove = me.permissions.remove_members
    const canEditTitles = me.permissions.edit_member_titles
    const canManageRoster = canInvite || canRemove || canEditTitles || me.permissions.manage_permissions
    const active = data.members.filter(m => m.status === 'active')
    const pending = data.members.filter(m => m.status === 'pending')
    const past = data.members.filter(m => m.status === 'rejected' || m.status === 'removed')
    const knownTitles = [...new Set([...JOB_TITLES, ...data.job_titles])]

    async function invite(e) {
        e.preventDefault()
        setInviteError('')
        setSending(true)
        try {
            const jobTitle = titleChoice === CUSTOM ? customTitle.trim() : titleChoice
            const res = await api(`/api/workspaces/${workspaceId}/members`, {
                method: 'POST',
                body: { email, role: inviteRole, job_title: jobTitle }
            })
            toast(`${res.member.name} adlı istifadəçiyə dəvət göndərildi`, 'success')
            setEmail(''); setTitleChoice(''); setCustomTitle(''); setInviteRole('member')
            load()
        } catch (err) {
            setInviteError(err.message)
        }
        setSending(false)
    }

    async function remove(member) {
        const isSelf = member.user_id === me.user_id
        const isPending = member.status === 'pending'
        const isPast = member.status === 'rejected' || member.status === 'removed'
        const ok = await confirm({
            title: isSelf ? 'Workspace-dən ayrıl' : isPending ? 'Dəvəti ləğv et' : isPast ? 'Siyahıdan təmizlə' : 'Üzvü çıxar',
            message: isSelf
                ? 'Bu workspace-dən ayrılmaq istəyirsən? Yenidən qoşulmaq üçün yeni dəvət lazım olacaq.'
                : isPending
                    ? `${member.name} adlı istifadəçiyə göndərilən dəvət ləğv olunsun?`
                    : isPast
                        ? `${member.name} siyahıdan təmizlənsin?`
                        : `${member.name} workspace-dən çıxarılsın? Ona təyin olunmuş tapşırıqlar "təyin olunmayıb" olacaq. Şəxsi hesabı və digər workspace-lərdəki üzvlükləri təsirlənməyəcək.`,
            confirmText: isSelf ? 'Ayrıl' : isPending ? 'Ləğv et' : isPast ? 'Təmizlə' : 'Çıxar'
        })
        if (!ok) return
        try {
            await api(`/api/workspaces/${workspaceId}/members/${member.user_id}`, { method: 'DELETE' })
            toast(isSelf ? 'Workspace-dən ayrıldın' : 'Əməliyyat tamamlandı', 'success')
            if (isSelf) {
                window.location.href = '/'
                return
            }
            load()
        } catch (err) {
            toast(err.message, 'error')
        }
    }

    // başqa sətri redaktə etmək/çıxarmaq olarmı? (backend də eyni qaydanı yoxlayır)
    const canTouch = (m) => m.role !== 'owner' && (m.role !== 'admin' || me.role === 'owner')
    const canEdit = (m) => m.status !== 'rejected' && m.status !== 'removed' && (
        m.role === 'owner'
            ? canEditTitles
            : m.user_id !== me.user_id && (canEditTitles || me.permissions.manage_permissions) && canTouch(m)
    )

    function reinvite(member) {
        setEmail(member.email)
        const input = document.getElementById('invite-email')
        if (input) input.focus()
    }

    const memberCard = (m, variant) => (
        <div className={`member-card ${variant}`} key={m.user_id} data-status={m.status}>
            <div className="member-card-top">
                <Avatar user={m} size="lg" />
                <div className="member-card-info">
                    <h4>{m.name} {m.user_id === me.user_id && <span className="you">(sən)</span>}</h4>
                    <p className="member-email">{m.email}</p>
                    <div className="chip-row">
                        <span className="role-tag">{ROLE_LABELS[m.role]}</span>
                        <span className={`status-tag status-${m.status}`}>{STATUS_LABELS[m.status]}</span>
                    </div>
                </div>
            </div>

            <p className="member-job"><i className="fa-solid fa-briefcase"></i> {m.job_title || 'Vəzifə təyin edilməyib'}</p>

            {m.status === 'pending' && m.invited_at && (
                <p className="hint">Dəvət göndərilib: {timeAgo(m.invited_at)}{m.invited_by_name ? ` (${m.invited_by_name})` : ''}. İstifadəçi qəbul edənə qədər workspace-in heç bir məlumatına giriş yoxdur.</p>
            )}
            {(m.status === 'rejected' || m.status === 'removed') && m.responded_at && (
                <p className="hint">{m.status === 'rejected' ? 'İmtina' : 'Çıxarılma'}: {timeAgo(m.responded_at)}</p>
            )}

            <div className="member-card-actions">
                <button className="btn-cancel btn-small" onClick={() => setProfileFor(m.user_id)} type="button">
                    <i className="fa-regular fa-id-card"></i> Profil
                </button>
                {m.status !== 'rejected' && m.status !== 'removed' && canEdit(m) && (
                    <button className="btn-cancel btn-small" onClick={() => setEditing(m)} type="button">
                        <i className="fa-solid fa-pen"></i> Redaktə
                    </button>
                )}
                {m.status === 'active' && m.user_id === me.user_id && m.role !== 'owner' && (
                    <button className="btn-danger btn-small" onClick={() => remove(m)} type="button">Ayrıl</button>
                )}
                {m.status === 'active' && m.user_id !== me.user_id && canRemove && canTouch(m) && (
                    <button className="btn-danger btn-small" onClick={() => remove(m)} type="button">
                        <i className="fa-solid fa-user-minus"></i> Çıxar
                    </button>
                )}
                {m.status === 'pending' && canRemove && canTouch(m) && (
                    <button className="btn-danger btn-small" onClick={() => remove(m)} type="button">Dəvəti ləğv et</button>
                )}
                {(m.status === 'rejected' || m.status === 'removed') && canManageRoster && canTouch(m) && (
                    <>
                        {canInvite && <button className="btn btn-small" onClick={() => reinvite(m)} type="button">Yenidən dəvət et</button>}
                        {canRemove && <button className="btn-cancel btn-small" onClick={() => remove(m)} type="button">Təmizlə</button>}
                    </>
                )}
            </div>
        </div>
    )

    return (
        <div className="team">
            {canInvite && (
                <form className="glass-panel invite-form" onSubmit={invite}>
                    <h3><i className="fa-solid fa-user-plus"></i> Üzv dəvət et</h3>
                    <p className="hint">
                        İstifadəçi əvvəlcə GlassKanban-da qeydiyyatdan keçməli və e-poçtunu sənə bildirməlidir.
                        Dəvət ona bildiriş kimi gedir. O qəbul edənə qədər üzvlük <strong>Pending</strong> qalır.
                    </p>
                    <div className="invite-grid">
                        <div className="field">
                            <label htmlFor="invite-email">İstifadəçinin e-poçtu (hesab adı)</label>
                            <input id="invite-email" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ad@mail.com" required />
                        </div>
                        <div className="field">
                            <label htmlFor="invite-role">Rol</label>
                            <select id="invite-role" className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                                {me.role === 'owner' && <option value="admin">Admin</option>}
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                            </select>
                        </div>
                        {canEditTitles && <div className="field">
                            <label htmlFor="invite-title">Vəzifə (istəyə görə)</label>
                            <select id="invite-title" className="input" value={titleChoice} onChange={e => setTitleChoice(e.target.value)}>
                                <option value="">Sonra təyin edəcəm</option>
                                {knownTitles.map(t => <option key={t} value={t}>{t}</option>)}
                                <option value={CUSTOM}>Fərdi vəzifə...</option>
                            </select>
                            {titleChoice === CUSTOM && (
                                <input className="input spaced" value={customTitle} maxLength={80} onChange={e => setCustomTitle(e.target.value)} placeholder="Vəzifənin adı" aria-label="Fərdi vəzifə" />
                            )}
                        </div>}
                    </div>
                    {inviteError && <div className="error-box">{inviteError}</div>}
                    <button className="btn" type="submit" disabled={sending}>{sending ? 'Göndərilir...' : 'Dəvət göndər'}</button>
                </form>
            )}

            <div className="section-bar"><h3>Aktiv üzvlər ({active.length})</h3></div>
            <div className="member-grid">{active.map(m => memberCard(m, 'active'))}</div>

            {canManageRoster && (
                <>
                    <div className="section-bar"><h3>Gözləyən dəvətlər ({pending.length})</h3></div>
                    {pending.length === 0
                        ? <div className="empty">Gözləyən dəvət yoxdur</div>
                        : <div className="member-grid">{pending.map(m => memberCard(m, 'pending'))}</div>}

                    {past.length > 0 && (
                        <>
                            <div className="section-bar"><h3>İmtina edənlər və çıxarılanlar ({past.length})</h3></div>
                            <div className="member-grid">{past.map(m => memberCard(m, 'past'))}</div>
                        </>
                    )}
                </>
            )}

            {profileFor && (
                <MemberProfileModal workspaceId={workspaceId} userId={profileFor} onClose={() => setProfileFor(null)} />
            )}
            {editing && (
                <MemberEditModal
                    workspaceId={workspaceId}
                    member={editing}
                    me={me}
                    jobTitles={data.job_titles}
                    onClose={() => setEditing(null)}
                    onSaved={load}
                />
            )}
        </div>
    )
}
