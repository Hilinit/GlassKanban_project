'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Modal from '@/components/Modal'
import { formatDateTime, initials } from '@/lib/format'

// Tapşırığın tam görünüşü: başlıq, açıqlama, prioritet, tarix, təyin olunan şəxs, şərhlər
export default function TaskModal({ taskId, columnTitle, members, user, onClose, onChanged }) {
    const [task, setTask] = useState(null)
    const [comments, setComments] = useState([])
    const [error, setError] = useState('')

    // Forma sahələri
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState('low')
    const [dueDate, setDueDate] = useState('')
    const [assigneeId, setAssigneeId] = useState('')

    const [commentText, setCommentText] = useState('')

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
            })
            .catch(err => setError(err.message))
    }, [taskId])

    async function handleSave(e) {
        e.preventDefault()
        setError('')
        try {
            await api(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                body: {
                    title,
                    description,
                    priority,
                    due_date: dueDate || null,
                    assignee_id: assigneeId ? Number(assigneeId) : null
                }
            })
            onChanged()
            onClose()
        } catch (err) {
            setError(err.message)
        }
    }

    async function handleDelete() {
        if (!confirm('Bu tapşırıq silinsin?')) return
        try {
            await api(`/api/tasks/${taskId}`, { method: 'DELETE' })
            onChanged()
            onClose()
        } catch (err) {
            setError(err.message)
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
            setError(err.message)
        }
    }

    async function deleteComment(commentId) {
        try {
            await api(`/api/comments/${commentId}`, { method: 'DELETE' })
            setComments(comments.filter(c => c.id !== commentId))
            onChanged()
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <Modal title="Tapşırıq" onClose={onClose} wide>
            {!task && !error && <div className="page-loading">Yüklənir...</div>}

            {task && (
                <div className="task-modal-body">
                    <form onSubmit={handleSave} className="task-form">
                        <p className="task-column-info">
                            <i className="fa-solid fa-table-columns"></i> Sütun: <strong>{columnTitle}</strong>
                        </p>

                        <div className="field">
                            <label>Başlıq</label>
                            <input className="input" value={title} onChange={e => setTitle(e.target.value)} required />
                        </div>

                        <div className="field">
                            <label>Açıqlama</label>
                            <textarea
                                className="input"
                                rows={4}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Ətraflı qeyd..."
                            />
                        </div>

                        <div className="field-row">
                            <div className="field">
                                <label>Prioritet</label>
                                <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
                                    <option value="low">Aşağı</option>
                                    <option value="medium">Orta</option>
                                    <option value="high">Yüksək</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>Son tarix</label>
                                <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                            </div>
                        </div>

                        <div className="field">
                            <label>Təyin olunan şəxs</label>
                            <select className="input" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                                <option value="">Təyin olunmayıb</option>
                                {members.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                                ))}
                            </select>
                        </div>

                        {error && <div className="error-box">{error}</div>}

                        <div className="modal-actions modal-actions-split">
                            <button type="button" className="btn-danger" onClick={handleDelete}>
                                <i className="fa-regular fa-trash-can"></i> Sil
                            </button>
                            <div className="inline-actions">
                                <button type="button" className="btn-cancel" onClick={onClose}>Ləğv et</button>
                                <button type="submit" className="btn">Yadda saxla</button>
                            </div>
                        </div>
                    </form>

                    <div className="comments">
                        <h3 className="comments-title"><i className="fa-regular fa-comments"></i> Şərhlər ({comments.length})</h3>

                        <form onSubmit={addComment} className="comment-form">
                            <textarea
                                className="input"
                                rows={2}
                                placeholder="Şərh yaz..."
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                            />
                            <button className="btn" type="submit">Göndər</button>
                        </form>

                        <div className="comment-list">
                            {comments.length === 0 && <div className="empty">Hələ şərh yoxdur</div>}
                            {[...comments].reverse().map(c => (
                                <div className="comment" key={c.id}>
                                    <div className="avatar avatar-small">{initials(c.user_name)}</div>
                                    <div className="comment-body">
                                        <div className="comment-meta">
                                            <strong>{c.user_name || 'Silinmiş istifadəçi'}</strong>
                                            <span>{formatDateTime(c.created_at)}</span>
                                            {c.user_id === user.id && (
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
