'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSocket } from '@/hooks/use-socket';
import { sounds } from '@/lib/sounds';
import { toast } from 'sonner';
import { Gamepad2 } from 'lucide-react';

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { emit, on } = useSocket();
  const joinSent = useRef(false);

  const [pin, setPin] = useState(searchParams.get('pin') || '');
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub1 = on('joined', (data: any) => {
      setLoading(false);
      sounds.joinGame();
      localStorage.setItem('participantId', data.participant.id);
      localStorage.setItem('sessionId', data.sessionId);
      localStorage.setItem('playerName', data.participant.name);
      router.push(`/play/${data.sessionId}`);
    });

    const unsub2 = on('error', (data: any) => {
      setLoading(false);
      joinSent.current = false;
      toast.error(data.message);
    });

    return () => { unsub1(); unsub2(); };
  }, [on, router]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || !name) {
      toast.error('Enter PIN and your name');
      return;
    }
    if (joinSent.current) return;
    joinSent.current = true;
    setLoading(true);
    emit('join-room', {
      pin: pin.trim(),
      playerName: name.trim(),
      teamName: teamName.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 kahoot-gradient">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1">BIRD Lucknow</p>
          <Gamepad2 className="h-12 w-12 mx-auto mb-2 text-primary" />
          <CardTitle className="text-2xl">Join Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Game PIN</Label>
              <Input
                id="pin"
                placeholder="Enter 6-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest h-14 font-bold"
                maxLength={6}
                inputMode="numeric"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Your Nickname</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-center text-lg h-12"
                maxLength={20}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Team Name (optional)</Label>
              <Input
                id="team"
                placeholder="Team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="text-center"
                maxLength={20}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full text-lg h-14"
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Enter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center kahoot-gradient"><p className="text-white text-xl">Loading...</p></div>}>
      <JoinForm />
    </Suspense>
  );
}
