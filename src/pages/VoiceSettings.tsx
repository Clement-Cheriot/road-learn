import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { audioManager } from '@/services/AudioManager';
import { ChevronLeft, Volume2, Zap } from 'lucide-react';

export default function VoiceSettings() {
  const navigate = useNavigate();
  
  const [rate, setRate] = useState(1.0);
  const [isTesting, setIsTesting] = useState(false);
  
  // Préréglages émotions
  const emotionPresets = [
    { name: 'Normal', rate: 1.0, icon: '😐' },
    { name: 'Enthousiaste', rate: 1.3, icon: '😄' },
    { name: 'Calme', rate: 0.8, icon: '😌' },
    { name: 'Urgent', rate: 1.5, icon: '⚡' },
    { name: 'Dramatique', rate: 0.7, icon: '🎭' },
  ];
  
  const testText = "Bonjour ! Ceci est un test de voix. Quelle est la capitale de la France ? Réponse A : Paris. Réponse B : Lyon. Réponse C : Marseille. À vous !";
  
  const handleTest = async () => {
    setIsTesting(true);
    try {
      await audioManager.speak(testText, { rate });
    } catch (error) {
      console.error('Erreur test voix:', error);
    } finally {
      setIsTesting(false);
    }
  };
  
  const handleSave = () => {
    // TODO: Sauvegarder rate dans les settings
    navigate('/settings');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-quiz-dark to-black p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold text-white">Voix & Vitesse</h1>
      </div>
      
      {/* Vitesse et émotions */}
      <Card className="bg-quiz-card border-quiz-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Voix Piper (Français)</h2>
            <p className="text-sm text-gray-400">
              TTS offline haute qualité
            </p>
          </div>
          <Button
            onClick={handleTest}
            disabled={isTesting}
            className="gap-2"
          >
            <Volume2 className="h-4 w-4" />
            {isTesting ? 'Test en cours...' : 'Tester'}
          </Button>
        </div>
        
        {/* Vitesse */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <label className="text-sm text-gray-300">
              <Zap className="h-4 w-4 inline mr-1" />
              Vitesse de lecture
            </label>
            <span className="text-sm font-mono text-white">{rate.toFixed(1)}x</span>
          </div>
          <Slider
            value={[rate]}
            onValueChange={(v) => setRate(v[0])}
            min={0.5}
            max={2.0}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Lent (0.5x)</span>
            <span>Normal (1.0x)</span>
            <span>Rapide (2.0x)</span>
          </div>
        </div>
        
        {/* Préréglages émotions */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Préréglages</h3>
          <div className="grid grid-cols-3 gap-2">
            {emotionPresets.map((preset) => (
              <Button
                key={preset.name}
                variant={rate === preset.rate ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRate(preset.rate)}
                className="flex flex-col items-center gap-1 h-auto py-3"
              >
                <span className="text-2xl">{preset.icon}</span>
                <span className="text-xs">{preset.name}</span>
                <span className="text-xs text-gray-400">{preset.rate}x</span>
              </Button>
            ))}
          </div>
        </div>
      </Card>
      
      {/* Actions */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/settings')}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          className="flex-1"
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
