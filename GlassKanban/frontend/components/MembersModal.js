'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Modal from '@/components/Modal'
import { useUI } from '@/components/UIProvider'
import { initials } from '@/lib/format'

// Workspace üzvlərinin siyahısı + e-poçt ilə yeni üzv əlavə etmək
export default function MembersModal({ workspace, user, onClose, onChange }) {
    const { toast, confirm } = useUI()
    const [members, setMembers] = useState(null)
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')

    const isOwner = workspace.role === 'owner'

    async function loadMembers() {
        try {
            const data = await api(`/api/workspaces/${workspace.id}/members`)
            setMembers(data.members)
        } catch (err) {
            setError(err.message)
        }
    }

    useEffect(() => { loadMembers() }, [])

    async function addMember(e) {
        e.preventDefault()
        setError('')
        try {
            const data = await api(`/api/workspaces/${workspace.id}/members`, { method: 'POST', body: { email } })
            toast(`${data.member.name} komandaya əlavə olundu`, 'success')
            setEmail('')
            await loadMembers()
            onChange()
        } catch (err) {
            setError(err.message)
        }
    }

    async function removeMember(member) {
        const isSelf = member.id === user.id
        const ok = await confirm({
            title: isSelf ? 'Workspace-dən ayrıl' : 'Üzvü çıxar',
            message: isSelf
                ? `"${workspace.name}" workspace-indən ayrılmaq istəyirsən? Bir daha əlavə olunmayana qədər board-lara çıxışın olmayacaq.`
                : `${member.name} workspace-dən çıxarılsın? Ona təyin olunmuş tapşırıqlar "təyin olunmayıb" olacaq.`,
            confirmText: isSelf ? 'Ayrıl' : 'Çıxar'
        })
        if (!ok) return
        try {
            await api(`/api/workspaces/${workspace.id}/members/${member.id}`, { method: 'DELETE' })
            toast(isSelf ? 'Workspace-dən ayrıldın' : `${member.name} çıxarıldı`, 'success')
            if (isSelf) {
                onClose()
            } else {
                await loadMembers()
            }
            onChange()
        } catch (err) {
            toast(err.message, 'error')
        }
    }

    return (
        <Modal title={`Üzvlər — ${workspace.name}`} onClose={onClose}>
            <div className="member-list">
                {!members && !error && <div className="skeleton-line"></div>}
                {members && members.map(m => (
                    <div className="member-row" key={m.id}>
                        <div className="avatar">{initials(m.name)}</div>
                        <div className="member-info">
                            <div className="member-name">{m.name} {m.id === user.id && '(sən)'}</div>
                            <div className="member-email">{m.email}</div>
                        </div>
                        <span className="role-tag">{m.role === 'owner' ? 'Sahib' : 'Üzv'}</span>
                        {m.role !== 'owner' && (isOwner || m.id === user.id) && (
                            <button
                                className="icon-btn"
                                onClick={() => removeMember(m)}
                                title={m.id === user.id ? 'Ayrıl' : 'Çıxar'}
                                aria-label={m.id === user.id ? 'Ayrıl' : 'Çıxar'}
                                type="button"
                            >
                                <i className="fa-solid fa-user-minus"></i>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <form onSubmit={addMember} className="add-member-form">
                <label className="form-label">Yeni üzv əlavə et (qeydiyyatdan keçmiş e-poçt)</label>
                <div className="inline-actions">
                    <input
                        className="input"
                        type="email"
                        placeholder="ad@mail.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                    <button className="btn" type="submit">Əlavə et</button>
                </div>
            </form>

            {error && <div className="error-box">{error}</div>}
        </Modal>
    )
}
