// İcazə yoxlamaları: istifadəçi bu workspace/board/column/task-a çata bilərmi?
//
// Qayda: istifadəçi həmin workspace-in AKTİV üzvü deyilsə (üzv deyil, pending, rejected və ya removed)
// funksiya null qaytarır və route 404 cavab verir. Beləliklə başqa workspace-in məlumatının varlığı belə bilinmir.
// Üzvdürsə sətir qaytarılır və içində istifadəçinin HƏMİN workspace-dəki rolu (my_role) və icazələri (perms) olur.
// İstifadəçi id-si həmişə JWT-dən gəlir (req.user.id), sorğunun gövdəsindən və ya ünvanından yox.
const { query } = require('./db')
const { effectivePermissions } = require('./permissions')

function withPerms(row) {
    if (!row) return null
    const { my_permissions, ...rest } = row
    return { ...rest, perms: effectivePermissions(row.my_role, my_permissions) }
}

async function one(sql, id, userId) {
    const rows = await query(sql, [id, userId])
    return withPerms(rows[0])
}

// Workspace üzvlüyü (yalnız aktiv). Qaytarır: { role, job_title, perms } və ya null
async function getMembership(workspaceId, userId) {
    const rows = await query(
        `SELECT role AS my_role, job_title, permissions AS my_permissions
         FROM workspace_members
         WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'`,
        [workspaceId, userId]
    )
    const row = withPerms(rows[0])
    return row && { role: row.my_role, job_title: row.job_title, perms: row.perms }
}

// Üzvlük sətri istənilən statusda (üzv əlavə etmə/çıxarma zamanı mövcud sətri görmək üçün)
async function getAnyMembership(workspaceId, userId) {
    const rows = await query(
        'SELECT role, status, job_title, permissions FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [workspaceId, userId]
    )
    return rows[0] || null
}

function getBoardForUser(boardId, userId) {
    return one(
        `SELECT b.*, m.role AS my_role, m.permissions AS my_permissions
         FROM boards b
         JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = $2 AND m.status = 'active'
         WHERE b.id = $1`, boardId, userId)
}

function getColumnForUser(columnId, userId) {
    return one(
        `SELECT c.*, b.workspace_id, m.role AS my_role, m.permissions AS my_permissions
         FROM columns c
         JOIN boards b ON b.id = c.board_id
         JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = $2 AND m.status = 'active'
         WHERE c.id = $1`, columnId, userId)
}

function getTaskForUser(taskId, userId) {
    return one(
        `SELECT t.id, t.column_id, t.title, t.description, t.priority, t.assignee_id,
                t.created_by, t.position, to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
                c.board_id, b.workspace_id, m.role AS my_role, m.permissions AS my_permissions
         FROM tasks t
         JOIN columns c ON c.id = t.column_id
         JOIN boards b ON b.id = c.board_id
         JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = $2 AND m.status = 'active'
         WHERE t.id = $1`, taskId, userId)
}

function getCommentForUser(commentId, userId) {
    return one(
        `SELECT cm.id, cm.user_id, b.workspace_id, m.role AS my_role, m.permissions AS my_permissions
         FROM comments cm
         JOIN tasks t ON t.id = cm.task_id
         JOIN columns c ON c.id = t.column_id
         JOIN boards b ON b.id = c.board_id
         JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = $2 AND m.status = 'active'
         WHERE cm.id = $1`, commentId, userId)
}

module.exports = { getMembership, getAnyMembership, getBoardForUser, getColumnForUser, getTaskForUser, getCommentForUser }
