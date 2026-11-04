'use client'
import { useEffect, useRef } from 'react'

// Açıq pəncərələrin siyahısı: Esc basanda yalnız ən üstdəki bağlanır
const openModals = []

// Ümumi pəncərə. Kənara klik və ya Esc ilə bağlanır.
// size: 'small' | (boş = normal) | 'wide'
export default function Modal({ title, onClose, size, children }) {
    const closeRef = useRef(onClose)
    closeRef.current = onClose

    useEffect(() => {
        const token = {}
        openModals.push(token)

        function onKey(e) {
            if (e.key === 'Escape' && openModals[openModals.length - 1] === token) {
                closeRef.current()
            }
        }
        window.addEventListener('keydown', onKey)

        return () => {
            window.removeEventListener('keydown', onKey)
            openModals.splice(openModals.indexOf(token), 1)
        }
    }, [])

    const boxClass = size === 'wide' ? 'modal-box modal-wide' : size === 'small' ? 'modal-box modal-small' : 'modal-box'

    return (
        <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className={boxClass} role="dialog" aria-modal="true" aria-label={title}>
                <div className="modal-head">
                    <h2 className="modal-title">{title}</h2>
                    <button className="icon-btn" onClick={onClose} title="Bağla" aria-label="Bağla" type="button">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}
