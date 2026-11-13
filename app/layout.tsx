import type { Metadata, Viewport } from 'next';
import { Archivo, Figtree, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// Archivo is a variable font: leave weight out so the width axis (wdth) can be used.
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });
const figtree = Figtree({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-figtree', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'SKE Projects', template: '%s · SKE Projects' },
  description: 'Project workflow for Shri Krishna Enterprises',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#FFFFFF' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${figtree.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}