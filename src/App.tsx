import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LevelSelect from "./pages/LevelSelect";
import Quiz from "./pages/Quiz";
import Results from "./pages/Results";
import Scores from "./pages/Scores";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import GlobalVoiceController from "./features/voice/GlobalVoiceController";
import MicLevelIndicator from "./components/MicLevelIndicator";
import VoiceDebugPanel from "./components/VoiceDebugPanel";
import { useSettingsStore } from "./stores/useSettingsStore";

const queryClient = new QueryClient();

const AppInner = () => {
  const audioMode = useSettingsStore((s) => s.audioMode);
  const showMic = useSettingsStore((s) => s.showMicIndicator);
  return (
    <BrowserRouter>
      <GlobalVoiceController />
      {audioMode && showMic && <MicLevelIndicator />}
      {audioMode && <VoiceDebugPanel />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/level/:category" element={<LevelSelect />} />
        <Route path="/quiz/:category/:level" element={<Quiz />} />
        <Route path="/results" element={<Results />} />
        <Route path="/scores" element={<Scores />} />
        <Route path="/settings" element={<Settings />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppInner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
