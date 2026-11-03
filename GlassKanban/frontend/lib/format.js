// Tarix köməkçiləri (aylar Azərbaycan dilində, əvvəlki versiyadakı kimi)
const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

// '2026-12-01' -> '1 Dekabr 2026'
export function formatDate(dateString) {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('-').map(Number)
    return `${day} ${MONTHS[month - 1]} ${year}`
}

// ISO vaxt -> '27 İyul 2026, 13:19'
export function formatDateTime(isoString) {
    const d = new Date(isoString)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`
}

// Bu gün 'YYYY-MM-DD' formatında (istifadəçinin yerli vaxtı ilə)
export function todayString() {
    const d = new Date()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
}

export const PRIORITY_LABELS = { low: 'Aşağı', medium: 'Orta', high: 'Yüksək' }

// 'Abi İsmayılzadə' -> 'Aİ'
export function initials(name) {
    if (!name) return '?'
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}
