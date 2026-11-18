'use client'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/format'
import { useUI } from '@/components/UIProvider'

// Bildirişlərin siyahısı (zəng paneli və /notifications səhifəsi üçün ortaq).
// Dəvət gələndə qəbul/rədd düymələri göstərilir.
export default function NotificationList({ notifications, onChanged }) {
    const { toast } = useUI()

    async function markRead(notification) {
        if (notification.is_read) return
        try {
            await api(`/api/notifications/${notification.id}/read`, { method: 'POST' })
            onChanged()
        } catch (err) { /* vacib deyil */ }
    }

    async function respond(notification, action) {
        try {
            await api(`/api/invitations/${notification.workspace_id}/${action}`, { method: 'POST' })
            toast(action === 'accept' ? 'Workspace-ə qoşuldun' : 'Dəvəti rədd etdin', 'success')
            window.dispatchEvent(new Event('gk-memberships-changed')) // workspace siyahısı və zəngdəki say yenilənsin
        } catch (err) {
            toast(err.message, 'error')
        }
        onChanged()
    }

    if (notifications.length === 0) {
        return <div className="empty">Hələ bildiriş yoxdur</div>
    }

    return (
        <ul className="notification-list">
            {notifications.map(n => {
                const actor = <strong>{n.actor_name || 'Kimsə'}</strong>
                const workspace = <strong>{n.workspace_name || 'workspace'}</strong>
                return (
                    <li key={n.id} className={n.is_read ? 'notification' : 'notification unread'} onClick={() => markRead(n)}>
                        <div className="notification-icon">
                            <i className={
                                n.type === 'invitation' ? 'fa-solid fa-envelope-open-text'
                                    : n.type === 'invitation_accepted' ? 'fa-solid fa-user-check'
                                        : 'fa-solid fa-user-xmark'
                            }></i>
                        </div>
                        <div className="notification-body">
                            <p className="notification-text">
                                {n.type === 'invitation' && <>{actor} səni {workspace} workspace-inə qoşulmağa dəvət etdi.</>}
                                {n.type === 'invitation_accepted' && <>{actor} {workspace} workspace-inə qoşulma sorğusunu <b>qəbul etdi</b>.</>}
                                {n.type === 'invitation_rejected' && <>{actor} {workspace} workspace-inə qoşulma sorğusunu <b>rədd etdi</b>.</>}
                            </p>
                            <span className="notification-time">{timeAgo(n.created_at)}</span>

                            {n.type === 'invitation' && n.membership_status === 'pending' && (
                                <div className="inline-actions">
                                    <button className="btn btn-small" type="button" onClick={(e) => { e.stopPropagation(); respond(n, 'accept') }}>Qəbul et</button>
                                    <button className="btn-cancel btn-small" type="button" onClick={(e) => { e.stopPropagation(); respond(n, 'reject') }}>Rədd et</button>
                                </div>
                            )}
                            {n.type === 'invitation' && n.membership_status && n.membership_status !== 'pending' && (
                                <span className="role-tag">
                                    {n.membership_status === 'active' ? 'Qəbul etdin'
                                        : n.membership_status === 'rejected' ? 'Rədd etdin'
                                            : 'Artıq üzv deyilsən'}
                                </span>
                            )}
                            {n.type === 'invitation' && !n.membership_status && <span className="role-tag">Sorğu ləğv olunub</span>}
                        </div>
                        {!n.is_read && <span className="unread-dot" title="Oxunmayıb"></span>}
                    </li>
                )
            })}
        </ul>
    )
}
