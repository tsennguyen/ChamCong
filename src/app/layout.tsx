import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'LUMI Preschool - Mầm Non Khai Minh | Hệ Thống Điểm Danh',
  description: 'LUMI Preschool - Mầm Non Trải Nghiệm STEAM & Tiếng Anh. T16-33, Vinhomes Grand Park, TP. Thủ Đức.',
  icons: {
    icon: [
      { url: '/logolumi.jpg', href: '/logolumi.jpg' },
      { url: '/favicon.ico', href: '/favicon.ico' },
    ],
    apple: '/logolumi.jpg',
    shortcut: '/logolumi.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
