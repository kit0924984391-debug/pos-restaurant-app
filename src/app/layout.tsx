import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Prompt } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import PwaRegister from '@/components/PwaRegister';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import GlobalButtonSound from '@/components/GlobalButtonSound';

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-prompt',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Order Pos — ระบบจัดการร้านอาหารตามสั่ง & สแกนสั่งอาหาร',
  description: 'ระบบ POS ร้านอาหารตามสั่งขนาดเล็ก พร้อมสแกนสั่งอาหาร สต็อก และสะสมแต้มครบวงจร',
  manifest: '/manifest.json',
  applicationName: 'Order Pos',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Order Pos',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`scroll-smooth ${prompt.variable} ${plusJakarta.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased font-sans text-slate-900 bg-[#F8FAFC] selection:bg-orange-500 selection:text-white overflow-x-hidden max-w-[100vw] w-full">
        <ToastProvider>
          <GlobalButtonSound />
          {children}
          <PwaRegister />
          <PwaInstallPrompt />
        </ToastProvider>
      </body>
    </html>
  );
}
