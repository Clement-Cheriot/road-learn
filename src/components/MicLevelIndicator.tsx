import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { isMicrophoneGranted } from '@/services/audio/MicrophonePermission';

/**
 * Indicateur visuel de niveau micro (en haut à droite)
 */
const MicLevelIndicator = () => {
  const audioMode = useSettingsStore((s) => s.audioMode);
  const show = useSettingsStore((s) => s.showMicIndicator);
  const [granted, setGranted] = useState<boolean>(false);
  const [level, setLevel] = useState<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioMode || !show) return;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Float32Array | null = null;

    const setup = async () => {
      try {
        // Attendre que la permission soit déjà accordée par useVoiceCommands
        // pour éviter les conflits de demande simultanée
        if (!isMicrophoneGranted()) {
          console.log('⏳ MicLevelIndicator: attente permission microphone...');
          // Réessayer après un court délai
          setTimeout(setup, 500);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        streamRef.current = stream;
        setGranted(true);

        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.fftSize; // time domain uses fftSize length
        dataArray = new Float32Array(bufferLength);
        source.connect(analyser);

        const loop = () => {
          if (!analyser || !dataArray) return;
          (analyser as any).getFloatTimeDomainData(dataArray);
          // Calcul niveau RMS
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i]; // -1..1
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          setLevel(rms);
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        console.warn('Microphone permission denied or unavailable', e);
        setGranted(false);
      }
    };

    setup();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioCtx) audioCtx.close();
    };
  }, [audioMode, show]);

  if (!audioMode || !show || !granted) return null;

  // Convert level (0..~0.5) to 0..1
  const intensity = Math.max(0, Math.min(1, level * 3));
  const bars = Array.from({ length: 4 }).map((_, i) => {
    const h = Math.max(10, 6 + intensity * (20 + i * 10));
    return (
      <div
        key={i}
        className="w-1.5 rounded-full bg-primary"
        style={{ height: `${h}px`, opacity: 0.6 + 0.4 * intensity }}
      />
    );
  });

  return (
    <div className="fixed right-3 top-3 z-50 select-none">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 shadow-sm backdrop-blur">
        <div className="flex h-6 items-end gap-1">{bars}</div>
        <span className="text-xs text-muted-foreground">Mic</span>
      </div>
    </div>
  );
};

export default MicLevelIndicator;
