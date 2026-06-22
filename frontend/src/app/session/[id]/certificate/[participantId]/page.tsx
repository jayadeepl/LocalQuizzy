'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { BirdLogo } from '@/components/ui/bird-logo';
import { Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CertificateData {
  name: string;
  quizTitle: string;
  score: number;
  rank: number;
  totalParticipants: number;
  date: string;
}

export default function CertificatePage() {
  const params = useParams();
  const sessionId = params.id as string;
  const participantId = params.participantId as string;
  const [data, setData] = useState<CertificateData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    api.get<CertificateData>(`/sessions/${sessionId}/certificate/${participantId}`)
      .then(setData)
      .catch(() => {});
  }, [sessionId, participantId]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const w = 800;
    const h = 600;
    canvas.width = w;
    canvas.height = h;

    const drawCert = (logoImg?: HTMLImageElement) => {
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#46178f');
      gradient.addColorStop(1, '#7b2ff7');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(20, 20, w - 40, h - 40);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.strokeRect(30, 30, w - 60, h - 60);

      const yOff = logoImg ? 50 : 0;

      if (logoImg) {
        const logoSize = 60;
        ctx.drawImage(logoImg, w / 2 - logoSize / 2, 45, logoSize, logoSize);
      }

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('CERTIFICATE OF ACHIEVEMENT', w / 2, 80 + yOff);

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.fillText('This certifies that', w / 2, 140 + yOff);

      ctx.font = 'bold 40px Arial';
      ctx.fillText(data.name, w / 2, 200 + yOff);

      ctx.font = '16px Arial';
      ctx.fillText('has successfully completed', w / 2, 260 + yOff);

      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(data.quizTitle, w / 2, 310 + yOff);

      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Arial';
      ctx.fillText(
        `Rank #${data.rank} of ${data.totalParticipants} participants`,
        w / 2,
        370 + yOff);
      ctx.fillText(`Score: ${data.score} points`, w / 2, 410 + yOff);

      ctx.font = '14px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(data.date, w / 2, 480);

      ctx.fillText('BIRD Lucknow - On Device Quizzing Solution', w / 2, 550);
    };

    const logo = new window.Image();
    logo.onload = () => drawCert(logo);
    logo.onerror = () => drawCert();
    logo.src = '/bird-logo.png';
  }, [data]);

  const download = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `certificate-${data?.name || 'quiz'}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  if (!data) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/session/${sessionId}/results`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Results
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BirdLogo size={28} />
              <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">BIRD LiveQuiz</span>
            </div>
            <Button onClick={download}>
              <Download className="h-4 w-4 mr-2" /> Download Certificate
            </Button>
          </div>
        </div>
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="rounded-xl shadow-2xl max-w-full"
            style={{ maxWidth: 800 }}
          />
        </div>
      </div>
    </div>
  );
}
