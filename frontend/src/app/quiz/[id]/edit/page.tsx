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
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft, Plus, Trash2, GripVertical, Save,
  Play, Image, FileText, MessageSquare, Type, TimerOff, Pencil, X,
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
  const [scoringMode, setScoringMode] = useState<'time' | 'correct'>('time');

  const [newQ, setNewQ] = useState({
    text: '',
    options: ['', '', '', ''],
    correctOption: 0,
    timeLimit: 20,
    points: 1000,
    imageUrl: '',
    isSurvey: false,
    questionType: 'mcq' as 'mcq' | 'text',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState({
    text: '',
    options: ['', '', '', ''],
    correctOption: 0,
    timeLimit: 20,
    points: 1000,
    imageUrl: '',
    isSurvey: false,
    questionType: 'mcq' as 'mcq' | 'text',
  });

  useEffect(() => {
    api.get<Quiz>(`/quizzes/${quizId}`).then((data) => {
      setQuiz(data);
      setTitle(data.title);
      setDescription(data.description);
      try {
        const s = JSON.parse(data.settings || '{}');
        if (s.scoringMode) setScoringMode(s.scoringMode);
      } catch {}
    }).catch(() => router.push('/dashboard'));
  }, [quizId, router]);

  const saveQuiz = async () => {
    try {
      const existingSettings = quiz ? JSON.parse(quiz.settings || '{}') : {};
      const settings = JSON.stringify({ ...existingSettings, scoringMode });
      await api.put(`/quizzes/${quizId}`, { title, description, settings });
      toast.success('Quiz saved');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addQuestion = async () => {
    const isText = newQ.questionType === 'text';
    if (!newQ.text) {
      toast.error('Enter question text');
      return;
    }
    if (!isText && newQ.options.some((o) => !o)) {
      toast.error('Fill in all option fields');
      return;
    }
    try {
      const payload: any = {
        text: newQ.text,
        questionType: newQ.questionType,
        timeLimit: newQ.timeLimit,
        imageUrl: newQ.imageUrl || undefined,
      };
      if (isText) {
        payload.options = [];
        payload.correctOption = -1;
        payload.points = 0;
      } else {
        payload.options = newQ.options;
        payload.correctOption = newQ.isSurvey ? -1 : newQ.correctOption;
        payload.points = newQ.points;
      }
      const q = await api.post<Question>(`/quizzes/${quizId}/questions`, payload);
      setQuiz((prev) =>
        prev ? { ...prev, questions: [...(prev.questions || []), q] } : prev,
      );
      setNewQ({ text: '', options: ['', '', '', ''], correctOption: 0, timeLimit: 20, points: 1000, imageUrl: '', isSurvey: false, questionType: 'mcq' });
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

  const startEdit = (q: Question) => {
    const opts = JSON.parse(q.options);
    const isText = q.questionType === 'text';
    const isSurvey = !isText && q.correctOption === -1;
    setEditingId(q.id);
    setEditQ({
      text: q.text,
      options: isText ? ['', '', '', ''] : (opts.length === 4 ? opts : [...opts, ...Array(4 - opts.length).fill('')]),
      correctOption: q.correctOption,
      timeLimit: q.timeLimit,
      points: q.points,
      imageUrl: q.imageUrl || '',
      isSurvey,
      questionType: (q.questionType || 'mcq') as 'mcq' | 'text',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const isText = editQ.questionType === 'text';
    if (!editQ.text) {
      toast.error('Enter question text');
      return;
    }
    if (!isText && editQ.options.some((o) => !o)) {
      toast.error('Fill in all option fields');
      return;
    }
    try {
      const payload: any = {
        text: editQ.text,
        questionType: editQ.questionType,
        timeLimit: editQ.timeLimit,
        imageUrl: editQ.imageUrl || undefined,
      };
      if (isText) {
        payload.options = [];
        payload.correctOption = -1;
        payload.points = 0;
      } else {
        payload.options = editQ.options;
        payload.correctOption = editQ.isSurvey ? -1 : editQ.correctOption;
        payload.points = editQ.points;
      }
      const updated = await api.put<Question>(`/questions/${editingId}`, payload);
      setQuiz((prev) =>
        prev
          ? { ...prev, questions: prev.questions?.map((q) => (q.id === editingId ? updated : q)) }
          : prev,
      );
      setEditingId(null);
      toast.success('Question updated');
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
            <div className="space-y-2">
              <Label>Scoring Mode</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setScoringMode('time')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    scoringMode === 'time'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <div className="font-bold">Time-Based</div>
                  <div className="text-xs mt-1 opacity-70">Faster answers earn more points</div>
                </button>
                <button
                  onClick={() => setScoringMode('correct')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    scoringMode === 'correct'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <div className="font-bold">Correct Answer</div>
                  <div className="text-xs mt-1 opacity-70">Fixed points for each correct answer</div>
                </button>
              </div>
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
                <Label>Question Type</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewQ({ ...newQ, questionType: 'mcq', isSurvey: false })}
                    className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 justify-center ${
                      newQ.questionType === 'mcq'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" /> Multiple Choice
                  </button>
                  <button
                    onClick={() => setNewQ({ ...newQ, questionType: 'text', isSurvey: false })}
                    className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 justify-center ${
                      newQ.questionType === 'text'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                        : 'border-border bg-background text-muted-foreground hover:border-purple-500/50'
                    }`}
                  >
                    <Type className="h-4 w-4" /> Text Response
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Input
                  placeholder={newQ.questionType === 'text' ? 'What comes to mind when you think of...?' : 'What is the capital of France?'}
                  value={newQ.text}
                  onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
                />
              </div>

              {newQ.questionType === 'text' && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <p className="text-sm text-purple-400 font-medium">Word Cloud Question</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Participants type their response freely. Answers are shown as a word cloud where popular responses appear larger.
                  </p>
                </div>
              )}

              {newQ.questionType === 'mcq' && (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Switch
                      checked={newQ.isSurvey}
                      onCheckedChange={(checked) => setNewQ({ ...newQ, isSurvey: checked })}
                    />
                    <div>
                      <Label className="cursor-pointer">Survey Question (No Correct Answer)</Label>
                      <p className="text-xs text-muted-foreground">
                        {newQ.isSurvey
                          ? 'This is a poll — no scoring, just see what participants think'
                          : 'This question has a correct answer and will be scored'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {newQ.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {!newQ.isSurvey && (
                          <div
                            className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold cursor-pointer ${
                              newQ.correctOption === i ? optionColors[i] : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                            onClick={() => setNewQ({ ...newQ, correctOption: i })}
                          >
                            {optionLabels[i]}
                          </div>
                        )}
                        {newQ.isSurvey && (
                          <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold ${optionColors[i]}`}>
                            {optionLabels[i]}
                          </div>
                        )}
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
                  {!newQ.isSurvey && (
                    <p className="text-xs text-muted-foreground">Click a letter to mark it as the correct answer</p>
                  )}
                </>
              )}

              <div className="flex items-end gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={newQ.timeLimit === 0}
                    onCheckedChange={(checked) => setNewQ({ ...newQ, timeLimit: checked ? 0 : 20 })}
                  />
                  <Label className="text-sm cursor-pointer">No Timer</Label>
                </div>
                {newQ.timeLimit > 0 && (
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
                )}
                {newQ.timeLimit === 0 && (
                  <p className="text-xs text-muted-foreground pb-1">Host will end the question manually</p>
                )}
                {newQ.questionType === 'mcq' && !newQ.isSurvey && (
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
                )}
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
            const isSurvey = q.correctOption === -1 && q.questionType !== 'text';
            const isText = q.questionType === 'text';
            const isEditing = editingId === q.id;

            if (isEditing) {
              return (
                <Card key={q.id} className="border-primary">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Editing Q{i + 1}</span>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditQ({ ...editQ, questionType: 'mcq', isSurvey: false })}
                          className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 justify-center ${
                            editQ.questionType === 'mcq'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          <MessageSquare className="h-4 w-4" /> Multiple Choice
                        </button>
                        <button
                          onClick={() => setEditQ({ ...editQ, questionType: 'text', isSurvey: false })}
                          className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 justify-center ${
                            editQ.questionType === 'text'
                              ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                              : 'border-border bg-background text-muted-foreground hover:border-purple-500/50'
                          }`}
                        >
                          <Type className="h-4 w-4" /> Text Response
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Question Text</Label>
                      <Input
                        value={editQ.text}
                        onChange={(e) => setEditQ({ ...editQ, text: e.target.value })}
                      />
                    </div>

                    {editQ.questionType === 'text' && (
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                        <p className="text-sm text-purple-400 font-medium">Word Cloud Question</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Participants type their response freely. Answers are shown as a word cloud where popular responses appear larger.
                        </p>
                      </div>
                    )}

                    {editQ.questionType === 'mcq' && (
                      <>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                          <Switch
                            checked={editQ.isSurvey}
                            onCheckedChange={(checked) => setEditQ({ ...editQ, isSurvey: checked })}
                          />
                          <div>
                            <Label className="cursor-pointer">Survey Question (No Correct Answer)</Label>
                            <p className="text-xs text-muted-foreground">
                              {editQ.isSurvey
                                ? 'This is a poll — no scoring, just see what participants think'
                                : 'This question has a correct answer and will be scored'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {editQ.options.map((opt, j) => (
                            <div key={j} className="flex items-center gap-2">
                              {!editQ.isSurvey ? (
                                <div
                                  className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold cursor-pointer ${
                                    editQ.correctOption === j ? optionColors[j] : 'bg-gray-300 dark:bg-gray-600'
                                  }`}
                                  onClick={() => setEditQ({ ...editQ, correctOption: j })}
                                >
                                  {optionLabels[j]}
                                </div>
                              ) : (
                                <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold ${optionColors[j]}`}>
                                  {optionLabels[j]}
                                </div>
                              )}
                              <Input
                                placeholder={`Option ${optionLabels[j]}`}
                                value={opt}
                                onChange={(e) => {
                                  const o = [...editQ.options];
                                  o[j] = e.target.value;
                                  setEditQ({ ...editQ, options: o });
                                }}
                                className="flex-1"
                              />
                            </div>
                          ))}
                        </div>
                        {!editQ.isSurvey && (
                          <p className="text-xs text-muted-foreground">Click a letter to mark it as the correct answer</p>
                        )}
                      </>
                    )}

                    <div className="flex items-end gap-4">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={editQ.timeLimit === 0}
                          onCheckedChange={(checked) => setEditQ({ ...editQ, timeLimit: checked ? 0 : 20 })}
                        />
                        <Label className="text-sm cursor-pointer">No Timer</Label>
                      </div>
                      {editQ.timeLimit > 0 && (
                        <div className="space-y-1">
                          <Label>Time (sec)</Label>
                          <Input
                            type="number"
                            min={5}
                            max={120}
                            value={editQ.timeLimit}
                            onChange={(e) => setEditQ({ ...editQ, timeLimit: +e.target.value })}
                            className="w-24"
                          />
                        </div>
                      )}
                      {editQ.timeLimit === 0 && (
                        <p className="text-xs text-muted-foreground pb-1">Host will end the question manually</p>
                      )}
                      {editQ.questionType === 'mcq' && !editQ.isSurvey && (
                        <div className="space-y-1">
                          <Label>Points</Label>
                          <Input
                            type="number"
                            min={100}
                            value={editQ.points}
                            onChange={(e) => setEditQ({ ...editQ, points: +e.target.value })}
                            className="w-24"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>
                        <Save className="h-4 w-4 mr-1" /> Save Changes
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Q{i + 1}</span>
                      <p className="font-medium">{q.text}</p>
                      {isText && (
                        <Badge variant="outline" className="text-xs border-purple-500 text-purple-500">
                          Word Cloud
                        </Badge>
                      )}
                      {isSurvey && (
                        <Badge variant="outline" className="text-xs border-blue-500 text-blue-500">
                          Survey
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(q)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {isText ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 mb-2">
                      <Type className="h-4 w-4 text-purple-400" />
                      <span className="text-sm text-purple-400">Participants type free text — shown as word cloud</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {opts.map((opt: string, j: number) => (
                        <div
                          key={j}
                          className={`px-3 py-2 rounded text-sm ${
                            !isSurvey && j === q.correctOption
                              ? `${optionColors[j]} text-white font-medium`
                              : 'bg-secondary'
                          }`}
                        >
                          {optionLabels[j]}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {q.timeLimit > 0 ? (
                      <span>{q.timeLimit}s</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <TimerOff className="h-3 w-3" /> No Timer
                      </span>
                    )}
                    {!isSurvey && !isText && <span>{q.points} pts</span>}
                    {isSurvey && <span className="text-blue-500">Poll</span>}
                    {isText && <span className="text-purple-500">Word Cloud</span>}
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
