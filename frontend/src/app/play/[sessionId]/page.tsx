'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSocket } from '@/hooks/use-socket';
import { useTimer } from '@/hooks/use-timer';
import { sounds } from '@/lib/sounds';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check, X, Trophy, Loader2 } from 'lucide-react';

type Phase = 'waiting' | 'question' | 'answered' | 'result' | 'leaderboard' | 'finished';

const optionLabels = ['A', 'B', 'C', 'D'];
const optionColors = [
  'bg-kahoot-red hover:bg-kahoot-red/90 active:bg-kahoot-red/80',
  'bg-kahoot-blue hover:bg-kahoot-blue/90 active:bg-kahoot-blue/80',
  'bg-kahoot-yellow hover:bg-kahoot-yellow/90 active:bg-kahoot-yellow/80',
  'bg-kahoot-green hover:bg-kahoot-green/90 active:bg-kahoot-green/80',
];

export default function PlayerGamePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { emit, on } = useSocket();
  const timer = useTimer();

  const [phase, setPhase] = useState<Phase>('waiting');
  const [questionData, setQuestionData] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState(-1);
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; score: number } | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(0);
  const [finalResults, setFinalResults] = useState<any>(null);
  const playerName = typeof window !== 'undefined' ? localStorage.getItem('playerName') || 'Player' : 'Player';
  const participantId = typeof window !== 'undefined' ? localStorage.getItem('participantId') : null;

  useEffect(() => {
    const unsubs = [
      on('question-start', (data: any) => {
        setQuestionData(data);
        setPhase('question');
        setSelectedAnswer(-1);
        setAnswerResult(null);
        timer.start(data.timeLimit);
        sounds.questionStart();
      }),
      on('timer-update', (data: any) => {
        timer.update(data.remaining);
        if (data.remaining <= 3 && data.remaining > 0) sounds.tick();
      }),
      on('answer-confirmed', (data: any) => {
        setAnswerResult(data);
        setPhase('result');
        if (data.isCorrect) {
          sounds.correct();
          setMyScore((prev) => prev + data.score);
        } else {
          sounds.incorrect();
        }
      }),
      on('question-ended', () => {
        if (phase === 'question') {
          setPhase('result');
          setAnswerResult({ isCorrect: false, score: 0 });
        }
      }),
      on('leaderboard-update', (data: any) => {
        setPhase('leaderboard');
        const rank = data.rankings.findIndex((r: any) => r.id === participantId);
        setMyRank(rank + 1);
        const me = data.rankings.find((r: any) => r.id === participantId);
        if (me) setMyScore(me.score);
      }),
      on('quiz-finished', (data: any) => {
        setFinalResults(data);
        setPhase('finished');
        sounds.victory();
      }),
      on('session-paused', () => {}),
      on('session-resumed', () => {}),
    ];

    return () => unsubs.forEach((u) => u());
  }, [on, timer, phase, participantId]);

  const submitAnswer = (index: number) => {
    if (selectedAnswer >= 0 || !questionData) return;
    setSelectedAnswer(index);
    setPhase('answered');
    emit('submit-answer', {
      sessionId,
      questionId: questionData.questionId,
      answer: index,
    });
  };

  if (phase === 'finished' && finalResults) {
    const myResult = finalResults.participants?.find((p: any) => p.id === participantId);
    const rank = finalResults.participants?.findIndex((p: any) => p.id === participantId) + 1;

    return (
      <div className="min-h-screen kahoot-gradient text-white flex flex-col items-center justify-center p-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-300" />
          <h1 className="text-3xl font-bold mb-2">Game Over!</h1>
          <p className="text-6xl font-extrabold mb-2">{myResult?.score ?? myScore}</p>
          <p className="text-xl opacity-80 mb-1">points</p>
          <p className="text-lg opacity-70 mb-6">
            Rank #{rank || myRank} of {finalResults.participants?.length ?? 0}
          </p>
          {rank <= 3 && (
            <p className="text-4xl mb-4">
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
            </p>
          )}
          <p className="text-sm opacity-60">
            {myResult?.totalCorrect ?? 0}/{finalResults.totalQuestions} correct
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <div className="flex items-center justify-between p-3 bg-black/30 text-sm">
        <span className="font-medium">{playerName}</span>
        <span className="font-bold">{myScore} pts</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {phase === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Get Ready!</h2>
              <p className="text-lg opacity-70">Waiting for the host to start...</p>
            </motion.div>
          )}

          {phase === 'question' && questionData && (
            <motion.div
              key="question"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-lg"
            >
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-5 w-5" />
                  <span className={`text-3xl font-bold ${timer.remaining <= 5 ? 'text-red-400' : ''}`}>
                    {timer.remaining}
                  </span>
                </div>
                <Progress
                  value={timer.percentage}
                  className="h-2 mb-3"
                  indicatorClassName={timer.remaining <= 5 ? 'bg-red-500' : 'bg-green-500'}
                />
                <p className="text-sm opacity-60">
                  Q{questionData.questionNumber}/{questionData.totalQuestions}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {questionData.options?.map((opt: string, i: number) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => submitAnswer(i)}
                    className={`${optionColors[i]} p-6 rounded-xl text-white text-lg font-bold flex items-center gap-4 transition-all shadow-lg`}
                  >
                    <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-white/20">
                      {optionLabels[i]}
                    </span>
                    <span className="flex-1 text-left">{opt}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'answered' && (
            <motion.div
              key="answered"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                optionColors[selectedAnswer]?.split(' ')[0]
              }`}>
                <span className="text-3xl font-bold">{optionLabels[selectedAnswer]}</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Answer Submitted!</h2>
              <p className="text-lg opacity-70">Waiting for results...</p>
              <Loader2 className="h-6 w-6 mx-auto mt-4 animate-spin opacity-50" />
            </motion.div>
          )}

          {phase === 'result' && answerResult && (
            <motion.div
              key="result"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              {answerResult.isCorrect ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center"
                  >
                    <Check className="h-12 w-12" />
                  </motion.div>
                  <h2 className="text-3xl font-bold mb-2 text-green-400">Correct!</h2>
                  <p className="text-4xl font-extrabold">+{answerResult.score}</p>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 mx-auto mb-4 rounded-full bg-red-500 flex items-center justify-center"
                  >
                    <X className="h-12 w-12" />
                  </motion.div>
                  <h2 className="text-3xl font-bold text-red-400">Wrong!</h2>
                  <p className="text-lg opacity-60 mt-2">Better luck next time</p>
                </>
              )}
            </motion.div>
          )}

          {phase === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <Trophy className="h-12 w-12 mx-auto mb-3 text-yellow-400" />
              <p className="text-5xl font-extrabold mb-2">#{myRank}</p>
              <p className="text-lg opacity-70 mb-4">Your current rank</p>
              <p className="text-2xl font-bold">{myScore} points</p>
              <p className="text-sm opacity-50 mt-4">Next question coming up...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
