'use client'
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Modal from '@/components/Modal'

// Brauzerin alert/confirm pəncərələri əvəzinə:
//   const { toast, confirm } = useUI()
//   toast('Yadda saxlanıldı', 'success')           // 'success' | 'error' | 'info'
//   const ok = await confirm({ title, message, confirmText })   // true / false
const UIContext = createContext(null)

export function useUI() {
    return useContext(UIContext)
}

const TOAST_ICONS = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info'
}

export default function UIProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const [dialog, setDialog] = useState(null)
    const nextId = useRef(1)

    const toast = useCallback((message, type = 'info') => {
        const id = nextId.current++
        setToasts(list => [...list, { id, message, type }])
        setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 4000)
    }, [])

    const confirm = useCallback((options) => {
        return new Promise(resolve => setDialog({ ...options, resolve }))
    }, [])

    function closeDialog(result) {
        dialog.resolve(result)
        setDialog(null)
    }

    return (
        <UIContext.Provider value={{ toast, confirm }}>
            {children}

            <div className="toast-stack" aria-live="polite">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        <i className={`fa-solid ${TOAST_ICONS[t.type]}`}></i>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>

            {dialog && (
                <Modal title={dialog.title || 'Əminsən?'} size="small" onClose={() => closeDialog(false)}>
                    <p className="confirm-text">{dialog.message}</p>
                    <div className="modal-actions">
                        <button className="btn-cancel" type="button" autoFocus onClick={() => closeDialog(false)}>
                            Ləğv et
                        </button>
                        <button
                            className={dialog.danger === false ? 'btn' : 'btn-danger-solid'}
                            type="button"
                            onClick={() => closeDialog(true)}
                        >
                            {dialog.confirmText || 'Təsdiq et'}
                        </button>
                    </div>
                </Modal>
            )}
        </UIContext.Provider>
    )
}
