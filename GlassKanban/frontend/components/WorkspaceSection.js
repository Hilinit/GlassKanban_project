'use client'
import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { boardAccent } from '@/lib/colors'
import { useUI } from '@/components/UIProvider'
import MembersModal from '@/components/MembersModal'

// Bir workspace: başlıq, üzvlər düyməsi və board kartları
export default function WorkspaceSection({ workspace, user, onChange }) {
    const { toast, confirm } = useUI()
    const [showMembers, setShowMembers] = useState(false)
    const [collapsed, setCollapsed] = useState(false)
    const [adding, setAdding] = useState(false)
    const [title, setTitle] = useState('')

    const isOwner = workspace.role === 'owner'

    async function createBoard(e) {
        e.preventDefault()
        if (!title.trim()) return
        try {
            await api(`/api/workspaces/${workspace.id}/boards`, { method: 'POST', body: { title } })
            toast('Board yaradıldı', 'success')
            setTitle('')
            setAdding(false)
            onChange()
        } catch (err) {
            toast(err.message, 'error')
        }
    }

    async function deleteWorkspace() {
        const ok = await confirm({
            title: 'Workspace-i sil',
            message: `"${workspace.name}" workspace-i, içindəki bütün board-lar və tapşırıqlar həmişəlik silinəcək. Bu əməliyyat geri qaytarıla bilməz.`,
            confirmText: 'Sil'
        })
        if (!ok) return
        try {
            await api(`/api/workspaces/${workspace.id}`, { method: 'DELETE' })
            toast('Workspace silindi', 'success')
            onChange()
        } catch (err) {
            toast(err.message, 'error')
        }
    }

    return (
        <section className="workspace">
            <div className="workspace-head">
                <button className="workspace-title" onClick={() => setCollapsed(!collapsed)} type="button" title={collapsed ? 'Aç' : 'Bağla'}>
                    <div className="workspace-icon">{workspace.name[0].toUpperCase()}</div>
                    <h2>{workspace.name}</h2>
                    <span className="role-tag">{isOwner ? 'Sahib' : 'Üzv'}</span>
                    <i className={collapsed ? 'fa-solid fa-chevron-down chevron' : 'fa-solid fa-chevron-up chevron'}></i>
                </button>

                <div className="workspace-actions">
                    <button className="btn-cancel" onClick={() => setShowMembers(true)} type="button">
                        <i className="fa-solid fa-user-group"></i> Üzvlər ({workspace.member_count})
                    </button>
                    {isOwner && (
                        <button className="icon-btn" onClick={deleteWorkspace} title="Workspace-i sil" aria-label="Workspace-i sil" type="button">
                            <i className="fa-regular fa-trash-can"></i>
                        </button>
                    )}
                </div>
            </div>

            {!collapsed && (
                <div className="board-grid">
                    {workspace.boards.map(board => (
                        <Link key={board.id} href={`/board/${board.id}`} className="board-tile">
                            <div className="board-tile-strip" style={{ background: boardAccent(board.id) }}></div>
                            <div className="board-tile-body">
                                <span>{board.title}</span>
                                <i className="fa-solid fa-arrow-right"></i>
                            </div>
                        </Link>
                    ))}

                    {adding ? (
                        <form className="board-tile board-tile-new" onSubmit={createBoard}>
                            <input
                                className="input"
                                autoFocus
                                placeholder="Board adı"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                            <div className="inline-actions">
                                <button className="btn" type="submit">Yarat</button>
                                <button className="btn-cancel" type="button" onClick={() => { setAdding(false); setTitle('') }}>Ləğv et</button>
                            </div>
                        </form>
                    ) : (
                        <button className="board-tile board-tile-add" onClick={() => setAdding(true)} type="button">
                            <i className="fa-solid fa-plus"></i>
                            <span>Yeni board</span>
                        </button>
                    )}
                </div>
            )}

            {showMembers && (
                <MembersModal
                    workspace={workspace}
                    user={user}
                    onClose={() => setShowMembers(false)}
                    onChange={onChange}
                />
            )}
        </section>
    )
}
