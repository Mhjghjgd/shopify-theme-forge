import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ShopifyThemeForge — AI-Powered Shopify Themes',
  description:
    'Generate stunning, professional Shopify themes in minutes using AI. Upload reference images, describe your brand, and get a fully customizable .zip theme ready to import.',
  keywords: ['Shopify theme', 'AI theme generator', 'e-commerce design', 'Shopify builder'],
  openGraph: {
    title: 'ShopifyThemeForge',
    description: 'Generate stunning Shopify themes in 10 minutes with AI',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-[#0a0a0a] text-white min-h-screen antialiased">{children}</body>
    </html>
  );
}
