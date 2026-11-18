// Rollar, icazələr və onların qaydaları (ROL, VƏZİFƏ və İCAZƏ üç ayrı anlayışdır):
//   rol      = owner | admin | member | viewer   (standart icazə dəstini müəyyən edir)
//   vəzifə   = Frontend Developer, UI/UX Designer ... (sadəcə təsviri başlıq, icazəyə təsir etmir)
//   icazələr = hər üzv üçün fərdi açar/söndürücülər (rolun standart dəyərini əvəz edir)

const PERMISSION_KEYS = [
    'create_task',
    'edit_task',
    'move_task',
    'delete_task',
    'assign_task',
    'comment',
    'delete_own_comment',
    'create_column',
    'edit_column',
    'move_column',
    'delete_column',
    'invite_members',
    'remove_members',
    'edit_member_titles',
    'manage_permissions'
]

const LEGACY_PERMISSION_GROUPS = {
    manage_columns: ['create_column', 'edit_column', 'move_column', 'delete_column'],
    manage_members: ['invite_members', 'remove_members', 'edit_member_titles']
}

const ROLES = ['owner', 'admin', 'member', 'viewer']
const ASSIGNABLE_ROLES = ['admin', 'member', 'viewer'] // 'owner' təyin edilə bilməz

function build(trueKeys) {
    const result = {}
    for (const key of PERMISSION_KEYS) result[key] = trueKeys.includes(key)
    return result
}

const ROLE_DEFAULTS = {
    owner: build(PERMISSION_KEYS),
    admin: build(PERMISSION_KEYS.filter(k => k !== 'manage_permissions')),
    member: build([
        'create_task', 'edit_task', 'move_task', 'delete_task', 'assign_task', 'comment',
        'delete_own_comment', 'create_column', 'edit_column', 'move_column', 'delete_column'
    ]),
    viewer: build([])
}

// Yalnız tanınan açarları və true/false dəyərlərini saxlayır
function sanitizePermissions(input) {
    const result = {}
    if (input && typeof input === 'object') {
        for (const key of PERMISSION_KEYS) {
            if (typeof input[key] === 'boolean') result[key] = input[key]
        }
        for (const [legacyKey, keys] of Object.entries(LEGACY_PERMISSION_GROUPS)) {
            if (typeof input[legacyKey] !== 'boolean') continue
            for (const key of keys) {
                if (typeof input[key] !== 'boolean') result[key] = input[legacyKey]
            }
        }
    }
    return result
}

// Üzvün həqiqi icazələri: rolun standartı + fərdi dəyişikliklər. Owner həmişə hər şeyi edə bilər.
function effectivePermissions(role, stored) {
    if (role === 'owner') return { ...ROLE_DEFAULTS.owner }
    const defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.viewer
    return { ...defaults, ...sanitizePermissions(stored) }
}

module.exports = { PERMISSION_KEYS, ROLES, ASSIGNABLE_ROLES, ROLE_DEFAULTS, sanitizePermissions, effectivePermissions }
