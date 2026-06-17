'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSocket } from '@/hooks/use-socket';
import { useTimer } from '@/hooks/use-timer';
import { sounds } from '@/lib/sounds';
import type { QuestionStats, LeaderboardEntry } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Pause, Play, SkipForward, Square,
  Trophy, Volume2, VolumeX, BarChart3,
} from 'lucide-react';

type Phase = 'waiting' | 'question' | 'answer-reveal' | 'leaderboard' | 'finished';

const optionLabels = ['A', 'B', 'C', 'D'];
const optionColors = ['bg-kahoot-red', 'bg-kahoot-blue', 'bg-kahoot-yellow', 'bg-kahoot-green'];

export default function HostGamePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { emit, on } = useSocket();
  const timer = useTimer();

  const [phase, setPhase] = useState<Phase>('waiting');
  const [questionData, setQuestionData] = useState<any>(null);
  const [responseCount, setResponseCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState(-1);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [finalResults, setFinalResults] = useState<any>(null);

  useEffect(() => {
    emit('host-join', { sessionId });
  }, [emit, sessionId]);

  useEffect(() => {
    const unsubs = [
      on('host-joined', (data: any) => {
        setTotalPlayers(data.totalPlayers);
      }),
      on('player-joined', (data: any) => {
        setTotalPlayers(data.totalPlayers);
      }),
      on('player-left', (data: any) => {
        setTotalPlayers(data.totalPlayers);
      }),
      on('question-start', (data: any) => {
        setQuestionData(data);
        setPhase('question');
        setResponseCount(0);
        setCorrectAnswer(-1);
        setStats(null);
        timer.start(data.timeLimit);
        sounds.questionStart();
      }),
      on('timer-update', (data: any) => {
        timer.update(data.remaining);
        if (data.remaining <= 5 && data.remaining > 0) sounds.lastSeconds();
      }),
      on('answer-received', (data: any) => {
        setResponseCount(data.responseCount);
        setTotalPlayers(data.totalPlayers);
      }),
      on('question-ended', (data: any) => {
        setCorrectAnswer(data.correctAnswer);
        setStats(data.stats);
        setPhase('answer-reveal');
        timer.reset();
      }),
      on('leaderboard-update', (data: any) => {
        setLeaderboard(data.rankings);
        setPhase('leaderboard');
      }),
      on('quiz-finished', (data: any) => {
        setFinalResults(data);
        setPhase('finished');
        sounds.victory();
      }),
      on('session-paused', () => setPaused(true)),
      on('session-resumed', () => setPaused(false)),
    ];

    return () => unsubs.forEach((u) => u());
  }, [on, timer]);

  const startFirstQuestion = useCallback(() => {
    emit('start-question', { sessionId });
  }, [emit, sessionId]);

  const nextQuestion = () => emit('next-question', { sessionId });
  const pauseSession = () => emit(paused ? 'resume-session' : 'pause-session', { sessionId });
  const endSession = () => emit('end-session', { sessionId });

  if (phase === 'finished' && finalResults) {
    return (
      <div className="min-h-screen kahoot-gradient text-white flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <Trophy className="h-20 w-20 mx-auto mb-4 text-yellow-300" />
          <h1 className="text-4xl font-bold mb-2">Quiz Complete!</h1>
          <p className="text-xl opacity-80 mb-8">{finalResults.totalQuestions} questions answered</p>

          <div className="flex flex-col items-center gap-4 mb-8">
            {finalResults.topThree?.map((p: any, i: number) => (
              <motion.div
                key={p.id}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.3 }}
                className={`flex items-center gap-4 p-4 rounded-xl ${
                  i === 0 ? 'bg-yellow-500/30 scale-110' : 'bg-white/10'
                } backdrop-blur w-full max-w-md`}
              >
                <span className="text-3xl font-bold w-12">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </span>
                <div className="flex-1">
                  <p className="font-bold text-lg">{p.name}</p>
                  {p.teamName && <p className="text-sm opacity-70">{p.teamName}</p>}
                </div>
                <span className="text-2xl font-bold">{p.score}</span>
              </motion.div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => router.push(`/session/${sessionId}/results`)}
              size="lg"
              className="bg-white text-purple-700 hover:bg-white/90"
            >
              View Full Results
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/20"
            >
              Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex items-center justify-between p-3 bg-black/30">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">BIRD LiveQuiz</span>
          {questionData && (
            <span className="text-sm opacity-70">
              Q{questionData.questionNumber}/{questionData.totalQuestions}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm">
            <Users className="h-4 w-4" />
            <span>{responseCount}/{totalPlayers}</span>
          </div>
          <button onClick={() => { setSoundOn(!soundOn); sounds.toggle(!soundOn); }}>
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <Button size="sm" variant="ghost" onClick={pauseSession} className="text-white">
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={endSession} className="text-white">
            <Square className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {paused && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="text-center">
            <Pause className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-3xl font-bold mb-4">Paused</h2>
            <Button size="lg" onClick={pauseSession} className="bg-white text-gray-900">
              <Play className="h-5 w-5 mr-2" /> Resume
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {phase === 'waiting' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start?</h2>
            <p className="text-lg opacity-70 mb-8">{totalPlayers} players connected</p>
            <Button size="xl" onClick={startFirstQuestion} className="bg-green-500 hover:bg-green-600 text-xl">
              <Play className="h-6 w-6 mr-2" /> Start First Question
            </Button>
          </motion.div>
        )}

        {phase === 'question' && questionData && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-4xl"
          >
            <div className="text-center mb-8">
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                  <span className="text-4xl font-bold">{timer.remaining}</span>
                  <span className="text-sm opacity-70">seconds</span>
                </div>
              </div>
              <Progress
                value={timer.percentage}
                className="h-3 mb-6"
                indicatorClassName={timer.remaining <= 5 ? 'bg-red-500' : 'bg-green-500'}
              />
              <h2 className="text-3xl md:text-4xl font-bold mb-2">{questionData.text}</h2>
              {questionData.imageUrl && (
                <img
                  src={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001${questionData.imageUrl}`}
                  alt="Question"
                  className="max-h-48 mx-auto rounded-lg mt-4"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {questionData.options?.map((opt: string, i: number) => (
                <div
                  key={i}
                  className={`${optionColors[i]} p-6 rounded-xl text-center text-xl font-bold shadow-lg`}
                >
                  <span className="text-3xl mr-3">{optionLabels[i]}</span>
                  {opt}
                </div>
              ))}
            </div>
            <div className="text-center mt-6 opacity-70">
              {responseCount} of {totalPlayers} answered
            </div>
          </motion.div>
        )}

        {phase === 'answer-reveal' && questionData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl"
          >
            <h2 className="text-2xl font-bold text-center mb-6">{questionData.text}</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {questionData.options?.map((opt: string, i: number) => {
                const originalIndex = questionData.optionOrder?.[i] ?? i;
                const isCorrect = originalIndex === correctAnswer;
                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 1 }}
                    animate={{ scale: isCorrect ? 1.05 : 0.95, opacity: isCorrect ? 1 : 0.5 }}
                    className={`${isCorrect ? optionColors[i] : 'bg-gray-700'} p-6 rounded-xl text-center text-xl font-bold relative`}
                  >
                    <span className="text-3xl mr-3">{optionLabels[i]}</span>
                    {opt}
                    {isCorrect && <span className="absolute top-2 right-3 text-2xl">✓</span>}
                  </motion.div>
                );
              })}
            </div>
            {stats && (
              <div className="flex justify-center gap-8 text-center">
                <div>
                  <p className="text-3xl font-bold text-green-400">{stats.correct}</p>
                  <p className="text-sm opacity-70">Correct</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-400">{stats.incorrect}</p>
                  <p className="text-sm opacity-70">Incorrect</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'leaderboard' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-2xl"
          >
            <div className="flex items-center justify-center gap-2 mb-8">
              <Trophy className="h-8 w-8 text-yellow-400" />
              <h2 className="text-3xl font-bold">Leaderboard</h2>
            </div>
            <div className="space-y-3">
              {leaderboard.slice(0, 10).map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    i === 0 ? 'bg-yellow-500/20 border border-yellow-500/50' :
                    i === 1 ? 'bg-gray-400/20 border border-gray-400/50' :
                    i === 2 ? 'bg-amber-700/20 border border-amber-700/50' :
                    'bg-white/5'
                  }`}
                >
                  <span className="text-2xl font-bold w-10 text-center">
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold">{entry.name}</p>
                    {entry.teamName && <p className="text-xs opacity-60">{entry.teamName}</p>}
                  </div>
                  <span className="text-xl font-bold">{entry.score}</span>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button size="lg" onClick={nextQuestion} className="bg-green-500 hover:bg-green-600 text-lg">
                <SkipForward className="h-5 w-5 mr-2" /> Next Question
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
