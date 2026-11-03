// İcazə yoxlamaları: istifadəçi bu workspace/board/column/task-a çata bilərmi?
// Hər funksiya uyğun sətri qaytarır, icazə yoxdursa null qaytarır.
const { query } = require('./db')

async function getMembership(workspaceId, userId) {
    const rows = await query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [workspaceId, userId]
    )
    return rows[0] || null
}

async function getBoardForUser(boardId, userId) {
    const rows = await query(
        `SELECT b.* FROM boards b
         JOIN workspace_members m ON m.workspace_id = b.workspace_id
         WHERE b.id = $1 AND m.user_id = $2`,
        [boardId, userId]
    )
    return rows[0] || null
}

async function getColumnForUser(columnId, userId) {
    const rows = await query(
        `SELECT c.*, b.workspace_id FROM columns c
         JOIN boards b ON b.id = c.board_id
         JOIN workspace_members m ON m.workspace_id = b.workspace_id
         WHERE c.id = $1 AND m.user_id = $2`,
        [columnId, userId]
    )
    return rows[0] || null
}

async function getTaskForUser(taskId, userId) {
    const rows = await query(
        `SELECT t.id, t.column_id, t.title, t.description, t.priority, t.assignee_id,
                t.created_by, t.position, to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
                c.board_id, b.workspace_id
         FROM tasks t
         JOIN columns c ON c.id = t.column_id
         JOIN boards b ON b.id = c.board_id
         JOIN workspace_members m ON m.workspace_id = b.workspace_id
         WHERE t.id = $1 AND m.user_id = $2`,
        [taskId, userId]
    )
    return rows[0] || null
}

module.exports = { getMembership, getBoardForUser, getColumnForUser, getTaskForUser }
