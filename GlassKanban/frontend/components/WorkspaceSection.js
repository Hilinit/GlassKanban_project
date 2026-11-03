'use client'
import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import MembersModal from '@/components/MembersModal'

// Bir workspace: başlıq, üzvlər düyməsi və board kartları
export default function WorkspaceSection({ workspace, user, onChange }) {
    const [showMembers, setShowMembers] = useState(false)
    const [adding, setAdding] = useState(false)
    const [title, setTitle] = useState('')
    const [error, setError] = useState('')

    const isOwner = workspace.role === 'owner'

    async function createBoard(e) {
        e.preventDefault()
        if (!title.trim()) return
        try {
            await api(`/api/workspaces/${workspace.id}/boards`, { method: 'POST', body: { title } })
            setTitle('')
            setAdding(false)
            onChange()
        } catch (err) {
            setError(err.message)
        }
    }

    async function deleteWorkspace() {
        if (!confirm(`"${workspace.name}" workspace-i və içindəki bütün board-lar silinəcək. Əminsən?`)) return
        try {
            await api(`/api/workspaces/${workspace.id}`, { method: 'DELETE' })
            onChange()
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <section className="workspace">
            <div className="workspace-head">
                <div className="workspace-title">
                    <div className="workspace-icon">{workspace.name[0].toUpperCase()}</div>
                    <h2>{workspace.name}</h2>
                </div>
                <div className="workspace-actions">
                    <button className="btn-cancel" onClick={() => setShowMembers(true)} type="button">
                        <i className="fa-solid fa-user-group"></i> Üzvlər ({workspace.member_count})
                    </button>
                    {isOwner && (
                        <button className="icon-btn" onClick={deleteWorkspace} title="Workspace-i sil" type="button">
                            <i className="fa-regular fa-trash-can"></i>
                        </button>
                    )}
                </div>
            </div>

            {error && <div className="error-box">{error}</div>}

            <div className="board-grid">
                {workspace.boards.map(board => (
                    <Link key={board.id} href={`/board/${board.id}`} className="board-tile">
                        <i className="fa-solid fa-table-columns"></i>
                        <span>{board.title}</span>
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
