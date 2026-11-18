'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'
import { ROLE_LABELS } from '@/lib/permissions'
import { useUI } from '@/components/UIProvider'
import Header from '@/components/Header'
import Avatar from '@/components/Avatar'
import LoadingScreen from '@/components/LoadingScreen'

// Şəkli brauzerdə 256px-ə kiçildir (bazada kiçik ölçüdə saxlanılır)
function resizeImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('Şəkil oxunmadı'))
        reader.onload = () => {
            const img = new Image()
            img.onerror = () => reject(new Error('Bu fayl şəkil deyil'))
            img.onload = () => {
                const size = 256
                const scale = Math.max(size / img.width, size / img.height)
                const canvas = document.createElement('canvas')
                canvas.width = size
                canvas.height = size
                const w = img.width * scale
                const h = img.height * scale
                canvas.getContext('2d').drawImage(img, (size - w) / 2, (size - h) / 2, w, h) // mərkəzdən kvadrat kəsik
                resolve(canvas.toDataURL('image/jpeg', 0.85))
            }
            img.src = reader.result
        }
        reader.readAsDataURL(file)
    })
}

// Şəxsi profil: ümumi məlumatlar (bütün workspace-lərdə eyni) və AYRICA mənim workspace rollarım
export default function ProfilePage() {
    const user = useRequireAuth()
    const { toast } = useUI()
    const fileRef = useRef(null)

    const [profile, setProfile] = useState(null)
    const [workspaces, setWorkspaces] = useState(null)
    const [firstName, setFirstName] = useState('')
    const [surname, setSurname] = useState('')
    const [phone, setPhone] = useState('')
    const [bio, setBio] = useState('')
    const [avatar, setAvatar] = useState(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [editing, setEditing] = useState(false)

    function fill(p) {
        setProfile(p)
        setFirstName(p.first_name || '')
        setSurname(p.surname || '')
        setPhone(p.phone || '')
        setBio(p.bio || '')
        setAvatar(p.avatar_url || null)
        setEditing(false)
    }

    function beginEditing() {
        fill(profile)
        setError('')
        setEditing(true)
    }

    function cancelEditing() {
        fill(profile)
        setError('')
    }

    useEffect(() => {
        if (!user) return
        api('/api/profile').then(data => fill(data.profile)).catch(err => setError(err.message))
        api('/api/workspaces').then(data => setWorkspaces(data.workspaces)).catch(() => setWorkspaces([]))
    }, [user])

    async function pickFile(e) {
        const file = e.target.files && e.target.files[0]
        e.target.value = ''
        if (!file) return
        try {
            setAvatar(await resizeImage(file))
        } catch (err) {
            toast(err.message, 'error')
        }
    }

    async function save(e) {
        e.preventDefault()
        setError('')
        setSaving(true)
        try {
            const data = await api('/api/profile', {
                method: 'PUT',
                body: { first_name: firstName, surname, phone, bio, avatar_url: avatar }
            })
            fill(data.profile)
            toast('Profil yadda saxlanıldı', 'success')
        } catch (err) {
            setError(err.message)
        }
        setSaving(false)
    }

    if (!user) return <LoadingScreen />

    return (
        <div className="container">
            <Header user={user} />

            <div className="page-head">
                <Link href="/" className="back-link" title="Ana səhifə" aria-label="Ana səhifə">
                    <i className="fa-solid fa-arrow-left"></i>
                </Link>
                <h2 className="board-title static">Şəxsi profil</h2>
            </div>

            {!profile && !error && <div className="skeleton-block"></div>}
            {!profile && error && <div className="error-box">{error}</div>}

            {profile && (
                <section className="glass-panel profile-card">
                    <div className="profile-avatar-col">
                        <Avatar user={{ name: `${firstName} ${surname}`.trim() || profile.name, avatar_url: avatar }} size="xl" />
                        {editing && (
                            <>
                                <div className="inline-actions">
                                    <button className="btn-cancel btn-small" type="button" onClick={() => fileRef.current.click()}>
                                        <i className="fa-solid fa-camera"></i> Şəkil seç
                                    </button>
                                    {avatar && <button className="btn-cancel btn-small" type="button" onClick={() => setAvatar(null)}>Sil</button>}
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
                                <p className="hint">Şəkil avtomatik kiçildilir. Bütün workspace-lərdə eyni görünür.</p>
                            </>
                        )}
                    </div>

                    <div className="profile-fields">
                        <div className="section-bar">
                            <h3 className="profile-split"><i className="fa-regular fa-id-card"></i> Şəxsi məlumatlar</h3>
                            {!editing && (
                                <button className="btn-cancel btn-small" type="button" onClick={beginEditing}>
                                    <i className="fa-solid fa-pen"></i> Redaktə et
                                </button>
                            )}
                        </div>
                        <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>Bu məlumatlar bütün workspace-lərdə eynidir.</p>

                        {editing ? (
                            <form onSubmit={save}>
                                <div className="field-row">
                                    <div className="field">
                                        <label htmlFor="first-name">Ad</label>
                                        <input id="first-name" className="input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                                    </div>
                                    <div className="field">
                                        <label htmlFor="surname">Soyad</label>
                                        <input id="surname" className="input" value={surname} onChange={e => setSurname(e.target.value)} />
                                    </div>
                                </div>

                                <div className="field">
                                    <label htmlFor="email">E-poçt (dəyişdirilmir)</label>
                                    <input id="email" className="input" value={profile.email} disabled />
                                    <p className="hint">Workspace rəhbərləri sənə dəvət göndərmək üçün bu e-poçtdan istifadə edir.</p>
                                </div>

                                <div className="field">
                                    <label htmlFor="phone">Telefon</label>
                                    <input id="phone" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+994 50 000 00 00" />
                                    <p className="hint">Telefon yalnız sənə görünür.</p>
                                </div>

                                <div className="field">
                                    <label htmlFor="bio">Haqqımda</label>
                                    <textarea id="bio" className="input" rows={4} maxLength={500} value={bio} onChange={e => setBio(e.target.value)} placeholder="Qısa məlumat..." />
                                    <p className="hint">{bio.length}/500</p>
                                </div>

                                {error && <div className="error-box">{error}</div>}

                                <div className="inline-actions">
                                    <button className="btn" type="submit" disabled={saving}>{saving ? 'Saxlanılır...' : 'Yadda saxla'}</button>
                                    <button className="btn-cancel" type="button" onClick={cancelEditing} disabled={saving}>Ləğv et</button>
                                </div>
                            </form>
                        ) : (
                            <dl className="profile-list wide">
                                <dt>Ad soyad</dt><dd>{[profile.first_name, profile.surname].filter(Boolean).join(' ') || profile.name}</dd>
                                <dt>E-poçt</dt><dd>{profile.email}</dd>
                                <dt>Telefon</dt><dd>{profile.phone || 'Daxil edilməyib'}</dd>
                                <dt>Haqqımda</dt><dd>{profile.bio || 'Daxil edilməyib'}</dd>
                            </dl>
                        )}
                    </div>
                </section>
            )}

            {profile && (
                <section className="glass-panel profile-section" aria-label="Workspace rollarım">
                    <h3><i className="fa-solid fa-layer-group"></i> Workspace-lərdəki rolların və vəzifələrin</h3>
                    <p className="hint">
                        Bu bölmə yalnız sənə görünür. Rol, vəzifə və icazələr hər workspace üçün ayrıca təyin olunur
                        və başqa workspace-lərin üzvləri sənin digər workspace-lərdəki üzvlüyünü görmür.
                    </p>
                    {!workspaces && <div className="skeleton-line"></div>}
                    {workspaces && workspaces.length === 0 && <div className="empty">Hələ aktiv workspace-in yoxdur</div>}
                    <div className="my-roles">
                        {workspaces && workspaces.map(w => (
                            <div className="my-role-row" key={w.id} data-testid="my-role-row">
                                <strong>{w.name}</strong>
                                <div className="chip-row">
                                    <span className="role-tag">{ROLE_LABELS[w.role]}</span>
                                    <span className="meta-chip"><i className="fa-solid fa-briefcase"></i> {w.job_title || 'Vəzifə təyin edilməyib'}</span>
                                    <Link href={`/workspace/${w.id}`} className="btn-cancel btn-small">Aç</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
