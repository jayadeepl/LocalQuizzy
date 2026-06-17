'use client';

import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeContext } from '@/hooks/use-theme';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>BIRD LiveQuiz - On Device Quizzing Solution</title>
        <meta name="description" content="BIRD Lucknow - On Device Quizzing Solution" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <ThemeContext.Provider value={{ dark, setDark }}>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeContext.Provider>
      </body>
    </html>
  );
}
