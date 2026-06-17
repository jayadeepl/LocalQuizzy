'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { Quiz, Question } from '@/types';
import {
  ArrowLeft, Plus, Trash2, GripVertical, Save,
  Play, Image, FileText,
} from 'lucide-react';

export default function QuizEditorPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [aiText, setAiText] = useState('');
  const [showAi, setShowAi] = useState(false);

  const [newQ, setNewQ] = useState({
    text: '',
    options: ['', '', '', ''],
    correctOption: 0,
    timeLimit: 20,
    points: 1000,
    imageUrl: '',
  });

  useEffect(() => {
    api.get<Quiz>(`/quizzes/${quizId}`).then((data) => {
      setQuiz(data);
      setTitle(data.title);
      setDescription(data.description);
    }).catch(() => router.push('/dashboard'));
  }, [quizId, router]);

  const saveQuiz = async () => {
    try {
      await api.put(`/quizzes/${quizId}`, { title, description });
      toast.success('Quiz saved');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addQuestion = async () => {
    if (!newQ.text || newQ.options.some((o) => !o)) {
      toast.error('Fill in all fields');
      return;
    }
    try {
      const q = await api.post<Question>(`/quizzes/${quizId}/questions`, newQ);
      setQuiz((prev) =>
        prev ? { ...prev, questions: [...(prev.questions || []), q] } : prev,
      );
      setNewQ({ text: '', options: ['', '', '', ''], correctOption: 0, timeLimit: 20, points: 1000, imageUrl: '' });
      setShowAdd(false);
      toast.success('Question added');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteQuestion = async (qId: string) => {
    try {
      await api.delete(`/questions/${qId}`);
      setQuiz((prev) =>
        prev
          ? { ...prev, questions: prev.questions?.filter((q) => q.id !== qId) }
          : prev,
      );
      toast.success('Question deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiText.trim()) return;
    try {
      const updated = await api.post<Quiz>(`/quizzes/${quizId}/ai-generate`, { text: aiText });
      setQuiz(updated);
      setShowAi(false);
      setAiText('');
      toast.success('Questions generated!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startSession = async () => {
    try {
      const session = await api.post<any>('/sessions', { quizId });
      router.push(`/session/${session.id}/lobby`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!quiz) return <div className="p-8 text-center">Loading...</div>;

  const questions = quiz.questions || [];
  const optionLabels = ['A', 'B', 'C', 'D'];
  const optionColors = ['bg-kahoot-red', 'bg-kahoot-blue', 'bg-kahoot-yellow', 'bg-kahoot-green'];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveQuiz}>
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
            <Button onClick={startSession} disabled={questions.length === 0}>
              <Play className="h-4 w-4 mr-1" /> Start Quiz
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Questions ({questions.length})</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAi(!showAi)}>
              <FileText className="h-4 w-4 mr-1" /> AI Generate
            </Button>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-4 w-4 mr-1" /> Add Question
            </Button>
          </div>
        </div>

        {showAi && (
          <Card className="mb-4 border-primary">
            <CardContent className="p-4 space-y-3">
              <Label>Paste text to generate questions from</Label>
              <textarea
                className="w-full h-32 p-3 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Paste any text content here... The system will extract key information and generate fill-in-the-blank questions."
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAiGenerate}>Generate Questions</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAi(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showAdd && (
          <Card className="mb-4 border-primary">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Input
                  placeholder="What is the capital of France?"
                  value={newQ.text}
                  onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {newQ.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold cursor-pointer ${
                        newQ.correctOption === i ? optionColors[i] : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      onClick={() => setNewQ({ ...newQ, correctOption: i })}
                    >
                      {optionLabels[i]}
                    </div>
                    <Input
                      placeholder={`Option ${optionLabels[i]}`}
                      value={opt}
                      onChange={(e) => {
                        const opts = [...newQ.options];
                        opts[i] = e.target.value;
                        setNewQ({ ...newQ, options: opts });
                      }}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Click a letter to mark it as the correct answer</p>
              <div className="flex gap-4">
                <div className="space-y-1">
                  <Label>Time (sec)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    value={newQ.timeLimit}
                    onChange={(e) => setNewQ({ ...newQ, timeLimit: +e.target.value })}
                    className="w-24"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Points</Label>
                  <Input
                    type="number"
                    min={100}
                    value={newQ.points}
                    onChange={(e) => setNewQ({ ...newQ, points: +e.target.value })}
                    className="w-24"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addQuestion}>Add Question</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {questions.map((q, i) => {
            const opts = JSON.parse(q.options);
            return (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Q{i + 1}</span>
                      <p className="font-medium">{q.text}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {opts.map((opt: string, j: number) => (
                      <div
                        key={j}
                        className={`px-3 py-2 rounded text-sm ${
                          j === q.correctOption
                            ? `${optionColors[j]} text-white font-medium`
                            : 'bg-secondary'
                        }`}
                      >
                        {optionLabels[j]}. {opt}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{q.timeLimit}s</span>
                    <span>{q.points} pts</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
