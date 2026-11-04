'use client'
import { Draggable } from '@hello-pangea/dnd'
import { PRIORITY_LABELS, dueLabel, dueStatus, initials } from '@/lib/format'

// Bir tapşırıq kartı (sürüşdürülə bilən)
// isDone = kart son sütundadır (tamamlanmış sayılır), gecikmə göstərilmir
export default function TaskCard({ task, index, dragDisabled, isDone, onOpen, onDelete }) {
    const status = task.due_date && !isDone ? dueStatus(task.due_date) : 'ok'

    return (
        <Draggable draggableId={`task-${task.id}`} index={index} isDragDisabled={dragDisabled}>
            {(provided, snapshot) => (
                <article
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`card card-${task.priority}${snapshot.isDragging ? ' dragging' : ''}${isDone ? ' done' : ''}`}
                    onClick={() => onOpen(task.id)}
                >
                    <div className="card-top">
                        <span className="badge">{PRIORITY_LABELS[task.priority]}</span>
                        {isDone && <i className="fa-solid fa-circle-check done-icon" title="Tamamlanıb"></i>}
                    </div>

                    <h3 className="card-title">{task.title}</h3>
                    {task.description && <p className="card-desc">{task.description}</p>}

                    <div className="card-footer">
                        <div className="card-chips">
                            {task.due_date && (
                                <span className={`card-date ${status}`} title="Son tarix">
                                    <i className="fa-regular fa-calendar-days"></i> {dueLabel(task.due_date)}
                                </span>
                            )}
                            {task.description && (
                                <span className="card-date" title="Açıqlaması var">
                                    <i className="fa-solid fa-align-left"></i>
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
                                className="icon-btn card-action-btn"
                                title="Düzəliş et"
                                aria-label="Düzəliş et"
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onOpen(task.id) }}
                            >
                                <i className="fa-solid fa-pen"></i>
                            </button>
                            <button
                                className="icon-btn card-action-btn"
                                title="Sil"
                                aria-label="Sil"
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
