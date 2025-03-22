import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import "./globals.css";


const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Tea Tracker',
  description: 'Track your tea consumption',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${geistMono.variable}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
