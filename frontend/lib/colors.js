// Board arxa fonları (seçim brauzerdə saxlanılır) və ana səhifədəki board rəngləri

const DEFAULT_IMAGE = "linear-gradient(rgba(11, 12, 16, 0.45), rgba(11, 12, 16, 0.80)), url('https://i.pinimg.com/736x/8c/38/8a/8c388a72a9bfee0124e8603407aeed5a.jpg')"

export const BOARD_BACKGROUNDS = [
    { id: 'default', label: 'Standart', css: DEFAULT_IMAGE, preview: '#1b1d27' },
    { id: 'night', label: 'Gecə', css: 'linear-gradient(135deg, #0f172a, #1e1b4b 55%, #312e81)', preview: 'linear-gradient(135deg, #0f172a, #312e81)' },
    { id: 'ocean', label: 'Okean', css: 'linear-gradient(135deg, #082f49, #0c4a6e 50%, #115e59)', preview: 'linear-gradient(135deg, #082f49, #115e59)' },
    { id: 'forest', label: 'Meşə', css: 'linear-gradient(135deg, #052e16, #14532d 55%, #365314)', preview: 'linear-gradient(135deg, #052e16, #365314)' },
    { id: 'sunset', label: 'Qürub', css: 'linear-gradient(135deg, #431407, #7c2d12 50%, #581c87)', preview: 'linear-gradient(135deg, #431407, #581c87)' },
    { id: 'violet', label: 'Bənövşəyi', css: 'linear-gradient(135deg, #2e1065, #4c1d95 50%, #831843)', preview: 'linear-gradient(135deg, #2e1065, #831843)' }
]

const BOARD_ACCENTS = [
    { color: '#8b5cf6', soft: 'rgba(139, 92, 246, 0.18)', glow: 'rgba(139, 92, 246, 0.22)' },
    { color: '#f97316', soft: 'rgba(249, 115, 22, 0.18)', glow: 'rgba(249, 115, 22, 0.2)' },
    { color: '#22c55e', soft: 'rgba(34, 197, 94, 0.17)', glow: 'rgba(34, 197, 94, 0.19)' },
    { color: '#06b6d4', soft: 'rgba(6, 182, 212, 0.17)', glow: 'rgba(6, 182, 212, 0.2)' },
    { color: '#ec4899', soft: 'rgba(236, 72, 153, 0.17)', glow: 'rgba(236, 72, 153, 0.2)' },
    { color: '#eab308', soft: 'rgba(234, 179, 8, 0.17)', glow: 'rgba(234, 179, 8, 0.19)' }
]

// Board ID-si palitranı sabit seçir; eyni board hər yerdə eyni rəngdə qalır.
export function boardAccent(id) {
    const boardNumber = Number(id)
    const index = Number.isFinite(boardNumber) ? (Math.max(1, Math.trunc(boardNumber)) - 1) % BOARD_ACCENTS.length : 0
    return BOARD_ACCENTS[index]
}
