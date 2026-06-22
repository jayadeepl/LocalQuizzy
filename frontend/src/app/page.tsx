'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BirdLogo } from '@/components/ui/bird-logo';
import { useTheme } from '@/hooks/use-theme';
import { Moon, Sun, Zap, Users, Trophy, Clock, Wifi } from 'lucide-react';

export default function LandingPage() {
  const { dark, setDark } = useTheme();

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          <BirdLogo size={44} />
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              BIRD LiveQuiz
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">BIRD Lucknow</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link href="/join">
            <Button variant="outline" size="lg">Join Quiz</Button>
          </Link>
          <Link href="/login">
            <Button size="lg">Host a Quiz</Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pt-16 pb-32 text-center">
        <BirdLogo size={80} className="mx-auto mb-4" />
        <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-4">
          BIRD Lucknow presents
        </p>
        <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
          On Device{' '}
          <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 bg-clip-text text-transparent">
            Quizzing
          </span>
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Create interactive quizzes, engage participants in real-time, and make
          every session memorable. No internet required — runs entirely on your local network.
        </p>

        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 px-5 py-3 rounded-full text-sm font-medium mb-12">
          <Wifi className="h-4 w-4" />
          All participants must be connected to the same WiFi network
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link href="/login">
            <Button size="xl" className="text-lg px-10">
              Get Started Free
            </Button>
          </Link>
          <Link href="/join">
            <Button size="xl" variant="outline" className="text-lg px-10">
              Enter Game PIN
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {[
            { icon: Zap, title: 'Real-Time', desc: 'Instant response with WebSocket technology. Zero lag on your network.' },
            { icon: Users, title: '1000+ Players', desc: 'Support for massive groups with live participant tracking.' },
            { icon: Trophy, title: 'Leaderboards', desc: 'Animated rankings after each question. Speed matters!' },
            { icon: Clock, title: 'Timed Rounds', desc: 'Configurable timers per question. Keep the energy high.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
              <Icon className="h-10 w-10 mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-8 text-sm text-muted-foreground border-t">
        <div className="flex items-center justify-center gap-2">
          <BirdLogo size={24} />
          <span>BIRD Lucknow &middot; On Device Quizzing Solution</span>
        </div>
      </footer>
    </div>
  );
}
