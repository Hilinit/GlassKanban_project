'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { api } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'
import { initials } from '@/lib/format'
import Header from '@/components/Header'
import Column from '@/components/Column'
import TaskModal from '@/components/TaskModal'

// Board səhifəsi: sütunlar, kartlar, sürüşdürmə, axtarış və filtrlər
export default function BoardPage() {
    const { id: boardId } = useParams()
    const router = useRouter()
    const user = useRequireAuth()

    const [data, setData] = useState(null) // { board, workspace, members, columns }
    const [error, setError] = useState('')
    const [notFound, setNotFound] = useState(false)

    // Filtrlər
    const [search, setSearch] = useState('')
    const [priorityFilter, setPriorityFilter] = useState('all')
    const [assigneeFilter, setAssigneeFilter] = useState('all')

    // Pəncərələr və redaktə
    const [openTaskId, setOpenTaskId] = useState(null)
    const [editingBoardTitle, setEditingBoardTitle] = useState(false)
    const [boardTitle, setBoardTitle] = useState('')
    const [addingColumn, setAddingColumn] = useState(false)
    const [newColumnTitle, setNewColumnTitle] = useState('')

    // Avtomatik yenilənmə sürüşdürmə zamanı və ya pəncərə açıq olanda dayanır
    const busyRef = useRef(false)

    const load = useCallback(async () => {
        try {
            const result = await api(`/api/boards/${boardId}`)
            setData(result)
            setError('')
        } catch (err) {
            if (err.status === 404) setNotFound(true)
            else setError(err.message)
        }
    }, [boardId])

    // İlk yükləmə + hər 6 saniyədən bir yenilə (başqa istifadəçilərin dəyişiklikləri görünsün)
    useEffect(() => {
        if (!user) return
        load()
        const timer = setInterval(() => {
            if (!busyRef.current && !document.hidden) load()
        }, 6000)
        return () => clearInterval(timer)
    }, [user, load])

    useEffect(() => {
        busyRef.current = openTaskId !== null
    }, [openTaskId])

    // ------------------------------------------------------------ Drag and drop

    function handleDragStart() {
        busyRef.current = true
    }

    async function handleDragEnd(result) {
        const { source, destination, type, draggableId } = result

        const nothingChanged =
            !destination ||
            (destination.droppableId === source.droppableId && destination.index === source.index)
        if (nothingChanged) {
            busyRef.current = openTaskId !== null
            return
        }

        try {
            if (type === 'COLUMN') {
                // Sütunun yerini dəyiş: əvvəl ekranda, sonra serverdə
                const columns = [...data.columns]
                const [moved] = columns.splice(source.index, 1)
                columns.splice(destination.index, 0, moved)
                setData({ ...data, columns })

                await api(`/api/columns/${moved.id}/move`, {
                    method: 'PATCH',
                    body: { position: destination.index }
                })
            } else {
                // Tapşırığı köçür
                const taskId = Number(draggableId.replace('task-', ''))
                const fromId = Number(source.droppableId.replace('column-', ''))
                const toId = Number(destination.droppableId.replace('column-', ''))

                const columns = data.columns.map(c => ({ ...c, tasks: [...c.tasks] }))
                const fromColumn = columns.find(c => c.id === fromId)
                const toColumn = columns.find(c => c.id === toId)

                const [moved] = fromColumn.tasks.splice(source.index, 1)
                toColumn.tasks.splice(destination.index, 0, { ...moved, column_id: toId })
                setData({ ...data, columns })

                await api(`/api/tasks/${taskId}/move`, {
                    method: 'PATCH',
                    body: { column_id: toId, position: destination.index }
                })
            }
        } catch (err) {
            setError(err.message)
            await load() // xəta olarsa serverdəki real vəziyyəti geri yüklə
        }
        busyRef.current = openTaskId !== null
    }

    // ------------------------------------------------------------ Board əməliyyatları

    async function saveBoardTitle() {
        setEditingBoardTitle(false)
        const trimmed = boardTitle.trim()
        if (!trimmed || trimmed === data.board.title) return
        try {
            await api(`/api/boards/${boardId}`, { method: 'PATCH', body: { title: trimmed } })
            load()
        } catch (err) {
            setError(err.message)
        }
    }

    async function deleteBoard() {
        if (!confirm(`"${data.board.title}" board-ı və içindəki bütün tapşırıqlar silinəcək. Əminsən?`)) return
        try {
            await api(`/api/boards/${boardId}`, { method: 'DELETE' })
            router.push('/')
        } catch (err) {
            setError(err.message)
        }
    }

    async function addColumn(e) {
        e.preventDefault()
        const trimmed = newColumnTitle.trim()
        if (!trimmed) return
        try {
            await api(`/api/boards/${boardId}/columns`, { method: 'POST', body: { title: trimmed } })
            setNewColumnTitle('')
            setAddingColumn(false)
            load()
        } catch (err) {
            setError(err.message)
        }
    }

    // ------------------------------------------------------------ Filtr

    const query = search.toLowerCase().trim()
    const filtersActive = query !== '' || priorityFilter !== 'all' || assigneeFilter !== 'all'

    function visibleTasks(column) {
        return column.tasks.filter(task => {
            const matchesSearch =
                !query ||
                task.title.toLowerCase().includes(query) ||
                (task.description || '').toLowerCase().includes(query)
            const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
            const matchesAssignee =
                assigneeFilter === 'all' ||
                (assigneeFilter === 'me' ? task.assignee_id === user.id : String(task.assignee_id) === assigneeFilter)
            return matchesSearch && matchesPriority && matchesAssignee
        })
    }

    function clearFilters() {
        setSearch('')
        setPriorityFilter('all')
        setAssigneeFilter('all')
    }

    // ------------------------------------------------------------ Görünüş

    if (!user) return <div className="page-loading">Yüklənir...</div>

    if (notFound) {
        return (
            <div className="container">
                <Header user={user} />
                <div className="glass-panel center-panel">
                    <p>Bu board tapılmadı və ya ona çıxışın yoxdur.</p>
                    <Link href="/" className="btn">Ana səhifəyə qayıt</Link>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="container">
                <Header user={user} />
                {error ? <div className="error-box">{error}</div> : <div className="page-loading">Yüklənir...</div>}
            </div>
        )
    }

    const openTaskColumn = data.columns.find(c => c.tasks.some(t => t.id === openTaskId))

    return (
        <div className="container">
            <Header user={user}>
                <div className="search-box">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Axtar..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <select className="filter-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                    <option value="all">Bütün Prioritetlər</option>
                    <option value="high">Yüksək Prioritet</option>
                    <option value="medium">Orta Prioritet</option>
                    <option value="low">Aşağı Prioritet</option>
                </select>

                <select className="filter-select" value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}>
                    <option value="all">Bütün üzvlər</option>
                    <option value="me">Mənə təyin olunanlar</option>
                    {data.members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
            </Header>

            <div className="board-bar">
                <div className="board-bar-left">
                    <Link href="/" className="back-link" title="Ana səhifə">
                        <i className="fa-solid fa-arrow-left"></i>
                    </Link>

                    {editingBoardTitle ? (
                        <input
                            className="input board-title-input"
                            autoFocus
                            value={boardTitle}
                            onChange={e => setBoardTitle(e.target.value)}
                            onBlur={saveBoardTitle}
                            onKeyDown={e => {
                                if (e.key === 'Enter') saveBoardTitle()
                                if (e.key === 'Escape') setEditingBoardTitle(false)
                            }}
                        />
                    ) : (
                        <h2
                            className="board-title"
                            title="Adı dəyişmək üçün klik et"
                            onClick={() => { setBoardTitle(data.board.title); setEditingBoardTitle(true) }}
                        >
                            {data.board.title}
                        </h2>
                    )}
                    <span className="workspace-tag">{data.workspace.name}</span>
                </div>

                <div className="board-bar-right">
                    <div className="avatar-stack">
                        {data.members.map(m => (
                            <div className="avatar" key={m.id} title={`${m.name} (${m.email})`}>{initials(m.name)}</div>
                        ))}
                    </div>
                    {filtersActive && (
                        <button className="btn-cancel" onClick={clearFilters} type="button">
                            <i className="fa-solid fa-filter-circle-xmark"></i> Filtri təmizlə
                        </button>
                    )}
                    <button className="icon-btn" onClick={deleteBoard} title="Board-ı sil" type="button">
                        <i className="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </div>

            {filtersActive && (
                <p className="filter-note">Filtr aktivdir — kartları sürüşdürmək üçün filtri təmizlə.</p>
            )}
            {error && <div className="error-box">{error}</div>}

            <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <Droppable droppableId="board" direction="horizontal" type="COLUMN">
                    {(provided) => (
                        <main className="board" ref={provided.innerRef} {...provided.droppableProps}>
                            {data.columns.map((column, index) => (
                                <Column
                                    key={column.id}
                                    column={column}
                                    index={index}
                                    tasks={visibleTasks(column)}
                                    dragDisabled={filtersActive}
                                    onOpenTask={setOpenTaskId}
                                    onChanged={load}
                                    onError={setError}
                                />
                            ))}
                            {provided.placeholder}

                            <div className="add-column">
                                {addingColumn ? (
                                    <form onSubmit={addColumn}>
                                        <input
                                            className="input"
                                            autoFocus
                                            placeholder="Sütun adı"
                                            value={newColumnTitle}
                                            onChange={e => setNewColumnTitle(e.target.value)}
                                        />
                                        <div className="inline-actions">
                                            <button className="btn" type="submit">Əlavə et</button>
                                            <button className="btn-cancel" type="button" onClick={() => { setAddingColumn(false); setNewColumnTitle('') }}>
                                                <i className="fa-solid fa-xmark"></i>
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <button className="add-column-btn" onClick={() => setAddingColumn(true)} type="button">
                                        <i className="fa-solid fa-plus"></i> Sütun əlavə et
                                    </button>
                                )}
                            </div>
                        </main>
                    )}
                </Droppable>
            </DragDropContext>

            {openTaskId && (
                <TaskModal
                    taskId={openTaskId}
                    columnTitle={openTaskColumn ? openTaskColumn.title : ''}
                    members={data.members}
                    user={user}
                    onClose={() => setOpenTaskId(null)}
                    onChanged={load}
                />
            )}
        </div>
    )
}
