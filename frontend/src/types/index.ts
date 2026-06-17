export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  userId: string;
  settings: string;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
  _count?: { questions: number; sessions: number };
  sessions?: SessionSummary[];
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  imageUrl?: string;
  options: string;
  correctOption: number;
  timeLimit: number;
  points: number;
  order: number;
}

export interface QuizSession {
  id: string;
  quizId: string;
  pin: string;
  status: 'LOBBY' | 'ACTIVE' | 'PAUSED' | 'FINISHED';
  teamMode: boolean;
  currentQuestion: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  quiz: Quiz;
  participants?: Participant[];
  joinUrl?: string;
  qrCode?: string;
}

export interface Participant {
  id: string;
  sessionId: string;
  name: string;
  teamName?: string;
  socketId?: string;
  score: number;
  accuracy: number;
}

export interface GameResponse {
  id: string;
  sessionId: string;
  participantId: string;
  questionId: string;
  answer: number;
  isCorrect: boolean;
  responseTime: number;
  score: number;
}

export interface SessionSummary {
  id: string;
  pin: string;
  status: string;
  createdAt: string;
  _count?: { participants: number };
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  teamName?: string;
  score: number;
  rank?: number;
}

export interface QuestionStats {
  total: number;
  correct: number;
  incorrect: number;
  distribution: number[];
}

export interface SessionResults {
  session: QuizSession;
  participants: (Participant & {
    totalCorrect: number;
    totalQuestions: number;
  })[];
  totalQuestions: number;
  winner: Participant | null;
  topThree: Participant[];
}

export interface DashboardStats {
  totalQuizzes: number;
  totalSessions: number;
  totalParticipants: number;
}
