'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { api } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'
import { BOARD_BACKGROUNDS } from '@/lib/colors'
import { daysUntil, initials } from '@/lib/format'
import { useUI } from '@/components/UIProvider'
import Header from '@/components/Header'
import LoadingScreen from '@/components/LoadingScreen'
import Column from '@/components/Column'
import TaskModal from '@/components/TaskModal'

// Board səhifəsi: sütunlar, kartlar, sürüşdürmə, axtarış, filtrlər və statistika
export default function BoardPage() {
    const { id: boardId } = useParams()
    const router = useRouter()
    const user = useRequireAuth()
    const { toast, confirm } = useUI()

    const [data, setData] = useState(null) // { board, workspace, members, columns }
    const [loadError, setLoadError] = useState('')
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
    const [bgId, setBgId] = useState('default')
    const [showBgPicker, setShowBgPicker] = useState(false)

    // Avtomatik yenilənmə bu hallarda dayanır: sürüşdürmə, açıq pəncərə, gedən sorğu
    const draggingRef = useRef(false)
    const pendingRef = useRef(0)
    const modalOpenRef = useRef(false)
    const searchRef = useRef(null)

    const load = useCallback(async () => {
        try {
            const result = await api(`/api/boards/${boardId}`)
            setData(result)
            setLoadError('')
        } catch (err) {
            if (err.status === 404) setNotFound(true)
            else setLoadError(err.message)
        }
    }, [boardId])

    // İlk yükləmə + hər 6 saniyədən bir yenilə (başqa istifadəçilərin dəyişiklikləri görünsün)
    useEffect(() => {
        if (!user) return
        load()
        const timer = setInterval(() => {
            const busy = draggingRef.current || pendingRef.current > 0 || modalOpenRef.current
            if (!busy && !document.hidden) load()
        }, 6000)
        return () => clearInterval(timer)
    }, [user, load])

    useEffect(() => {
        modalOpenRef.current = openTaskId !== null
    }, [openTaskId])

    // Board arxa fonu (seçim bu cihazın brauzerində saxlanılır)
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`gk-bg-${boardId}`)
            if (saved) setBgId(saved)
        } catch (err) { /* brauzer icazə vermirsə, standart qalır */ }
    }, [boardId])

    useEffect(() => {
        const bg = BOARD_BACKGROUNDS.find(b => b.id === bgId)
        document.body.style.backgroundImage = bg && bg.id !== 'default' ? bg.css : ''
        return () => { document.body.style.backgroundImage = '' }
    }, [bgId])

    function chooseBackground(id) {
        setBgId(id)
        setShowBgPicker(false)
        try { localStorage.setItem(`gk-bg-${boardId}`, id) } catch (err) { /* vacib deyil */ }
    }

    // Qısayol: "/" axtarışa fokuslanır
    useEffect(() => {
        function onKey(e) {
            const tag = document.activeElement ? document.activeElement.tagName : ''
            const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
            if (e.key === '/' && !typing && openTaskId === null && searchRef.current) {
                e.preventDefault()
                searchRef.current.focus()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [openTaskId])

    // Server sorğusu gedərkən avtomatik yenilənməni dayandırır
    async function run(request) {
        pendingRef.current += 1
        try {
            return await request()
        } finally {
            pendingRef.current -= 1
        }
    }

    // ------------------------------------------------------------ Əməliyyatlar
    // Hamısı əvvəl ekranı dərhal yeniləyir, sonra serverə yazır. Xəta olarsa serverdəki vəziyyət geri yüklənir.

    const actions = {
        async addTask(columnId, title) {
            try {
                const result = await run(() => api(`/api/columns/${columnId}/tasks`, { method: 'POST', body: { title } }))
                setData(d => ({
                    ...d,
                    columns: d.columns.map(c => c.id === columnId ? { ...c, tasks: [...c.tasks, result.task] } : c)
                }))
                return true
            } catch (err) {
                toast(err.message, 'error')
                return false
            }
        },

        async deleteTask(task) {
            const ok = await confirm({
                title: 'Tapşırığı sil',
                message: `"${task.title}" tapşırığı və bütün şərhləri həmişəlik silinəcək.`,
                confirmText: 'Sil'
            })
            if (!ok) return
            setData(d => ({
                ...d,
                columns: d.columns.map(c => ({ ...c, tasks: c.tasks.filter(t => t.id !== task.id) }))
            }))
            try {
                await run(() => api(`/api/tasks/${task.id}`, { method: 'DELETE' }))
                toast('Tapşırıq silindi', 'success')
            } catch (err) {
                toast(err.message, 'error')
                load()
            }
        },

        async renameColumn(column, title) {
            setData(d => ({ ...d, columns: d.columns.map(c => c.id === column.id ? { ...c, title } : c) }))
            try {
                await run(() => api(`/api/columns/${column.id}`, { method: 'PATCH', body: { title } }))
            } catch (err) {
                toast(err.message, 'error')
                load()
            }
        },

        async deleteColumn(column) {
            const count = column.tasks.length
            const ok = await confirm({
                title: 'Sütunu sil',
                message: count > 0
                    ? `"${column.title}" sütunu və içindəki ${count} tapşırıq həmişəlik silinəcək.`
                    : `"${column.title}" sütunu silinəcək.`,
                confirmText: 'Sil'
            })
            if (!ok) return
            setData(d => ({ ...d, columns: d.columns.filter(c => c.id !== column.id) }))
            try {
                await run(() => api(`/api/columns/${column.id}`, { method: 'DELETE' }))
                toast('Sütun silindi', 'success')
            } catch (err) {
                toast(err.message, 'error')
                load()
            }
        }
    }

    async function addColumn(e) {
        e.preventDefault()
        const trimmed = newColumnTitle.trim()
        if (!trimmed) return
        try {
            const result = await run(() => api(`/api/boards/${boardId}/columns`, { method: 'POST', body: { title: trimmed } }))
            setData(d => ({ ...d, columns: [...d.columns, result.column] }))
            setNewColumnTitle('')
            setAddingColumn(false)
        } catch (err) {
            toast(err.message, 'error')
        }
    }

    async function saveBoardTitle() {
        setEditingBoardTitle(false)
        const trimmed = boardTitle.trim()
        if (!trimmed || trimmed === data.board.title) return
        setData(d => ({ ...d, board: { ...d.board, title: trimmed } }))
        try {
            await run(() => api(`/api/boards/${boardId}`, { method: 'PATCH', body: { title: trimmed } }))
        } catch (err) {
            toast(err.message, 'error')
            load()
        }
    }

    async function deleteBoard() {
        const ok = await confirm({
            title: 'Board-ı sil',
            message: `"${data.board.title}" board-ı və içindəki bütün sütun, tapşırıq və şərhlər həmişəlik silinəcək.`,
            confirmText: 'Sil'
        })
        if (!ok) return
        try {
            await api(`/api/boards/${boardId}`, { method: 'DELETE' })
            toast('Board silindi', 'success')
            router.push('/')
        } catch (err) {
            toast(err.message, 'error')
        }
    }

    // ------------------------------------------------------------ Drag and drop

    function handleDragStart() {
        draggingRef.current = true
    }

    async function handleDragEnd(result) {
        const { source, destination, type, draggableId } = result

        const nothingChanged =
            !destination ||
            (destination.droppableId === source.droppableId && destination.index === source.index)
        if (nothingChanged) {
            draggingRef.current = false
            return
        }

        try {
            if (type === 'COLUMN') {
                const columns = [...data.columns]
                const [moved] = columns.splice(source.index, 1)
                columns.splice(destination.index, 0, moved)
                setData({ ...data, columns })

                await run(() => api(`/api/columns/${moved.id}/move`, {
                    method: 'PATCH',
                    body: { position: destination.index }
                }))
            } else {
                const taskId = Number(draggableId.replace('task-', ''))
                const fromId = Number(source.droppableId.replace('column-', ''))
                const toId = Number(destination.droppableId.replace('column-', ''))

                const columns = data.columns.map(c => ({ ...c, tasks: [...c.tasks] }))
                const fromColumn = columns.find(c => c.id === fromId)
                const toColumn = columns.find(c => c.id === toId)

                const [moved] = fromColumn.tasks.splice(source.index, 1)
                toColumn.tasks.splice(destination.index, 0, { ...moved, column_id: toId })
                setData({ ...data, columns })

                await run(() => api(`/api/tasks/${taskId}/move`, {
                    method: 'PATCH',
                    body: { column_id: toId, position: destination.index }
                }))
            }
        } catch (err) {
            toast(err.message, 'error')
            await load() // xəta olarsa serverdəki real vəziyyəti geri yüklə
        }
        draggingRef.current = false
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

    if (!user) return <LoadingScreen />

    if (notFound) {
        return (
            <div className="container">
                <Header user={user} />
                <div className="glass-panel center-panel">
                    <i className="fa-regular fa-face-frown big-icon"></i>
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
                {loadError ? (
                    <div className="error-box">
                        {loadError}{' '}
                        <button className="link-btn" onClick={load} type="button">Yenidən cəhd et</button>
                    </div>
                ) : (
                    <>
                        <div className="board-bar"><div className="skeleton-line skeleton-title"></div></div>
                        <div className="board">
                            <div className="column skeleton-block"></div>
                            <div className="column skeleton-block"></div>
                            <div className="column skeleton-block"></div>
                        </div>
                        <LoadingScreen text="Board yüklənir..." />
                    </>
                )}
            </div>
        )
    }

    // Statistika: son sütun "tamamlanıb" sayılır
    const lastIndex = data.columns.length - 1
    const hasDoneColumn = data.columns.length > 1
    const totalTasks = data.columns.reduce((sum, c) => sum + c.tasks.length, 0)
    const doneTasks = hasDoneColumn ? data.columns[lastIndex].tasks.length : 0
    const overdueTasks = data.columns.reduce((sum, c, i) => {
        if (hasDoneColumn && i === lastIndex) return sum
        return sum + c.tasks.filter(t => t.due_date && daysUntil(t.due_date) < 0).length
    }, 0)
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

    const columnOptions = data.columns.map(c => ({ id: c.id, title: c.title, count: c.tasks.length }))

    return (
        <div className="container">
            <Header user={user}>
                <div className="search-box">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                        ref={searchRef}
                        type="text"
                        className="search-input"
                        placeholder="Axtar...  ( / )"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); e.target.blur() } }}
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
                    <Link href="/" className="back-link" title="Ana səhifə" aria-label="Ana səhifə">
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

                    <div className="bg-picker-wrap">
                        <button className="icon-btn icon-btn-lg" onClick={() => setShowBgPicker(!showBgPicker)} title="Arxa fon" aria-label="Arxa fon" type="button">
                            <i className="fa-solid fa-palette"></i>
                        </button>
                        {showBgPicker && (
                            <div className="bg-picker">
                                <p>Arxa fon (yalnız bu cihazda)</p>
                                <div className="bg-swatches">
                                    {BOARD_BACKGROUNDS.map(bg => (
                                        <button
                                            key={bg.id}
                                            type="button"
                                            className={bgId === bg.id ? 'swatch active' : 'swatch'}
                                            style={{ background: bg.preview }}
                                            title={bg.label}
                                            aria-label={bg.label}
                                            onClick={() => chooseBackground(bg.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button className="icon-btn icon-btn-lg" onClick={deleteBoard} title="Board-ı sil" aria-label="Board-ı sil" type="button">
                        <i className="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </div>

            <div className="stats-bar">
                <span className="stat-chip"><i className="fa-regular fa-rectangle-list"></i> {totalTasks} tapşırıq</span>
                {overdueTasks > 0 && (
                    <span className="stat-chip stat-danger"><i className="fa-regular fa-clock"></i> {overdueTasks} gecikmiş</span>
                )}
                {hasDoneColumn && totalTasks > 0 && (
                    <div className="progress-wrap" title="Son sütundakı kartların payı (tamamlanma)">
                        <div className="progress"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
                        <span>{progress}% tamamlanıb</span>
                    </div>
                )}
                {filtersActive && (
                    <button className="btn-cancel btn-small" onClick={clearFilters} type="button">
                        <i className="fa-solid fa-filter-circle-xmark"></i> Filtri təmizlə
                    </button>
                )}
            </div>

            {filtersActive && (
                <p className="filter-note">Filtr aktivdir. Kartları sürüşdürmək üçün filtri təmizlə.</p>
            )}
            {loadError && (
                <div className="error-box">
                    Əlaqə problemi: {loadError}{' '}
                    <button className="link-btn" onClick={load} type="button">Yenidən cəhd et</button>
                </div>
            )}

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
                                    filtersActive={filtersActive}
                                    isDone={hasDoneColumn && index === lastIndex}
                                    actions={actions}
                                    onOpenTask={setOpenTaskId}
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
                                            onKeyDown={e => { if (e.key === 'Escape') { setAddingColumn(false); setNewColumnTitle('') } }}
                                        />
                                        <div className="inline-actions">
                                            <button className="btn" type="submit">Əlavə et</button>
                                            <button className="btn-cancel" type="button" aria-label="Bağla" onClick={() => { setAddingColumn(false); setNewColumnTitle('') }}>
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
                    columns={columnOptions}
                    members={data.members}
                    user={user}
                    onClose={() => setOpenTaskId(null)}
                    onChanged={load}
                />
            )}
        </div>
    )
}
