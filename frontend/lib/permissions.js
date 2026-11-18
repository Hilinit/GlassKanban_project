// İcazələrin, rolların və statusların adları (backend-dəki açarlarla eynidir)

export const PERMISSION_LIST = [
    { key: 'create_task', label: 'Tapşırıq yaratmaq' },
    { key: 'edit_task', label: 'Tapşırığı redaktə etmək' },
    { key: 'move_task', label: 'Tapşırığı köçürmək' },
    { key: 'delete_task', label: 'Tapşırığı silmək' },
    { key: 'assign_task', label: 'Tapşırıq təyin etmək' },
    { key: 'comment', label: 'Şərh yazmaq' },
    { key: 'delete_own_comment', label: 'Öz şərhini silmək' },
    { key: 'create_column', label: 'Sütun yaratmaq' },
    { key: 'edit_column', label: 'Sütunun adını dəyişmək' },
    { key: 'move_column', label: 'Sütunun yerini dəyişmək' },
    { key: 'delete_column', label: 'Sütunu silmək' },
    { key: 'invite_members', label: 'Üzv dəvət etmək' },
    { key: 'remove_members', label: 'Üzvü workspace-dən çıxarmaq' },
    { key: 'edit_member_titles', label: 'Üzvün vəzifəsini dəyişmək' },
    { key: 'manage_permissions', label: 'Digər üzvlərin icazələrini dəyişmək' }
]

export const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer' }

export const ROLE_HINTS = {
    owner: 'Workspace sahibi: hər şeyi edə bilər',
    admin: 'Tapşırıq və komandanı idarə edir, icazələri dəyişə bilməz (sahib verməyincə)',
    member: 'İşləyir: tapşırıq, board və şərhlərlə',
    viewer: 'Yalnız baxa bilər'
}

const ALL_PERMISSIONS = PERMISSION_LIST.map(permission => permission.key)
const MEMBER_DEFAULTS = [
    'create_task', 'edit_task', 'move_task', 'delete_task', 'assign_task', 'comment',
    'delete_own_comment', 'create_column', 'edit_column', 'move_column', 'delete_column'
]
const permissionsFor = enabled => Object.fromEntries(
    ALL_PERMISSIONS.map(key => [key, enabled.includes(key)])
)

export const ROLE_DEFAULTS = {
    owner: permissionsFor(ALL_PERMISSIONS),
    admin: permissionsFor(ALL_PERMISSIONS.filter(key => key !== 'manage_permissions')),
    member: permissionsFor(MEMBER_DEFAULTS),
    viewer: permissionsFor([])
}

export const STATUS_LABELS = {
    active: 'Aktiv',
    pending: 'Gözləyir',
    rejected: 'İmtina edib',
    removed: 'Çıxarılıb'
}

export const JOB_TITLES = [
    'Frontend Developer',
    'Backend Developer',
    'Full-Stack Developer',
    'UI/UX Designer',
    'QA Engineer',
    'Project Manager',
    'DevOps Engineer',
    'Data Analyst',
    'Product Owner',
    'Business Analyst'
]
