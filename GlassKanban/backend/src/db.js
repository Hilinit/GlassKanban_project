// PostgreSQL bağlantısı (Supabase və ya lokal)
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL təyin edilməyib (.env faylına bax).')
    process.exit(1)
}

const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase SSL tələb edir, lokal bazada lazım deyil
    ssl: isLocal ? false : { rejectUnauthorized: false }
})

// Qısa köməkçi: query('SELECT ...', [param1, param2]) -> sətirlər massivi
async function query(text, params) {
    const result = await pool.query(text, params)
    return result.rows
}

// Bir neçə sorğunu "ya hamısı, ya heç biri" kimi icra edir.
// İstifadə: await transaction(async (client) => { await client.query(...); ... })
async function transaction(work) {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        const result = await work(client)
        await client.query('COMMIT')
        return result
    } catch (err) {
        await client.query('ROLLBACK')
        throw err
    } finally {
        client.release()
    }
}

// Cədvəlləri yaradır (yoxdursa)
async function initDb() {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    await pool.query(sql)
}

module.exports = { pool, query, transaction, initDb }
