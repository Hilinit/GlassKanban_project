'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { boardAccent } from '@/lib/colors'
import { useUI } from '@/components/UIProvider'
import { ROLE_LABELS } from '@/lib/permissions'

// Bir workspace: başlıq, üzvlər düyməsi və board kartları
export default function WorkspaceSection({ workspace, user, onChange, showWorkspaceHeader = true }) {
    const { toast, confirm } = useUI()
    const [collapsed, setCollapsed] = useState(false)
    const [adding, setAdding] = useState(false)
    const [title, setTitle] = useState('')
    const [creatingBoard, setCreatingBoard] = useState(false)
    const creatingBoardRef = useRef(false)
    const [boardMenuId, setBoardMenuId] = useState(null)
    const [renamingBoardId, setRenamingBoardId] = useState(null)
    const [renameTitle, setRenameTitle] = useState('')
    const [savingRename, setSavingRename] = useState(false)
    const [boardTitleOverrides, setBoardTitleOverrides] = useState({})
    const [deletedBoardIds, setDeletedBoardIds] = useState([])

    const isOwner = workspace.role === 'owner'
    const canCreateBoard = isOwner

    async function createBoard(e) {
        e.preventDefault()
        const boardTitle = title.trim()
        if (!boardTitle || creatingBoardRef.current) return

        creatingBoardRef.current = true
        setCreatingBoard(true)
        try {
            await api(`/api/workspaces/${workspace.id}/boards`, { method: 'POST', body: { title: boardTitle } })
            toast('Board yaradıldı', 'success')
            setTitle('')
            setAdding(false)
            onChange()
        } catch (err) {
            toast(err.message, 'error')
        } finally {
            creatingBoardRef.current = false
            setCreatingBoard(false)
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

    function startRename(board) {
        setBoardMenuId(null)
        setRenamingBoardId(board.id)
        setRenameTitle(boardTitleOverrides[board.id] || board.title)
    }

    async function renameBoard(e, board) {
        e.preventDefault()
        const nextTitle = renameTitle.trim()
        if (!nextTitle) {
            toast('Board adı boş ola bilməz', 'error')
            return
        }
        if (nextTitle === (boardTitleOverrides[board.id] || board.title)) {
            setRenamingBoardId(null)
            return
        }

        setSavingRename(true)
        try {
            await api(`/api/boards/${board.id}`, { method: 'PATCH', body: { title: nextTitle } })
            setBoardTitleOverrides(current => ({ ...current, [board.id]: nextTitle }))
            setRenamingBoardId(null)
            toast('Board adı dəyişdirildi', 'success')
            onChange()
        } catch (err) {
            toast(err.message, 'error')
        } finally {
            setSavingRename(false)
        }
    }

    async function deleteBoard(board) {
        setBoardMenuId(null)
        const ok = await confirm({
            title: 'Board-ı sil',
            message: `"${boardTitleOverrides[board.id] || board.title}" board-ı və içindəki bütün sütun, tapşırıq və şərhlər həmişəlik silinəcək.`,
            confirmText: 'Sil'
        })
        if (!ok) return

        try {
            await api(`/api/boards/${board.id}`, { method: 'DELETE' })
            setDeletedBoardIds(current => [...current, board.id])
            toast('Board silindi', 'success')
            onChange()
        } catch (err) {
            toast(err.message, 'error')
        }
    }

    return (
        <section className="workspace">
            {showWorkspaceHeader && (
                <div className="workspace-head">
                    <button className="workspace-title" onClick={() => setCollapsed(!collapsed)} type="button" title={collapsed ? 'Aç' : 'Bağla'}>
                        <div className="workspace-icon">{workspace.name[0].toUpperCase()}</div>
                        <h2>{workspace.name}</h2>
                        <span className="role-tag">{ROLE_LABELS[workspace.role] || 'Üzv'}</span>
                        <i className={collapsed ? 'fa-solid fa-chevron-down chevron' : 'fa-solid fa-chevron-up chevron'}></i>
                    </button>

                    <div className="workspace-actions">
                        <Link href={`/workspace/${workspace.id}`} className="btn">
                            <i className="fa-solid fa-arrow-up-right-from-square"></i> Aç
                        </Link>
                        <Link href={`/workspace/${workspace.id}/team`} className="btn-cancel">
                            <i className="fa-solid fa-user-group"></i> Komanda ({workspace.member_count})
                        </Link>
                        <Link href={`/workspace/${workspace.id}/about`} className="btn-cancel">
                            <i className="fa-solid fa-circle-info"></i> Layihə haqqında
                        </Link>
                        {isOwner && (
                            <button className="icon-btn" onClick={deleteWorkspace} title="Workspace-i sil" aria-label="Workspace-i sil" type="button">
                                <i className="fa-regular fa-trash-can"></i>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {(!showWorkspaceHeader || !collapsed) && (
                <div className="board-grid">
                    {workspace.boards.filter(board => !deletedBoardIds.includes(board.id)).map(board => {
                        const accent = boardAccent(board.id)
                        const boardTitle = boardTitleOverrides[board.id] || board.title
                        return (
                            <article
                                key={board.id}
                                className="board-tile"
                                style={{
                                    '--board-accent': accent.color,
                                    '--board-accent-soft': accent.soft,
                                    '--board-accent-glow': accent.glow
                                }}
                            >
                                <div className="board-tile-strip"></div>
                                <div className="board-tile-head">
                                    <span className="board-tile-icon"><i className="fa-solid fa-table-columns"></i></span>
                                    {isOwner && (
                                        <div className="board-menu-wrap">
                                            <button
                                                className="board-menu-trigger"
                                                type="button"
                                                aria-label={`${boardTitle} üçün menyu`}
                                                aria-haspopup="menu"
                                                aria-expanded={boardMenuId === board.id}
                                                onClick={() => setBoardMenuId(boardMenuId === board.id ? null : board.id)}
                                            >
                                                <i className="fa-solid fa-ellipsis-vertical"></i>
                                            </button>
                                            {boardMenuId === board.id && (
                                                <div className="board-menu" role="menu">
                                                    <Link className="board-menu-item" href={`/board/${board.id}`} role="menuitem" onClick={() => setBoardMenuId(null)}>
                                                        <i className="fa-solid fa-pen-to-square"></i> Düzəliş et
                                                    </Link>
                                                    <button className="board-menu-item" type="button" role="menuitem" onClick={() => startRename(board)}>
                                                        <i className="fa-solid fa-i-cursor"></i> Adını dəyiş
                                                    </button>
                                                    <button className="board-menu-item danger" type="button" role="menuitem" onClick={() => deleteBoard(board)}>
                                                        <i className="fa-regular fa-trash-can"></i> Sil
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {renamingBoardId === board.id ? (
                                    <form className="board-rename-form" onSubmit={e => renameBoard(e, board)}>
                                        <input
                                            className="input"
                                            autoFocus
                                            maxLength={100}
                                            value={renameTitle}
                                            aria-label="Board adı"
                                            onChange={e => setRenameTitle(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Escape') setRenamingBoardId(null)
                                            }}
                                        />
                                        <div className="board-rename-actions">
                                            <button className="btn btn-small" type="submit" disabled={savingRename}>
                                                {savingRename ? 'Saxlanılır...' : 'Saxla'}
                                            </button>
                                            <button className="btn-cancel btn-small" type="button" disabled={savingRename} onClick={() => setRenamingBoardId(null)}>
                                                Ləğv et
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <Link className="board-tile-main" href={`/board/${board.id}`}>
                                        <span className="board-tile-title">{boardTitle}</span>
                                        <span className="board-tile-label">Tapşırıqlar lövhəsi</span>
                                    </Link>
                                )}

                                <div className="board-tile-footer">
                                    <span className="board-member-count">
                                        <i className="fa-solid fa-users"></i> {workspace.member_count || 0} üzv
                                    </span>
                                    <Link className="board-tile-open" href={`/board/${board.id}`}>
                                        Aç <i className="fa-solid fa-arrow-right"></i>
                                    </Link>
                                </div>
                            </article>
                        )
                    })}

                    {canCreateBoard && (adding ? (
                        <form className="board-tile board-tile-new" onSubmit={createBoard}>
                            <input
                                className="input"
                                autoFocus
                                placeholder="Board adı"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                disabled={creatingBoard}
                            />
                            <div className="inline-actions">
                                <button className="btn" type="submit" disabled={creatingBoard}>{creatingBoard ? 'Yaradılır...' : 'Yarat'}</button>
                                <button className="btn-cancel" type="button" disabled={creatingBoard} onClick={() => { setAdding(false); setTitle('') }}>Ləğv et</button>
                            </div>
                        </form>
                    ) : (
                        <button className="board-tile board-tile-add" onClick={() => setAdding(true)} type="button">
                            <span className="board-add-icon"><i className="fa-solid fa-plus"></i></span>
                            <span className="board-add-title">Yeni board</span>
                            <span className="board-add-caption">Yeni lövhə yarat və layihəni genişləndir</span>
                        </button>
                    ))}
                </div>
            )}
        </section>
    )
}
