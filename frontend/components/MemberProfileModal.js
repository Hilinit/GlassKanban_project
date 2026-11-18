'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Modal from '@/components/Modal'
import Avatar from '@/components/Avatar'
import { PERMISSION_LIST, ROLE_LABELS, STATUS_LABELS } from '@/lib/permissions'

// Üzvün profili: ÜMUMİ profil və AYRICA yalnız bu workspace-dəki rol, vəzifə və status.
// Başqa workspace-lərdəki üzvlük barədə heç bir məlumat bura gəlmir.
export default function MemberProfileModal({ workspaceId, userId, onClose }) {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        setData(null)
        api(`/api/workspaces/${workspaceId}/members/${userId}/profile`)
            .then(setData)
            .catch(err => setError(err.message))
    }, [workspaceId, userId])

    return (
        <Modal title="Üzvün profili" onClose={onClose}>
            {!data && !error && <div className="skeleton-line"></div>}
            {error && <div className="error-box">{error}</div>}

            {data && (
                <div className="member-profile">
                    <Avatar user={data.profile} size="xl" />
                    <h3>{data.profile.name}</h3>

                    <div className="member-profile-block">
                        <h4>Ümumi profil</h4>
                        <dl className="profile-list">
                            <dt>E-poçt</dt><dd>{data.profile.email}</dd>
                            <dt>Haqqında</dt><dd>{data.profile.bio || <em className="muted">Əlavə edilməyib</em>}</dd>
                        </dl>
                    </div>

                    <div className="member-profile-block" data-testid="workspace-part">
                        <h4>Bu workspace-də</h4>
                        <dl className="profile-list">
                            <dt>Rol</dt><dd>{ROLE_LABELS[data.membership.role]}</dd>
                            <dt>Vəzifə</dt><dd>{data.membership.job_title || <em className="muted">Təyin edilməyib</em>}</dd>
                            <dt>Status</dt><dd><span className={`status-tag status-${data.membership.status}`}>{STATUS_LABELS[data.membership.status]}</span></dd>
                        </dl>
                        {data.membership.permissions && (
                            <div className="perm-summary">
                                <p className="hint">İcazələri:</p>
                                <ul>
                                    {PERMISSION_LIST.map(p => (
                                        <li key={p.key} className={data.membership.permissions[p.key] ? 'on' : 'off'}>
                                            <i className={data.membership.permissions[p.key] ? 'fa-solid fa-check' : 'fa-solid fa-xmark'}></i> {p.label}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <p className="hint">Rol, vəzifə və icazələr yalnız bu workspace üçün keçərlidir.</p>
                </div>
            )}
        </Modal>
    )
}
