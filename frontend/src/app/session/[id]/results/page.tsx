'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { getApiUrl } from '@/lib/utils';
import type { SessionResults } from '@/types';
import { motion } from 'framer-motion';
import {
  Trophy, Download, ArrowLeft, Users, Target,
  BarChart3, Award, FileSpreadsheet,
} from 'lucide-react';

export default function ResultsPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [results, setResults] = useState<SessionResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SessionResults>(`/sessions/${sessionId}/results`)
      .then(setResults)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  const exportExcel = () => {
    window.open(`${getApiUrl()}/sessions/${sessionId}/export`, '_blank');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!results) return <div className="min-h-screen flex items-center justify-center">No results found</div>;

  const { participants, totalQuestions, topThree, session } = results;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Link>
          <Button variant="outline" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-2" /> Export Excel
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{session.quiz.title}</h1>
          <p className="text-muted-foreground">
            {totalQuestions} questions &middot; {participants.length} participants
            &middot; PIN: {session.pin}
          </p>
        </div>

        {topThree.length > 0 && (
          <div className="flex justify-center items-end gap-4 mb-12">
            {[1, 0, 2].map((pos) => {
              const p = topThree[pos];
              if (!p) return <div key={pos} className="w-32" />;
              const heights = ['h-40', 'h-32', 'h-24'];
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <motion.div
                  key={p.id}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: pos * 0.2 }}
                  className="text-center"
                >
                  <p className="text-4xl mb-2">{medals[pos]}</p>
                  <p className="font-bold text-lg mb-1">{p.name}</p>
                  <p className="text-sm text-muted-foreground mb-3">{p.score} pts</p>
                  <div className={`${heights[pos]} w-28 md:w-36 rounded-t-xl kahoot-gradient`} />
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{participants.length}</p>
              <p className="text-sm text-muted-foreground">Participants</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{totalQuestions}</p>
              <p className="text-sm text-muted-foreground">Questions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">
                {participants.length > 0
                  ? Math.round(
                      participants.reduce((sum, p) => sum + (p.accuracy || 0), 0) /
                        participants.length,
                    )
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Avg Accuracy</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Full Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {participants.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50"
                >
                  <span className="w-8 text-center font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {p.teamName && (
                        <Badge variant="secondary" className="text-xs">{p.teamName}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <Progress
                        value={p.accuracy || 0}
                        className="h-2 flex-1 max-w-xs"
                      />
                      <span className="text-xs text-muted-foreground w-20">
                        {(p as any).totalCorrect}/{totalQuestions} correct
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{p.score}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(p.accuracy || 0)}%
                    </p>
                  </div>
                  <Link
                    href={`/session/${sessionId}/certificate/${p.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    <Award className="h-4 w-4" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
