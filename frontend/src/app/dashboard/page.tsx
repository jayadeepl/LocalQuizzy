'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { Quiz, DashboardStats, SessionSummary } from '@/types';
import {
  Plus, FileSpreadsheet, Play, Edit, Trash2, Users,
  LogOut, Moon, Sun, BarChart3, Clock, Upload,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { dark, setDark } = useTheme();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      api.get<Quiz[]>('/quizzes').then(setQuizzes).catch(() => {});
      api.get<DashboardStats>('/quizzes/stats').then(setStats).catch(() => {});
      api.get<SessionSummary[]>('/sessions').then(setSessions).catch(() => {});
    }
  }, [user]);

  const deleteQuiz = async (id: string) => {
    if (!confirm('Delete this quiz and all its data?')) return;
    try {
      await api.delete(`/quizzes/${id}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      toast.success('Quiz deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startSession = async (quizId: string) => {
    try {
      const session = await api.post<any>('/sessions', { quizId });
      router.push(`/session/${session.id}/lobby`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const quiz = await api.post<Quiz>('/quizzes/import', formData);
      setQuizzes((prev) => [quiz, ...prev]);
      toast.success('Quiz imported successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
    e.target.value = '';
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            BIRD LiveQuiz
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.name}
            </span>
            <button onClick={() => setDark(!dark)} className="p-2 rounded-lg hover:bg-accent">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => { logout(); router.push('/'); }}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Quizzes', value: stats?.totalQuizzes ?? 0, icon: FileSpreadsheet },
            { label: 'Total Sessions', value: stats?.totalSessions ?? 0, icon: Clock },
            { label: 'Total Participants', value: stats?.totalParticipants ?? 0, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">My Quizzes</h2>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleImport}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Import
            </Button>
            <Link href="/quiz/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Create Quiz
              </Button>
            </Link>
          </div>
        </div>

        {quizzes.length === 0 ? (
          <Card className="p-12 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No quizzes yet</h3>
            <p className="text-muted-foreground mb-6">Create your first quiz to get started!</p>
            <Link href="/quiz/create">
              <Button><Plus className="h-4 w-4 mr-2" /> Create Quiz</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">{quiz.title}</CardTitle>
                    <Badge variant="secondary">
                      {quiz._count?.questions ?? 0} Q
                    </Badge>
                  </div>
                  {quiz.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <BarChart3 className="h-4 w-4" />
                    {quiz._count?.sessions ?? 0} sessions played
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => startSession(quiz.id)}>
                      <Play className="h-4 w-4 mr-1" /> Start
                    </Button>
                    <Link href={`/quiz/${quiz.id}/edit`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </Link>
                    <Button size="sm" variant="destructive" onClick={() => deleteQuiz(quiz.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {sessions.length > 0 && (
          <>
            <h2 className="text-2xl font-bold">Recent Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.slice(0, 6).map((s) => (
                <Link key={s.id} href={`/session/${s.id}/results`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{(s as any).quiz?.title ?? 'Quiz'}</p>
                        <p className="text-sm text-muted-foreground">
                          PIN: {s.pin} &middot; {s._count?.participants ?? 0} players
                        </p>
                      </div>
                      <Badge variant={s.status === 'FINISHED' ? 'secondary' : 'success'}>
                        {s.status}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
