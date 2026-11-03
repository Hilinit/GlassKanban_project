'use client'
import { useEffect } from 'react'

// Ümumi pəncərə. Kənara klik və ya Esc ilə bağlanır.
export default function Modal({ title, onClose, wide, children }) {
    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="modal active" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className={wide ? 'modal-box modal-wide' : 'modal-box'}>
                <div className="modal-head">
                    <h2 className="modal-title">{title}</h2>
                    <button className="icon-btn" onClick={onClose} title="Bağla" type="button">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}
