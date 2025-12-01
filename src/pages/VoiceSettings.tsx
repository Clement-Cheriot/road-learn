import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { audioManager } from '@/services/AudioManager';
import { applyPhoneticPronunciation } from '@/config/audio.config';
import { ChevronLeft, Zap, Volume2 } from 'lucide-react';

export default function VoiceSettings() {
  const navigate = useNavigate();
  
  const [rate, setRate] = useState(1.0);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [lastPhonetic, setLastPhonetic] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  
  // Préréglages vitesse
  const emotionPresets = [
    { name: 'Lent', rate: 0.7, icon: '🐢' },
    { name: 'Normal', rate: 1.0, icon: '😐' },
    { name: 'Rapide', rate: 1.3, icon: '🐇' },
  ];
  
  // Tests groupés par catégorie
  const testGroups = [
    {
      title: "🔧 Corrections récentes",
      description: "Phonétique à valider",
      tests: [
        { id: 'c1', name: 'Quiz', text: "Commencez le Quiz Mixte !" },
        { id: 'c2', name: 'Elon Musk', text: "Elon Musk a fondé SpaceX et Tesla." },
        { id: 'c3', name: 'Jeff Bezos', text: "Jeff Bezos a créé Amazon." },
        { id: 'c4', name: 'Taylor Swift', text: "Taylor Swift est une chanteuse américaine." },
        { id: 'c5', name: 'Bong Joon-ho', text: "Bong Joon-ho a réalisé Parasite." },
        { id: 'c6', name: 'Iron Man', text: "Iron Man est un film Marvel." },
        { id: 'c7', name: 'Hollywood', text: "Once Upon a Time in Hollywood." },
        { id: 'c8', name: 'Football', text: "Le football est un sport populaire." },
        { id: 'c9', name: 'Pizza', text: "La pizza est italienne." },
        { id: 'c10', name: 'Vancouver', text: "Vancouver et Melbourne sont des villes." },
        { id: 'c11', name: 'Française', text: "La révolution française a démarré en 1789." },
        { id: 'c12', name: 'Pas cette fois', text: ". Pas cette fois ! C'était la réponse B." },
        { id: 'c13', name: 'Australie', text: "La capitale de l'Australie est Canberra." },
        { id: 'c14', name: 'J.C.', text: "Jules César est né en 100 av. J.-C." },
        { id: 'c15', name: 'Louis XIV', text: "Louis XIV était le Roi Soleil." },
        { id: 'c16', name: 'Un oiseau', text: "Un oiseau vole dans le ciel." },
      ]
    },
    {
      title: "📝 Ponctuation (référence)",
      tests: [
        { id: 'p1', name: 'Point', text: "La capitale est Paris." },
        { id: 'p2', name: 'Question ?', text: "La capitale est Paris ?" },
        { id: 'p3', name: 'Exclamation !', text: "La capitale est Paris !" },
      ]
    },
    {
      title: "🔤 Structure de phrase",
      description: "Question par structure vs ponctuation",
      tests: [
        { id: 's1', name: 'Affirmatif', text: "C'est Paris." },
        { id: 's2', name: 'Interrogatif (struct)', text: "Est-ce Paris ?" },
        { id: 's3', name: 'Interrogatif (quel)', text: "Quelle est la capitale ?" },
        { id: 's4', name: 'Affirmatif + ?', text: "C'est Paris ?" },
      ]
    },
    {
      title: "🎭 Mots émotionnels",
      description: "Le sens des mots affecte-t-il l'intonation ?",
      tests: [
        { id: 'e1', name: 'Neutre', text: "C'est correct." },
        { id: 'e2', name: 'Positif', text: "Excellent ! Bravo !" },
        { id: 'e3', name: 'Très positif', text: "Fantastique ! Incroyable ! Magnifique !" },
        { id: 'e4', name: 'Négatif', text: "Dommage. Mauvaise réponse." },
        { id: 'e5', name: 'Très négatif', text: "Terrible ! Catastrophique ! Désastreux !" },
        { id: 'e6', name: 'Surprise', text: "Vraiment ? Incroyable ! C'est vrai ?" },
      ]
    },
    {
      title: "⏸️ Pauses et rythme",
      description: "Virgules, points de suspension",
      tests: [
        { id: 'r1', name: 'Sans pause', text: "Paris est la capitale de la France." },
        { id: 'r2', name: 'Virgules', text: "Paris, la capitale, est en France." },
        { id: 'r3', name: 'Ellipse', text: "La réponse est... Paris." },
        { id: 'r4', name: 'Multi ellipse', text: "Et... la... réponse... est... Paris." },
        { id: 'r5', name: 'Points multiples', text: "Paris. Lyon. Marseille." },
      ]
    },
    {
      title: "📢 Emphase par mots",
      description: "Mots d'intensité",
      tests: [
        { id: 'i1', name: 'Normal', text: "C'est Paris." },
        { id: 'i2', name: 'Très', text: "C'est très bien Paris." },
        { id: 'i3', name: 'Vraiment', text: "C'est vraiment Paris." },
        { id: 'i4', name: 'Absolument', text: "C'est absolument Paris." },
        { id: 'i5', name: 'CAPS (test)', text: "C'est PARIS." },
      ]
    },
    {
      title: "🎬 Contexte narratif",
      description: "Phrases avec contexte émotionnel",
      tests: [
        { id: 'n1', name: 'Annonce neutre', text: "La réponse est Paris." },
        { id: 'n2', name: 'Annonce positive', text: "Bravo ! La bonne réponse est Paris !" },
        { id: 'n3', name: 'Annonce négative', text: "Dommage, la réponse était Paris." },
        { id: 'n4', name: 'Suspense', text: "Attention... la réponse est... Paris !" },
        { id: 'n5', name: 'Question rhétorique', text: "Vous ne saviez pas que c'était Paris ?" },
      ]
    },
    {
      title: "🔢 Chiffres et listes",
      description: "Énumération",
      tests: [
        { id: 'l1', name: 'Liste simple', text: "A, B, C, D." },
        { id: 'l2', name: 'Liste options', text: "Réponse A. Réponse B. Réponse C." },
        { id: 'l3', name: 'Numérotée', text: "Premièrement, Paris. Deuxièmement, Lyon." },
      ]
    },
  ];
  
  const handleTest = async (id: string, text: string) => {
    setIsTesting(id);
    try {
      const phoneticText = applyPhoneticPronunciation(text);
      setLastPhonetic(phoneticText);
      console.log(`[TEST] "${text}" → "${phoneticText}"`);
      await audioManager.speak(phoneticText, { rate });
    } catch (error) {
      console.error('Erreur test voix:', error);
    } finally {
      setIsTesting(null);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-quiz-dark to-black p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold text-white">Lab Prosodie</h1>
      </div>
      
      {/* Vitesse compacte */}
      <Card className="bg-quiz-card border-quiz-border p-3 mb-4">
        <div className="flex items-center gap-4">
          <Zap className="h-4 w-4 text-gray-400" />
          <Slider
            value={[rate]}
            onValueChange={(v) => setRate(v[0])}
            min={0.5}
            max={1.5}
            step={0.1}
            className="flex-1"
          />
          <span className="text-sm font-mono text-white w-12">{rate.toFixed(1)}x</span>
          {emotionPresets.map((p) => (
            <Button
              key={p.name}
              variant={Math.abs(rate - p.rate) < 0.05 ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setRate(p.rate)}
              className="px-2"
            >
              {p.icon}
            </Button>
          ))}
        </div>
      </Card>
      
      {/* Test personnalisé */}
      <Card className="bg-quiz-card border-quiz-border p-3 mb-4">
        <div className="flex gap-2">
          <Input
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Tapez un texte à tester..."
            className="flex-1 bg-black/50 border-gray-600 text-white"
          />
          <Button
            onClick={() => customText && handleTest('custom', customText)}
            disabled={!customText || isTesting === 'custom'}
            size="sm"
          >
            {isTesting === 'custom' ? '...' : '▶'}
          </Button>
        </div>
      </Card>
      
      {/* Affichage texte phonétique */}
      {lastPhonetic && (
        <Card className="bg-blue-900/30 border-blue-500/50 p-3 mb-4">
          <p className="text-xs text-blue-300 mb-1">Texte envoyé au TTS :</p>
          <p className="text-sm text-white font-mono">{lastPhonetic}</p>
        </Card>
      )}
      
      {/* Tests groupés */}
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {testGroups.map((group) => (
          <Card key={group.title} className="bg-quiz-card border-quiz-border p-3">
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-white">{group.title}</h3>
              {group.description && (
                <p className="text-[10px] text-gray-500">{group.description}</p>
              )}
            </div>
            <div className="space-y-1">
              {group.tests.map((test) => (
                <div key={test.id} className="flex items-center gap-2 p-1.5 bg-black/20 rounded">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-300">{test.name}: </span>
                    <span className="text-[10px] text-gray-500">{test.text}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTest(test.id, test.text)}
                    disabled={isTesting !== null}
                    className="h-6 w-6 p-0"
                  >
                    {isTesting === test.id ? '...' : <Volume2 className="h-3 w-3" />}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      
      {/* Bouton fermer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
        <Button onClick={() => navigate('/settings')} className="w-full">
          Fermer
        </Button>
      </div>
    </div>
  );
}
