'use client'
import { Draggable } from '@hello-pangea/dnd'
import { PRIORITY_LABELS, formatDate, initials, todayString } from '@/lib/format'

// Bir tapşırıq kartı (sürüşdürülə bilən)
export default function TaskCard({ task, index, dragDisabled, onOpen, onDelete }) {
    const overdue = task.due_date && task.due_date < todayString()

    return (
        <Draggable draggableId={`task-${task.id}`} index={index} isDragDisabled={dragDisabled}>
            {(provided, snapshot) => (
                <article
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`card card-${task.priority}${snapshot.isDragging ? ' dragging' : ''}`}
                    onClick={() => onOpen(task.id)}
                >
                    <span className="badge">{PRIORITY_LABELS[task.priority]}</span>
                    <h3 className="card-title">{task.title}</h3>
                    {task.description && <p className="card-desc">{task.description}</p>}

                    <div className="card-footer">
                        <div className="card-chips">
                            {task.due_date && (
                                <span className={overdue ? 'card-date overdue' : 'card-date'} title="Son tarix">
                                    <i className="fa-regular fa-calendar-days"></i> {formatDate(task.due_date)}
                                </span>
                            )}
                            {task.comment_count > 0 && (
                                <span className="card-date" title="Şərhlər">
                                    <i className="fa-regular fa-comment"></i> {task.comment_count}
                                </span>
                            )}
                        </div>

                        <div className="card-actions">
                            {task.assignee_name && (
                                <div className="avatar avatar-small" title={`Təyin olunub: ${task.assignee_name}`}>
                                    {initials(task.assignee_name)}
                                </div>
                            )}
                            <button
                                className="icon-btn"
                                title="Düzəliş et"
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onOpen(task.id) }}
                            >
                                <i className="fa-solid fa-pen"></i>
                            </button>
                            <button
                                className="icon-btn"
                                title="Sil"
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onDelete(task) }}
                            >
                                <i className="fa-regular fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                </article>
            )}
        </Draggable>
    )
}
