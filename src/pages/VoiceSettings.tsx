import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { voiceManager } from '@/services/audio/VoiceManager';
import { createAudioService } from '@/services/audio/AudioServiceFactory';
import { ChevronLeft, Volume2, Zap } from 'lucide-react';

export default function VoiceSettings() {
  const navigate = useNavigate();
  const audioService = createAudioService();
  
  const [voices, setVoices] = useState<any[]>([]);
  const [frenchVoices, setFrenchVoices] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [rate, setRate] = useState(1.2);
  const [pitch, setPitch] = useState(1.0);
  const [isTesting, setIsTesting] = useState(false);
  
  const testText = "Bonjour ! Ceci est un test de voix. Quelle est la capitale de la France ? Réponse A : Paris. Réponse B : Lyon. Réponse C : Marseille. À vous !";
  
  useEffect(() => {
    const loadVoices = async () => {
      await voiceManager.initialize();
      
      // Récupérer toutes les voix
      const allVoices = voiceManager.getAllVoices();
      setVoices(allVoices);
      
      // Filtrer UNIQUEMENT les voix françaises (pas de filtre compact)
      const french = voiceManager.getFrenchVoices();
      
      console.log('🇫🇷 Voix françaises trouvées:', french.length);
      french.forEach((v: any) => {
        const type = v.voiceURI?.includes('.compact.') ? '📦 Compact' : 
                     v.voiceURI?.includes('.premium.') ? '⭐ Premium' : 
                     v.voiceURI?.includes('.enhanced.') ? '✨ Enhanced' : '❓ Autre';
        console.log(`  ${type} - ${v.name} (${v.lang})`);
      });
      
      setFrenchVoices(french);
      
      // Index de la voix actuellement sélectionnée
      setSelectedIndex(voiceManager.getSelectedVoiceIndex());
    };
    
    loadVoices();
  }, []);
  
  const handleTest = async () => {
    setIsTesting(true);
    try {
      console.log('🧪 TEST: Changing voice to index', selectedIndex);
      console.log('🧪 TEST: Voice name:', voices[selectedIndex]?.name);
      
      // Changer la voix
      voiceManager.setVoiceByIndex(selectedIndex);
      
      // Vérifier
      const newIndex = voiceManager.getSelectedVoiceIndex();
      const newVoice = voiceManager.getSelectedVoiceInfo();
      console.log('🧪 TEST: Voice index after change:', newIndex);
      console.log('🧪 TEST: Voice info after change:', newVoice);
      
      // ⬅️ NOUVEAU : Reset complet du TTS
      console.log('🔄 Resetting TTS to apply new voice...');
      if (audioService.resetTTS) {
        await audioService.resetTTS();
      }
      
      // Tester
      await audioService.speak(testText, { rate, pitch });
    } catch (error) {
      console.error('Erreur test voix:', error);
    } finally {
      setIsTesting(false);
    }
  };
  
  const handleSave = () => {
    // Sauvegarder la sélection
    voiceManager.setVoiceByIndex(selectedIndex);
    console.log('💾 Saved voice index:', selectedIndex);
    console.log('💾 Saved voice:', voiceManager.getSelectedVoiceInfo());
    
    // TODO: Sauvegarder rate et pitch dans les settings
    
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
      
      {/* Voix sélectionnée */}
      <Card className="bg-quiz-card border-quiz-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Voix actuelle</h2>
            <p className="text-sm text-gray-400">
              {voices[selectedIndex]?.name || 'Chargement...'} ({voices[selectedIndex]?.lang})
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
        
        {/* Tonalité */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm text-gray-300">Tonalité</label>
            <span className="text-sm font-mono text-white">{pitch.toFixed(1)}</span>
          </div>
          <Slider
            value={[pitch]}
            onValueChange={(v) => setPitch(v[0])}
            min={0.5}
            max={1.5}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Grave (0.5)</span>
            <span>Normal (1.0)</span>
            <span>Aigu (1.5)</span>
          </div>
        </div>
      </Card>
      
      {/* Liste des voix françaises */}
      <Card className="bg-quiz-card border-quiz-border p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Voix françaises disponibles ({frenchVoices.length})
        </h3>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {frenchVoices.map((voice, index) => {
            const globalIndex = voices.indexOf(voice);
            const isSelected = globalIndex === selectedIndex;
            const isPremium = ['Thomas', 'Amélie', 'Daniel', 'Marie'].includes(voice.name);
            
            return (
              <button
                key={globalIndex}
                onClick={() => {
                  console.log('🖱️ Clicked voice:', voice.name, 'global index:', globalIndex);
                  setSelectedIndex(globalIndex);
                  voiceManager.setVoiceByIndex(globalIndex); // ⬅️ AJOUTER ICI
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-quiz-correct text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{voice.name}</span>
                    {isPremium && (
                      <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">
                        Premium
                      </span>
                    )}
                    <p className="text-xs opacity-75">{voice.lang}</p>
                  </div>
                  {isSelected && (
                    <span className="text-sm">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
      
      {/* Boutons d'action */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => {
            console.log('🔍 DIAGNOSTIC:');
            console.log('  selectedIndex (state):', selectedIndex);
            console.log('  voices[selectedIndex]:', voices[selectedIndex]);
            console.log('  voiceManager.getSelectedVoiceIndex():', voiceManager.getSelectedVoiceIndex());
            console.log('  voiceManager.getSelectedVoiceInfo():', voiceManager.getSelectedVoiceInfo());
          }}
          className="flex-1"
        >
          🔍 Diagnostic
        </Button>
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
      
      {/* Note */}
      <p className="text-xs text-gray-500 text-center mt-6">
        💡 Les voix Premium (Thomas, Amélie) offrent la meilleure qualité.
        <br />
        Vitesse recommandée : 1.2x à 1.4x pour le mode voiture.
        <br />
        <br />
        📥 Pour plus de voix : Réglages iOS → Accessibilité → Contenu énoncé → Voix
      </p>
    </div>
  );
}
