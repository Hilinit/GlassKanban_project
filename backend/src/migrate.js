// Migration icra edən skript.
//
//   npm run migrate -- --status      hansı migration-lar tətbiq olunub/gözləyir (heç nə yazmır)
//   npm run migrate -- --dry-run     migration-ı transaction içində işlədir və GERİ ALIR (heç nə dəyişmir)
//   npm run migrate -- --yes         migration-ları həqiqətən tətbiq edir
//
// Server işə düşəndə migration AVTOMATİK İŞLƏMİR. Bazanı yalnız bu skript dəyişir.
const fs = require('fs')
const path = require('path')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations')

function listMigrationFiles() {
    return fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
}

async function appliedMigrations(pool) {
    const exists = await pool.query("SELECT to_regclass('public.schema_migrations') AS t")
    if (!exists.rows[0].t) return []
    const result = await pool.query('SELECT name FROM schema_migrations')
    return result.rows.map(r => r.name)
}

// Qaytarır: { applied: [...], pending: [...] }
async function migrationStatus(pool) {
    const applied = await appliedMigrations(pool)
    const pending = listMigrationFiles().filter(f => !applied.includes(f))
    return { applied, pending }
}

// dryRun=true: hər şey transaction içində icra olunur və sonda ROLLBACK edilir
async function runMigrations(pool, { dryRun = false, log = () => {} } = {}) {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
            name       VARCHAR(200) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`)
        const done = (await client.query('SELECT name FROM schema_migrations')).rows.map(r => r.name)

        const ran = []
        for (const file of listMigrationFiles()) {
            if (done.includes(file)) continue
            log(`  -> ${file}`)
            await client.query(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'))
            await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
            ran.push(file)
        }

        await client.query(dryRun ? 'ROLLBACK' : 'COMMIT')
        return ran
    } catch (err) {
        await client.query('ROLLBACK')
        throw err
    } finally {
        client.release()
    }
}

module.exports = { migrationStatus, runMigrations, listMigrationFiles }

// ---------------------------------------------------------------- komanda sətri
if (require.main === module) {
    require('dotenv').config()
    const { pool } = require('./db')

    const args = process.argv.slice(2)
    const target = new URL(process.env.DATABASE_URL)
    console.log(`Hədəf baza: ${target.hostname}:${target.port || 5432}${target.pathname}  (istifadəçi: ${decodeURIComponent(target.username)})`)

    ;(async () => {
        const { applied, pending } = await migrationStatus(pool)
        console.log(`Tətbiq olunub: ${applied.length ? applied.join(', ') : '(yoxdur)'}`)
        console.log(`Gözləyir:      ${pending.length ? pending.join(', ') : '(yoxdur)'}`)

        if (args.includes('--status') || pending.length === 0) return

        if (args.includes('--dry-run')) {
            console.log('\nDRY-RUN: migration icra olunur və geri alınır...')
            await runMigrations(pool, { dryRun: true, log: console.log })
            console.log('DRY-RUN uğurlu. Bazada heç nə dəyişmədi.')
            return
        }

        if (!args.includes('--yes')) {
            console.log('\nBu əmr bazanı dəyişəcək. Hədəf bazanın düzgün olduğuna əmin olandan sonra --yes əlavə et:')
            console.log('  npm run migrate -- --yes')
            return
        }

        console.log('\nTətbiq olunur...')
        const ran = await runMigrations(pool, { log: console.log })
        console.log(`Hazırdır: ${ran.length} migration tətbiq olundu.`)
    })()
        .catch(err => { console.error('Migration xətası (heç nə dəyişmədi):', err.message); process.exitCode = 1 })
        .finally(() => pool.end())
}
