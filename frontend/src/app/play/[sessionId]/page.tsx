'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSocket } from '@/hooks/use-socket';
import { useTimer } from '@/hooks/use-timer';
import { sounds } from '@/lib/sounds';
import { BirdLogo } from '@/components/ui/bird-logo';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Clock, Check, X, Trophy, Loader2, Send } from 'lucide-react';

type Phase = 'connecting' | 'waiting' | 'question' | 'answered' | 'result' | 'leaderboard' | 'finished';

const optionLabels = ['A', 'B', 'C', 'D'];
const optionColors = [
  'bg-kahoot-red hover:bg-kahoot-red/90 active:bg-kahoot-red/80',
  'bg-kahoot-blue hover:bg-kahoot-blue/90 active:bg-kahoot-blue/80',
  'bg-kahoot-yellow hover:bg-kahoot-yellow/90 active:bg-kahoot-yellow/80',
  'bg-kahoot-green hover:bg-kahoot-green/90 active:bg-kahoot-green/80',
];

export default function PlayerGamePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { emit, on, connected } = useSocket();
  const timer = useTimer();

  const [phase, setPhase] = useState<Phase>('connecting');
  const [questionData, setQuestionData] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState(-1);
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; score: number; isSurvey?: boolean } | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(0);
  const [finalResults, setFinalResults] = useState<any>(null);
  const [isSurvey, setIsSurvey] = useState(false);
  const [isText, setIsText] = useState(false);
  const [noTimer, setNoTimer] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [paused, setPaused] = useState(false);
  const [playerName, setPlayerName] = useState('Player');
  // undefined = not read from localStorage yet, null = confirmed absent.
  const [participantId, setParticipantId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    // Read localStorage only after mount. Reading it during render produces
    // a different value on the client's first pass than on the server
    // render, which throws a React hydration mismatch on every load/reload.
    setPlayerName(localStorage.getItem('playerName') || 'Player');
    setParticipantId(localStorage.getItem('participantId'));
  }, []);

  useEffect(() => {
    if (participantId === undefined) return; // still waiting on the read above

    if (!connected) {
      // The socket dropped (network blip, tab backgrounded, etc). Show a
      // reconnecting state instead of leaving stale question/answer UI up.
      setPhase('connecting');
      return;
    }

    if (participantId && sessionId) {
      // Re-run on every (re)connect, not just the first one: a reconnect
      // gets a brand new socket.id, so the server needs to be told again
      // which participant this socket belongs to.
      emit('rejoin-room', { sessionId, participantId });
    } else {
      router.replace('/join');
    }
  }, [connected, participantId, sessionId, emit, router]);

  useEffect(() => {
    const unsubs = [
      on('rejoin-success', (data: any) => {
        setMyScore(data.score || 0);
        setPhase('waiting');
      }),
      on('rejoin-failed', () => {
        localStorage.removeItem('participantId');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('playerName');
        router.replace('/join');
      }),
      on('question-start', (data: any) => {
        setQuestionData(data);
        setPhase('question');
        setSelectedAnswer(-1);
        setAnswerResult(null);
        setIsSurvey(data.isSurvey || false);
        setIsText(data.questionType === 'text');
        setNoTimer(data.timeLimit === 0);
        setTextInput('');
        if (data.timeLimit > 0) {
          timer.start(data.timeLimit);
        } else {
          timer.reset();
        }
        sounds.questionStart();
      }),
      on('timer-update', (data: any) => {
        timer.update(data.remaining);
        if (data.remaining <= 3 && data.remaining > 0) sounds.tick();
      }),
      on('answer-confirmed', (data: any) => {
        setAnswerResult(data);
        setPhase('result');
        if (data.isSurvey) {
          sounds.correct();
        } else if (data.isCorrect) {
          sounds.correct();
          setMyScore((prev) => prev + data.score);
        } else {
          sounds.incorrect();
        }
      }),
      on('question-ended', (data: any) => {
        if (phase === 'question') {
          setPhase('result');
          const survey = data?.isSurvey || isSurvey;
          setAnswerResult({ isCorrect: false, score: 0, isSurvey: survey });
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
      on('session-paused', () => setPaused(true)),
      on('session-resumed', () => setPaused(false)),
      on('session-sync', (data: any) => {
        if (data.status === 'LOBBY') {
          setPhase('waiting');
          return;
        }
        if (data.status === 'FINISHED') {
          setFinalResults(data.results);
          setPhase('finished');
          sounds.victory();
          return;
        }

        setPaused(data.status === 'PAUSED');
        setQuestionData(data.question);
        setIsSurvey(data.question.isSurvey || false);
        setIsText(data.question.questionType === 'text');
        setNoTimer(data.question.timeLimit === 0);

        if (data.alreadyAnswered) {
          setAnswerResult(data.myResponse || { isCorrect: false, score: 0, isSurvey: true });
          setPhase('result');
        } else {
          setSelectedAnswer(-1);
          setAnswerResult(null);
          setTextInput('');
          if (data.question.timeLimit > 0) {
            timer.start(data.question.timeLimit);
            timer.update(data.remaining);
          } else {
            timer.reset();
          }
          setPhase('question');
        }
      }),
    ];

    return () => unsubs.forEach((u) => u());
    // timer.start/update/reset are stable (see useTimer), so they're
    // intentionally left out here — including the `timer` object itself
    // would resubscribe every listener on every tick since it changes
    // identity each time `remaining` updates.
  }, [on, phase, participantId]);

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

  const submitTextAnswer = () => {
    if (!textInput.trim() || !questionData) return;
    setPhase('answered');
    emit('submit-text-answer', {
      sessionId,
      questionId: questionData.questionId,
      textAnswer: textInput.trim(),
    });
  };

  if (phase === 'finished' && finalResults) {
    const myResult = finalResults.participants?.find((p: any) => p.id === participantId);
    const rank = finalResults.participants?.findIndex((p: any) => p.id === participantId) + 1;

    return (
      <div className="min-h-screen kahoot-gradient text-white flex flex-col items-center justify-center p-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <span className="flex justify-center mb-3"><BirdLogo size={48} variant="dark-bg" /></span>
          <p className="text-sm font-semibold tracking-widest uppercase text-white/60 mb-4">BIRD Lucknow</p>
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
        <div className="flex items-center gap-1.5">
          <BirdLogo size={18} variant="dark-bg" />
          <span className="font-bold text-purple-400">BIRD LiveQuiz</span>
        </div>
        <span className="font-medium">{playerName}</span>
        <span className="font-bold">{myScore} pts</span>
      </div>

      {paused && (phase === 'question' || phase === 'answered') && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Host Paused the Game</h2>
            <p className="text-lg opacity-70">Hang tight, we&apos;ll resume shortly...</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {phase === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Reconnecting...</h2>
              <p className="text-lg opacity-70">Please wait</p>
            </motion.div>
          )}

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
                {noTimer ? (
                  <p className="text-sm text-amber-400 mb-2">Take your time — no timer</p>
                ) : (
                  <>
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
                  </>
                )}
                <p className="text-sm opacity-60">
                  Q{questionData.questionNumber}/{questionData.totalQuestions}
                </p>
              </div>

              {isText ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-center">{questionData.text}</h3>
                  <div className="flex gap-2">
                    <Input
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Type your answer..."
                      className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-lg h-14"
                      onKeyDown={(e) => e.key === 'Enter' && submitTextAnswer()}
                      autoFocus
                    />
                    <Button
                      onClick={submitTextAnswer}
                      disabled={!textInput.trim()}
                      className="bg-purple-500 hover:bg-purple-600 h-14 px-6"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ) : (
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
              )}
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
              {isText ? (
                <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-purple-500">
                  <Check className="h-10 w-10" />
                </div>
              ) : (
                <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  optionColors[selectedAnswer]?.split(' ')[0]
                }`}>
                  <span className="text-3xl font-bold">{optionLabels[selectedAnswer]}</span>
                </div>
              )}
              <h2 className="text-2xl font-bold mb-2">Answer Submitted!</h2>
              {isText && textInput && (
                <p className="text-lg text-purple-400 mb-2">&quot;{textInput}&quot;</p>
              )}
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
              {answerResult.isSurvey || isSurvey ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 mx-auto mb-4 rounded-full bg-blue-500 flex items-center justify-center"
                  >
                    <Check className="h-12 w-12" />
                  </motion.div>
                  <h2 className="text-3xl font-bold mb-2 text-blue-400">Response Recorded!</h2>
                  <p className="text-lg opacity-60 mt-2">Thanks for your input</p>
                </>
              ) : answerResult.isCorrect ? (
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
