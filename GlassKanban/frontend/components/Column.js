'use client'
import { useState } from 'react'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { api } from '@/lib/api'
import TaskCard from '@/components/TaskCard'

// Bir sütun: başlıq (adı dəyişmək, silmək), kartlar və "kart əlavə et"
export default function Column({ column, index, tasks, dragDisabled, onOpenTask, onChanged, onError }) {
    const [editingTitle, setEditingTitle] = useState(false)
    const [title, setTitle] = useState(column.title)
    const [adding, setAdding] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')

    async function saveTitle() {
        setEditingTitle(false)
        const trimmed = title.trim()
        if (!trimmed || trimmed === column.title) {
            setTitle(column.title)
            return
        }
        try {
            await api(`/api/columns/${column.id}`, { method: 'PATCH', body: { title: trimmed } })
            onChanged()
        } catch (err) {
            setTitle(column.title)
            onError(err.message)
        }
    }

    async function deleteColumn() {
        const count = column.tasks.length
        const text = count > 0
            ? `"${column.title}" sütunu və içindəki ${count} tapşırıq silinəcək. Əminsən?`
            : `"${column.title}" sütunu silinsin?`
        if (!confirm(text)) return
        try {
            await api(`/api/columns/${column.id}`, { method: 'DELETE' })
            onChanged()
        } catch (err) {
            onError(err.message)
        }
    }

    async function addTask(e) {
        e.preventDefault()
        const trimmed = newTaskTitle.trim()
        if (!trimmed) return
        try {
            await api(`/api/columns/${column.id}/tasks`, { method: 'POST', body: { title: trimmed } })
            setNewTaskTitle('') // forma açıq qalır: ardıcıl bir neçə kart əlavə etmək rahat olsun
            onChanged()
        } catch (err) {
            onError(err.message)
        }
    }

    async function deleteTask(task) {
        if (!confirm(`"${task.title}" tapşırığı silinsin?`)) return
        try {
            await api(`/api/tasks/${task.id}`, { method: 'DELETE' })
            onChanged()
        } catch (err) {
            onError(err.message)
        }
    }

    return (
        <Draggable draggableId={`col-${column.id}`} index={index}>
            {(provided) => (
                <section className="column" ref={provided.innerRef} {...provided.draggableProps}>
                    <div className="column-header" {...provided.dragHandleProps}>
                        {editingTitle ? (
                            <input
                                className="input column-title-input"
                                autoFocus
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                onBlur={saveTitle}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') saveTitle()
                                    if (e.key === 'Escape') { setTitle(column.title); setEditingTitle(false) }
                                }}
                            />
                        ) : (
                            <div className="column-title" onClick={() => setEditingTitle(true)} title="Adı dəyişmək üçün klik et">
                                <h2>{column.title}</h2>
                            </div>
                        )}
                        <div className="column-header-right">
                            <span className="count">{tasks.length}</span>
                            <button className="icon-btn" onClick={deleteColumn} title="Sütunu sil" type="button">
                                <i className="fa-regular fa-trash-can"></i>
                            </button>
                        </div>
                    </div>

                    <Droppable droppableId={`column-${column.id}`} type="TASK">
                        {(dropProvided, snapshot) => (
                            <div
                                className={snapshot.isDraggingOver ? 'cards drag-over' : 'cards'}
                                ref={dropProvided.innerRef}
                                {...dropProvided.droppableProps}
                            >
                                {tasks.map((task, i) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        index={i}
                                        dragDisabled={dragDisabled}
                                        onOpen={onOpenTask}
                                        onDelete={deleteTask}
                                    />
                                ))}
                                {dropProvided.placeholder}
                                {tasks.length === 0 && !snapshot.isDraggingOver && (
                                    <div className="empty">Boşdur</div>
                                )}
                            </div>
                        )}
                    </Droppable>

                    {adding ? (
                        <form onSubmit={addTask} className="add-card-form">
                            <textarea
                                className="input"
                                autoFocus
                                placeholder="Tapşırıq başlığı..."
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) addTask(e)
                                    if (e.key === 'Escape') { setAdding(false); setNewTaskTitle('') }
                                }}
                            />
                            <div className="inline-actions">
                                <button className="btn" type="submit">Əlavə et</button>
                                <button className="btn-cancel" type="button" onClick={() => { setAdding(false); setNewTaskTitle('') }}>
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button className="add-card-btn" onClick={() => setAdding(true)} type="button">
                            <i className="fa-solid fa-plus"></i> Kart əlavə et
                        </button>
                    )}
                </section>
            )}
        </Draggable>
    )
}
