import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  type: 'heard' | 'action' | 'error';
  message: string;
}

let logs: LogEntry[] = [];
let listeners: Array<() => void> = [];

export const addVoiceLog = (type: LogEntry['type'], message: string) => {
  const entry = {
    timestamp: new Date().toLocaleTimeString(),
    type,
    message,
  };
  logs = [entry, ...logs].slice(0, 10); // Garder les 10 derniers
  listeners.forEach((fn) => fn());
};

const VoiceDebugPanel = () => {
  const audioMode = useSettingsStore((s) => s.audioMode);
  const [localLogs, setLocalLogs] = useState<LogEntry[]>(logs);
  const [isExpanded, setIsExpanded] = useState(true); // ⬅️ État collapsed/expanded

  useEffect(() => {
    const update = () => setLocalLogs([...logs]);
    listeners.push(update);
    return () => {
      listeners = listeners.filter((fn) => fn !== update);
    };
  }, []);

  if (!audioMode) return null;

  return (
    <div className="fixed right-3 bottom-3 z-50 w-80 select-none">
      <div className="rounded-xl border border-border bg-card/95 shadow-lg backdrop-blur">
        {/* Header cliquable */}
        <div
          className="border-b border-border px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="text-xs font-semibold text-foreground">
            🎤 Voice Debug
          </h3>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Contenu collapsable */}
        {isExpanded && (
          <div className="max-h-60 overflow-y-auto p-2 text-xs">
            {localLogs.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Aucune commande détectée
              </p>
            )}
            {localLogs.map((log, i) => (
              <div
                key={i}
                className={`mb-1 rounded px-2 py-1 ${
                  log.type === 'heard'
                    ? 'bg-primary/10 text-primary'
                    : log.type === 'action'
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive'
                }`}
              >
                <span className="opacity-60">{log.timestamp}</span>
                <span className="ml-2">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceDebugPanel;
