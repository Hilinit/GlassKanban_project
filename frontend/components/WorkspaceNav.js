'use client'
import Link from 'next/link'
import { ROLE_LABELS } from '@/lib/permissions'
import { formatDate } from '@/lib/format'

// Seçilmiş workspace-in başlığı: ad, MƏNİM rolum və vəzifəm (yalnız bu workspace-də) və bölmələr
// tab = 'boards' | 'team' | 'about'
export default function WorkspaceNav({ workspace, tab }) {
    const hasProjectInfo = workspace.category || workspace.start_date || workspace.end_date

    return (
        <>
            <section className="ws-hero">
                <div className="ws-hero-main">
                    <div className="workspace-icon workspace-icon-lg">{workspace.name[0].toUpperCase()}</div>
                    <div>
                        <h2 className="hero-title">{workspace.name}</h2>
                        <div className="ws-meta">
                            <span className="role-tag" title="Bu workspace-dəki rolun">{ROLE_LABELS[workspace.role]}</span>
                            <span className="meta-chip" title="Bu workspace-dəki vəzifən">
                                <i className="fa-solid fa-briefcase"></i> {workspace.job_title || 'Vəzifə təyin edilməyib'}
                            </span>
                            <span className="meta-chip"><i className="fa-solid fa-user-group"></i> {workspace.member_count} üzv</span>
                        </div>
                    </div>
                </div>
                {hasProjectInfo && tab !== 'about' && (
                    <div className="ws-project-details">
                        <div className="ws-meta">
                            {workspace.category && <span className="meta-chip"><i className="fa-solid fa-tag"></i> {workspace.category}</span>}
                            {workspace.start_date && <span className="meta-chip"><i className="fa-regular fa-calendar"></i> Başlayır: {formatDate(workspace.start_date)}</span>}
                            {workspace.end_date && <span className="meta-chip"><i className="fa-regular fa-calendar-check"></i> Bitir: {formatDate(workspace.end_date)}</span>}
                        </div>
                    </div>
                )}
            </section>

            <nav className="tabs">
                <Link href={`/workspace/${workspace.id}`} className={tab === 'boards' ? 'tab active' : 'tab'}>
                    <i className="fa-solid fa-table-columns"></i> Board-lar
                </Link>
                <Link href={`/workspace/${workspace.id}/team`} className={tab === 'team' ? 'tab active' : 'tab'}>
                    <i className="fa-solid fa-user-group"></i> Komanda
                </Link>
                <Link href={`/workspace/${workspace.id}/about`} className={tab === 'about' ? 'tab active' : 'tab'}>
                    <i className="fa-solid fa-circle-info"></i> Layihə haqqında
                </Link>
            </nav>
        </>
    )
}
