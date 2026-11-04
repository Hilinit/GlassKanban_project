import './globals.css'
import UIProvider from '@/components/UIProvider'

export const metadata = {
    title: 'GlassKanban',
    description: 'Komanda ilə birlikdə işlə: workspace, board və tapşırıqlar'
}

export default function RootLayout({ children }) {
    return (
        <html lang="az">
            <head>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            </head>
            <body>
                <UIProvider>{children}</UIProvider>
            </body>
        </html>
    )
}
