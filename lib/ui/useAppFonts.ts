import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Rubik_500Medium, Rubik_700Bold } from '@expo-google-fonts/rubik';
import { Geist_400Regular, Geist_600SemiBold } from '@expo-google-fonts/geist';

const FALLBACK_MS = 4000;

// True once fonts are loaded, or 4 s after start so a failed load never leaves a blank screen.
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Harmera: require('../../assets/fonts/harmera.ttf'),
    Rubik_500Medium,
    Rubik_700Bold,
    Geist_400Regular,
    Geist_600SemiBold,
  });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), FALLBACK_MS);
    return () => clearTimeout(t);
  }, []);

  return loaded || !!error || timedOut;
}
