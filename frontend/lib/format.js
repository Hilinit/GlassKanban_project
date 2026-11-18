// Tarix və mətn köməkçiləri (aylar Azərbaycan dilində)
const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

// '2026-12-01' -> '1 Dekabr 2026'
export function formatDate(dateString) {
    if (!dateString) return ''
    const [year, month, day] = String(dateString).slice(0, 10).split('-').map(Number)
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return String(dateString)
    return `${day} ${MONTHS[month - 1]} ${year}`
}

// ISO vaxt -> '27 İyul 2026, 13:19'
export function formatDateTime(isoString) {
    const d = new Date(isoString)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`
}

// Bu gündən neçə gün qalıb? (mənfi = keçib)
export function daysUntil(dateString) {
    const [year, month, day] = dateString.split('-').map(Number)
    const now = new Date()
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    return Math.round((Date.UTC(year, month - 1, day) - today) / 86400000)
}

// 'overdue' (keçib) | 'soon' (bu gün/sabah) | 'ok'
export function dueStatus(dateString) {
    const days = daysUntil(dateString)
    if (days < 0) return 'overdue'
    if (days <= 1) return 'soon'
    return 'ok'
}

// Kartda göstəriləcək qısa yazı: Bu gün / Sabah / Dünən / tarix
export function dueLabel(dateString) {
    const days = daysUntil(dateString)
    if (days === 0) return 'Bu gün'
    if (days === 1) return 'Sabah'
    if (days === -1) return 'Dünən'
    return formatDate(dateString)
}

// Bu gündən offset gün sonrakı tarix, 'YYYY-MM-DD' formatında
export function dateFromToday(offset) {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
}

export const PRIORITY_LABELS = { low: 'Aşağı', medium: 'Orta', high: 'Yüksək' }

// 'Xəyalə İsmayılzadə' -> 'Xİ'
export function initials(name) {
    if (!name) return '?'
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

// '5 dəq əvvəl', '2 saat əvvəl', '3 gün əvvəl'
export function timeAgo(isoString) {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(isoString).getTime()) / 1000))
    if (seconds < 60) return 'indicə'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} dəq əvvəl`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} saat əvvəl`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} gün əvvəl`
    return formatDateTime(isoString)
}
