'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import Modal from '@/components/Modal'
import { useUI } from '@/components/UIProvider'
import Avatar from '@/components/Avatar'
import { JOB_TITLES, PERMISSION_LIST, ROLE_DEFAULTS, ROLE_HINTS, ROLE_LABELS } from '@/lib/permissions'

const CUSTOM = '__custom__'

// Üzvü redaktə et: vəzifə, rol və fərdi icazələr (toggle)
// me = mənim rolum/icazələrim (backend /team cavabından), member = redaktə olunan üzv
export default function MemberEditModal({ workspaceId, member, me, jobTitles, onClose, onSaved }) {
    const { toast } = useUI()

    const canTitle = me.permissions.edit_member_titles
    const isSelf = member.user_id === me.user_id
    // rol və icazələri yalnız manage_permissions olan, owner/özü olmayan üzvlər üçün dəyişmək olar
    const canAccess = me.permissions.manage_permissions && member.role !== 'owner' && !isSelf && !!member.permissions
    const canEditAdmin = member.role !== 'admin' || me.role === 'owner'

    // vəzifə: hazır siyahı + digər üzvlərin fərdi vəzifələri + "fərdi" seçimi
    const knownTitles = [...new Set([...JOB_TITLES, ...jobTitles])]
    const startsCustom = member.job_title && !knownTitles.includes(member.job_title)
    const [titleChoice, setTitleChoice] = useState(startsCustom ? CUSTOM : member.job_title || '')
    const [customTitle, setCustomTitle] = useState(startsCustom ? member.job_title : '')
    const [role, setRole] = useState(member.role)
    const [perms, setPerms] = useState(member.permissions ? { ...member.permissions } : {})
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    const jobTitle = titleChoice === CUSTOM ? customTitle.trim() : titleChoice
    const roleChanged = role !== member.role

    async function save(e) {
        e.preventDefault()
        setError('')
        setSaving(true)
        try {
            if (canAccess && (roleChanged || JSON.stringify(perms) !== JSON.stringify(member.permissions))) {
                await api(`/api/workspaces/${workspaceId}/members/${member.user_id}`, {
                    method: 'PATCH',
                    body: { ...(roleChanged ? { role } : {}), permissions: perms }
                })
            }
            if (canTitle && jobTitle !== member.job_title) {
                await api(`/api/workspaces/${workspaceId}/members/${member.user_id}`, { method: 'PATCH', body: { job_title: jobTitle } })
            }
            toast('Üzv məlumatları yadda saxlanıldı', 'success')
            onSaved()
            onClose()
        } catch (err) {
            setError(err.message)
            setSaving(false)
            onSaved() // qismən yadda saxlanılıbsa, siyahı yenilənsin
        }
    }

    return (
        <Modal title="Üzvü redaktə et" onClose={onClose}>
            <form onSubmit={save}>
                <div className="member-row member-row-plain">
                    <Avatar user={member} />
                    <div className="member-info">
                        <div className="member-name">{member.name}</div>
                        <div className="member-email">{member.email}</div>
                    </div>
                </div>

                {canTitle && (
                    <div className="field">
                        <label>Vəzifə</label>
                        <select className="input" value={titleChoice} onChange={e => setTitleChoice(e.target.value)} aria-label="Vəzifə">
                            <option value="">Təyin edilməyib</option>
                            {knownTitles.map(t => <option key={t} value={t}>{t}</option>)}
                            <option value={CUSTOM}>Fərdi vəzifə yarat...</option>
                        </select>
                        {titleChoice === CUSTOM && (
                            <input className="input spaced" value={customTitle} maxLength={80} autoFocus
                                onChange={e => setCustomTitle(e.target.value)} placeholder="Məs: Data Scientist" aria-label="Fərdi vəzifə" />
                        )}
                        <p className="hint">Vəzifə sadəcə başlıqdır, icazələrə təsir etmir.</p>
                    </div>
                )}

                {canAccess && canEditAdmin && (
                    <>
                        <div className="field">
                            <label>Rol</label>
                            <select
                                className="input"
                                value={role}
                                onChange={e => {
                                    const nextRole = e.target.value
                                    setRole(nextRole)
                                    setPerms({ ...ROLE_DEFAULTS[nextRole] })
                                }}
                                aria-label="Rol"
                            >
                                {['admin', 'member', 'viewer']
                                    .filter(r => r !== 'admin' || me.role === 'owner' || member.role === 'admin')
                                    .map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                            <p className="hint">{ROLE_HINTS[role]}. Rol dəyişəndə həmin rolun defolt icazələri seçilir.</p>
                        </div>

                        <div className="field">
                            <div className="field-label-row">
                                <label>Fərdi icazələr</label>
                                <button
                                    className="link-btn"
                                    type="button"
                                    onClick={() => setPerms({ ...ROLE_DEFAULTS[role] })}
                                >
                                    Defoltları bərpa et
                                </button>
                            </div>
                            <div className="toggle-list">
                                {PERMISSION_LIST.map(p => {
                                    const cannotGrant = !me.permissions[p.key] && !perms[p.key] // özündə olmayanı vermək olmaz
                                    return (
                                        <label className={cannotGrant ? 'permission-toggle-row disabled' : 'permission-toggle-row'} key={p.key}>
                                            <span className="permission-name">{p.label}</span>
                                            <span className="permission-control">
                                                <input
                                                    type="checkbox"
                                                    checked={!!perms[p.key]}
                                                    disabled={cannotGrant}
                                                    aria-label={`${p.label} icazəsi`}
                                                    onChange={e => setPerms({ ...perms, [p.key]: e.target.checked })}
                                                />
                                                <span className="permission-switch" aria-hidden="true"></span>
                                            </span>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}

                {!canTitle && !canAccess && <p className="hint">Bu üzvü dəyişmək üçün icazən yoxdur.</p>}
                {canAccess && !canEditAdmin && <p className="hint">Admin-in rolunu və icazələrini yalnız workspace sahibi dəyişə bilər.</p>}

                {error && <div className="error-box">{error}</div>}

                <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={onClose}>Ləğv et</button>
                    <button type="submit" className="btn" disabled={saving}>{saving ? 'Saxlanılır...' : 'Yadda saxla'}</button>
                </div>
            </form>
        </Modal>
    )
}
