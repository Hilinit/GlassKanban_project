// Bildiriş yaratmaq. Bildiriş istifadəçinin şəxsi hesabına yazılır (user_id), amma HƏMİŞƏ konkret workspace ilə bağlıdır.
// type: invitation | invitation_accepted | invitation_rejected
// client verilərsə (transaction içində), eyni transaction-da yazılır.
const { query } = require('./db')

async function notify(userId, workspaceId, actorId, type, client) {
    const sql = 'INSERT INTO notifications (user_id, workspace_id, actor_id, type) VALUES ($1, $2, $3, $4)'
    const params = [userId, workspaceId, actorId, type]
    if (client) await client.query(sql, params)
    else await query(sql, params)
}

module.exports = { notify }
