'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/hooks/use-socket';
import { api } from '@/lib/api';
import { sounds } from '@/lib/sounds';
import type { QuizSession, Participant } from '@/types';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Play, Copy, Check, Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { emit, on, connected } = useSocket();

  const [session, setSession] = useState<QuizSession | null>(null);
  const [players, setPlayers] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [hostJoined, setHostJoined] = useState(false);

  useEffect(() => {
    api.get<QuizSession>(`/sessions/${sessionId}`).then((data) => {
      setSession(data);
      setPlayers(data.participants || []);
    });
  }, [sessionId]);

  useEffect(() => {
    if (!connected) return;

    emit('host-join', { sessionId });

    const unsub0 = on('host-joined', (data: any) => {
      setHostJoined(true);
      if (data.totalPlayers > 0) {
        api.get<QuizSession>(`/sessions/${sessionId}`).then((s) => {
          setPlayers(s.participants || []);
        });
      }
    });

    const unsub1 = on('player-joined', (data: any) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.id === data.participant.id)) return prev;
        return [...prev, data.participant];
      });
      sounds.joinGame();
    });

    const unsub2 = on('player-left', (data: any) => {
      setPlayers((prev) => prev.filter((p) => p.id !== data.participantId));
    });

    return () => { unsub0(); unsub1(); unsub2(); };
  }, [emit, on, sessionId, connected]);

  const startQuiz = () => {
    if (players.length === 0) {
      toast.error('Wait for players to join');
      return;
    }
    router.push(`/session/${sessionId}/host`);
  };

  const leaveLobby = () => {
    router.push('/dashboard');
  };

  const copyPin = () => {
    if (session) {
      navigator.clipboard.writeText(session.pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!session) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const joinUrl = `http://${hostname}:3000/join?pin=${session.pin}`;

  return (
    <div className="min-h-screen kahoot-gradient text-white flex flex-col">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={leaveLobby}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/20 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit
        </button>
        <h1 className="text-xl font-bold">BIRD LiveQuiz</h1>
        <button onClick={() => { setSoundOn(!soundOn); sounds.toggle(!soundOn); }}>
          {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-8">
        <div className="text-center">
          <p className="text-lg opacity-80 mb-2">Join at</p>
          <p className="text-2xl font-bold mb-4">{hostname}:3000/join</p>
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-lg opacity-80">Game PIN:</span>
            <span className="text-5xl md:text-7xl font-extrabold tracking-widest">
              {session.pin}
            </span>
            <button onClick={copyPin} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              {copied ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-2xl">
          <QRCodeSVG value={joinUrl} size={200} />
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="h-6 w-6" />
            <span className="text-3xl font-bold">{players.length}</span>
            <span className="text-lg opacity-80">players</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
            <AnimatePresence>
              {players.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm font-medium"
                >
                  {p.name}
                  {p.teamName && (
                    <span className="ml-1 opacity-70">({p.teamName})</span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <Button
          onClick={startQuiz}
          size="xl"
          className="bg-white text-purple-700 hover:bg-white/90 text-xl font-bold px-16"
        >
          <Play className="h-6 w-6 mr-2" /> Start Quiz
        </Button>
      </div>

      <div className="p-4 text-center opacity-60 text-sm">
        {session.quiz.title} &middot; {session.quiz.questions?.length ?? 0} questions
        {session.teamMode && ' · Team Mode'}
      </div>
    </div>
  );
}
