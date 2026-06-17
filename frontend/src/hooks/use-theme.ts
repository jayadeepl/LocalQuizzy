'use client';

import { createContext, useContext } from 'react';

export const ThemeContext = createContext<{
  dark: boolean;
  setDark: (v: boolean) => void;
}>({ dark: false, setDark: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}
