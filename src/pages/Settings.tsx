/**
 * Page Paramètres
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { createStorageService } from '@/services/storage/StorageServiceFactory';
import { useUserStore } from '@/stores/useUserStore';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { reset: resetUser } = useUserStore();
  const [audioEnabled, setAudioEnabled] = useState(true);

  const handleClearData = async () => {
    if (
      !confirm(
        'Êtes-vous sûr de vouloir effacer toutes les données ? Cette action est irréversible.'
      )
    ) {
      return;
    }

    try {
      const storage = createStorageService();
      await storage.clear();
      resetUser();

      toast({
        title: 'Données effacées',
        description: 'Toutes les données ont été supprimées avec succès.',
      });

      navigate('/');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible d'effacer les données.",
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-3 md:p-8 pt-16">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="mb-3"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Paramètres</h1>
        </div>

        {/* Audio */}
        <Card className="mb-4 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Volume2 className="h-4 w-4 text-primary" />
            Audio
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Synthèse vocale</p>
              <p className="text-xs text-muted-foreground">
                Lire les questions
              </p>
            </div>
            <Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} />
          </div>
        </Card>

        {/* Données */}
        <Card className="mb-4 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Trash2 className="h-4 w-4 text-destructive" />
            Données
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Efface toutes les données stockées localement.
          </p>
          <Button variant="destructive" size="sm" onClick={handleClearData}>
            <Trash2 className="mr-2 h-3 w-3" />
            <span className="text-xs">Effacer les données</span>
          </Button>
        </Card>
        <Button onClick={() => navigate('/voice-settings')} className="w-full">
          🎤 Voix & Vitesse
        </Button>
        {/* Info technique */}
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Info className="h-4 w-4 text-primary" />
            Informations
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0 (POC)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plateforme</span>
              <span className="font-medium">Web</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stockage</span>
              <span className="font-medium">IndexedDB</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
