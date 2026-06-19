'use client';

import { motion } from 'framer-motion';

interface WordCloudWord {
  text: string;
  count: number;
}

interface WordCloudProps {
  words: WordCloudWord[];
  total: number;
}

const COLORS = [
  'text-purple-400',
  'text-blue-400',
  'text-pink-400',
  'text-emerald-400',
  'text-yellow-400',
  'text-cyan-400',
  'text-orange-400',
  'text-indigo-400',
  'text-rose-400',
  'text-teal-400',
];

export function WordCloud({ words, total }: WordCloudProps) {
  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/30 text-lg">
        Waiting for responses...
      </div>
    );
  }

  const maxCount = Math.max(...words.map((w) => w.count));

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-6 min-h-[16rem]">
      {words.map((word, i) => {
        const ratio = maxCount > 0 ? word.count / maxCount : 0;
        const fontSize = 0.9 + ratio * 2.6;
        const colorClass = COLORS[i % COLORS.length];

        return (
          <motion.div
            key={word.text}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.6 + ratio * 0.4 }}
            transition={{ duration: 0.4, delay: i * 0.05, type: 'spring', stiffness: 200 }}
            className={`${colorClass} font-bold cursor-default select-none`}
            style={{ fontSize: `${fontSize}rem` }}
            title={`${word.text}: ${word.count} response${word.count !== 1 ? 's' : ''}`}
          >
            {word.text}
          </motion.div>
        );
      })}
    </div>
  );
}
