/**
 * Hook pour les sons du timer (tic-tac et dông)
 */

import { useEffect, useRef } from 'react';

export const useTimerSounds = (timeRemaining: number, isActive: boolean) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasPlayedDongRef = useRef(false);

  useEffect(() => {
    // Initialiser AudioContext si nécessaire
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  useEffect(() => {
    if (!isActive || !audioContextRef.current) return;

    const audioContext = audioContextRef.current;

    // Tic-tac entre 5 et 1 secondes
    if (timeRemaining <= 5 && timeRemaining > 0) {
      playTickSound(audioContext);
    }

    // Dông à 0
    if (timeRemaining === 0 && !hasPlayedDongRef.current) {
      playDongSound(audioContext);
      hasPlayedDongRef.current = true;
    }

    // Reset du dông flag quand le timer redémarre
    if (timeRemaining > 5) {
      hasPlayedDongRef.current = false;
    }
  }, [timeRemaining, isActive]);

  const playTickSound = (audioContext: AudioContext) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Fréquence du tic
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const playDongSound = (audioContext: AudioContext) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 400; // Fréquence plus grave pour le dông
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };
};
