'use client'
import { useState } from 'react'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import TaskCard from '@/components/TaskCard'

// Bir sütun: başlıq (adı dəyişmək, silmək), kartlar və "kart əlavə et".
// Bütün server əməliyyatları `actions` vasitəsilə board səhifəsində edilir.
export default function Column({ column, index, tasks, filtersActive, isDone, actions, permissions, onOpenTask }) {
    const [editingTitle, setEditingTitle] = useState(false)
    const [title, setTitle] = useState(column.title)
    const [adding, setAdding] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')

    function saveTitle() {
        setEditingTitle(false)
        const trimmed = title.trim()
        if (!trimmed || trimmed === column.title) {
            setTitle(column.title)
            return
        }
        actions.renameColumn(column, trimmed)
    }

    async function addTask(e) {
        e.preventDefault()
        const trimmed = newTaskTitle.trim()
        if (!trimmed) return
        const ok = await actions.addTask(column.id, trimmed)
        if (ok) setNewTaskTitle('') // forma açıq qalır: ardıcıl bir neçə kart əlavə etmək rahat olsun
    }

    return (
        <Draggable draggableId={`col-${column.id}`} index={index} isDragDisabled={!permissions.move_column}>
            {(provided, snapshot) => (
                <section
                    className={snapshot.isDragging ? 'column dragging' : 'column'}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                >
                    <div className="column-header" {...provided.dragHandleProps}>
                        {editingTitle && permissions.edit_column ? (
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
                            <div
                                className={permissions.edit_column ? 'column-title' : 'column-title static'}
                                onClick={permissions.edit_column ? () => { setTitle(column.title); setEditingTitle(true) } : undefined}
                                title={permissions.edit_column ? 'Adı dəyişmək üçün klik et' : undefined}
                            >
                                <h2>{column.title}</h2>
                            </div>
                        )}
                        <div className="column-header-right">
                            <span className="count">
                                {filtersActive ? `${tasks.length}/${column.tasks.length}` : tasks.length}
                            </span>
                            {permissions.delete_column && <button
                                className="icon-btn"
                                onClick={() => actions.deleteColumn(column)}
                                title="Sütunu sil"
                                aria-label="Sütunu sil"
                                type="button"
                            >
                                <i className="fa-regular fa-trash-can"></i>
                            </button>}
                        </div>
                    </div>

                    <Droppable droppableId={`column-${column.id}`} type="TASK">
                        {(dropProvided, dropSnapshot) => (
                            <div
                                className={dropSnapshot.isDraggingOver ? 'cards drag-over' : 'cards'}
                                ref={dropProvided.innerRef}
                                {...dropProvided.droppableProps}
                            >
                                {tasks.map((task, i) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        index={i}
                                        dragDisabled={filtersActive || !permissions.move_task}
                                        isDone={isDone}
                                        onOpen={onOpenTask}
                                        onDelete={actions.deleteTask}
                                        canDelete={permissions.delete_task}
                                    />
                                ))}
                                {dropProvided.placeholder}
                                {tasks.length === 0 && !dropSnapshot.isDraggingOver && (
                                    <div className="empty">
                                        {filtersActive ? 'Filtrə uyğun kart yoxdur' : 'Boşdur. Kartı bura sürüşdür'}
                                    </div>
                                )}
                            </div>
                        )}
                    </Droppable>

                    {adding && permissions.create_task ? (
                        <form onSubmit={addTask} className="add-card-form">
                            <textarea
                                className="input"
                                autoFocus
                                placeholder="Tapşırıq başlığı... (Enter ilə əlavə et)"
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) addTask(e)
                                    if (e.key === 'Escape') { setAdding(false); setNewTaskTitle('') }
                                }}
                            />
                            <div className="inline-actions">
                                <button className="btn" type="submit">Əlavə et</button>
                                <button className="btn-cancel" type="button" aria-label="Bağla" onClick={() => { setAdding(false); setNewTaskTitle('') }}>
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </form>
                    ) : permissions.create_task ? (
                        <button className="add-card-btn" onClick={() => setAdding(true)} type="button">
                            <i className="fa-solid fa-plus"></i> Kart əlavə et
                        </button>
                    ) : null}
                </section>
            )}
        </Draggable>
    )
}
