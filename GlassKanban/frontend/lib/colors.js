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

const TILE_COLORS = [
    ['#6366f1', '#8b5cf6'],
    ['#0ea5e9', '#6366f1'],
    ['#10b981', '#0ea5e9'],
    ['#f59e0b', '#ef4444'],
    ['#ec4899', '#8b5cf6'],
    ['#14b8a6', '#22c55e']
]

// Hər board id-si üçün həmişə eyni gradient
export function boardAccent(id) {
    const [from, to] = TILE_COLORS[id % TILE_COLORS.length]
    return `linear-gradient(135deg, ${from}, ${to})`
}
