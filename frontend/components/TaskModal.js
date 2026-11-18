'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Modal from '@/components/Modal'
import { useUI } from '@/components/UIProvider'
import Avatar from '@/components/Avatar'
import { dateFromToday, formatDateTime } from '@/lib/format'

const PRIORITIES = [
    { value: 'low', label: 'Aşağı' },
    { value: 'medium', label: 'Orta' },
    { value: 'high', label: 'Yüksək' }
]

const DATE_SHORTCUTS = [
    { label: 'Bu gün', offset: 0 },
    { label: 'Sabah', offset: 1 },
    { label: '1 həftə', offset: 7 }
]

// Tapşırığın tam görünüşü: başlıq, açıqlama, prioritet, tarix, təyin olunan şəxs, sütun, şərhlər
// columns = [{ id, title, count }]  (sütunu dəyişmək üçün)
export default function TaskModal({ taskId, columns, members, user, permissions, onClose, onChanged }) {
    const { toast, confirm } = useUI()
    const [task, setTask] = useState(null)
    const [comments, setComments] = useState([])
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    // Forma sahələri
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState('low')
    const [dueDate, setDueDate] = useState('')
    const [assigneeId, setAssigneeId] = useState('')
    const [columnId, setColumnId] = useState('')

    const [commentText, setCommentText] = useState('')
    const canEdit = permissions.edit_task
    const canAssign = permissions.assign_task
    const canMove = permissions.move_task
    const canSave = canEdit || canAssign || canMove

    useEffect(() => {
        api(`/api/tasks/${taskId}`)
            .then(data => {
                setTask(data.task)
                setComments(data.comments)
                setTitle(data.task.title)
                setDescription(data.task.description || '')
                setPriority(data.task.priority)
                setDueDate(data.task.due_date || '')
                setAssigneeId(data.task.assignee_id ? String(data.task.assignee_id) : '')
                setColumnId(String(data.task.column_id))
            })
            .catch(err => setError(err.message))
    }, [taskId])

    async function handleSave(e) {
        e.preventDefault()
        setError('')
        setSaving(true)
        try {
            const body = {}
            if (canEdit) {
                Object.assign(body, {
                    title,
                    description,
                    priority,
                    due_date: dueDate || null
                })
            }
            if (canAssign && assigneeId !== (task.assignee_id ? String(task.assignee_id) : '')) {
                body.assignee_id = assigneeId ? Number(assigneeId) : null
            }
            if (Object.keys(body).length > 0) {
                await api(`/api/tasks/${taskId}`, { method: 'PATCH', body })
            }

            // Başqa sütun seçilibsə, tapşırığı oraya köçür (sona)
            if (canMove && Number(columnId) !== task.column_id) {
                const target = columns.find(c => c.id === Number(columnId))
                await api(`/api/tasks/${taskId}/move`, {
                    method: 'PATCH',
                    body: { column_id: Number(columnId), position: target ? target.count : 0 }
                })
            }

            toast('Dəyişikliklər yadda saxlanıldı', 'success')
            onChanged()
            onClose()
        } catch (err) {
            setError(err.message)
            setSaving(false)
        }
    }

    async function handleDelete() {
        const ok = await confirm({
            title: 'Tapşırığı sil',
            message: `"${task.title}" tapşırığı və bütün şərhləri həmişəlik silinəcək.`,
            confirmText: 'Sil'
        })
        if (!ok) return
        try {
            await api(`/api/tasks/${taskId}`, { method: 'DELETE' })
            toast('Tapşırıq silindi', 'success')
            onChanged()
            onClose()
        } catch (err) {
            toast(err.message, 'error')
        }
    }

    async function addComment(e) {
        e.preventDefault()
        if (!commentText.trim()) return
        try {
            const data = await api(`/api/tasks/${taskId}/comments`, { method: 'POST', body: { text: commentText } })
            setComments([...comments, data.comment])
            setCommentText('')
            onChanged() // kartdakı şərh sayı yenilənsin
        } catch (err) {
            toast(err.message, 'error')
        }
    }

    async function deleteComment(commentId) {
        try {
            await api(`/api/comments/${commentId}`, { method: 'DELETE' })
            setComments(comments.filter(c => c.id !== commentId))
            onChanged()
        } catch (err) {
            toast(err.message, 'error')
        }
    }

    return (
        <Modal title="Tapşırıq" onClose={onClose} size="wide">
            {!task && !error && (
                <div className="task-modal-body">
                    <div><div className="skeleton-line"></div><div className="skeleton-line"></div><div className="skeleton-line short"></div></div>
                    <div><div className="skeleton-line"></div><div className="skeleton-line short"></div></div>
                </div>
            )}

            {task && (
                <div className="task-modal-body">
                    <form
                        onSubmit={handleSave}
                        className="task-form"
                        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave(e) }}
                    >
                        <div className="field">
                            <label>Başlıq</label>
                            <input className="input input-title" value={title} onChange={e => setTitle(e.target.value)} required disabled={!canEdit} />
                        </div>

                        <div className="field">
                            <label>Açıqlama</label>
                            <textarea
                                className="input"
                                rows={5}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Ətraflı qeyd..."
                                disabled={!canEdit}
                            />
                        </div>

                        <div className="field">
                            <label>Prioritet</label>
                            <div className="segmented">
                                {PRIORITIES.map(p => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        className={`seg seg-${p.value}${priority === p.value ? ' active' : ''}`}
                                        onClick={() => setPriority(p.value)}
                                        disabled={!canEdit}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="field">
                            <label>Son tarix</label>
                            <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={!canEdit} />
                            <div className="chip-row">
                                {DATE_SHORTCUTS.map(s => (
                                    <button key={s.label} type="button" className="chip" onClick={() => setDueDate(dateFromToday(s.offset))} disabled={!canEdit}>
                                        {s.label}
                                    </button>
                                ))}
                                {dueDate && (
                                    <button type="button" className="chip chip-clear" onClick={() => setDueDate('')} disabled={!canEdit}>
                                        <i className="fa-solid fa-xmark"></i> Təmizlə
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="field-row">
                            <div className="field">
                                <label>Təyin olunan şəxs</label>
                                <select className="input" value={assigneeId} onChange={e => setAssigneeId(e.target.value)} disabled={!canAssign}>
                                    <option value="">Təyin olunmayıb</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}{m.id === user.id ? ' (sən)' : ''}</option>
                                    ))}
                                </select>
                                {canAssign && assigneeId !== String(user.id) && (
                                    <button type="button" className="link-btn" onClick={() => setAssigneeId(String(user.id))}>
                                        Özümə təyin et
                                    </button>
                                )}
                            </div>
                            <div className="field">
                                <label>Sütun</label>
                                <select className="input" value={columnId} onChange={e => setColumnId(e.target.value)} disabled={!canMove}>
                                    {columns.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {error && <div className="error-box">{error}</div>}

                        <div className="modal-actions modal-actions-split">
                            {permissions.delete_task && <button type="button" className="btn-danger" onClick={handleDelete}>
                                <i className="fa-regular fa-trash-can"></i> Sil
                            </button>}
                            <div className="inline-actions">
                                <button type="button" className="btn-cancel" onClick={onClose}>Ləğv et</button>
                                {canSave && <button type="submit" className="btn" disabled={saving} title="Ctrl + Enter">
                                    {saving ? 'Saxlanılır...' : 'Yadda saxla'}
                                </button>}
                            </div>
                        </div>
                    </form>

                    <div className="comments">
                        <h3 className="comments-title"><i className="fa-regular fa-comments"></i> Şərhlər ({comments.length})</h3>

                        {permissions.comment && <form onSubmit={addComment} className="comment-form">
                            <textarea
                                className="input"
                                rows={2}
                                placeholder="Şərh yaz..."
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                            />
                            <button className="btn" type="submit">Göndər</button>
                        </form>}

                        <div className="comment-list">
                            {comments.length === 0 && <div className="empty">Hələ şərh yoxdur</div>}
                            {[...comments].reverse().map(c => (
                                <div className="comment" key={c.id}>
                                    <Avatar user={{ name: c.user_name, avatar_url: c.avatar_url }} size="small" />
                                    <div className="comment-body">
                                        <div className="comment-meta">
                                            <strong>{c.user_name || 'Silinmiş istifadəçi'}</strong>
                                            <span>{formatDateTime(c.created_at)}</span>
                                            {c.user_id === user.id && permissions.delete_own_comment && (
                                                <button className="comment-delete" onClick={() => deleteComment(c.id)} type="button">Sil</button>
                                            )}
                                        </div>
                                        <p className="comment-text">{c.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!task && error && <div className="error-box">{error}</div>}
        </Modal>
    )
}
