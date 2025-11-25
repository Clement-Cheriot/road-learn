/**
 * Service STT avec Sherpa-ONNX
 * Reconnaissance vocale française
 */

import { ISpeechService, SpeechRecognitionResult, SpeechRecognitionError } from './SpeechService.interface';

export class SherpaSTTService implements ISpeechService {
  private isListening = false;
  private resultCallback?: (result: SpeechRecognitionResult) => void;
  private errorCallback?: (error: SpeechRecognitionError) => void;
  private recognizer: any = null;
  private stream: any = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  async startListening(options?: { language?: string }): Promise<void> {
    try {
      console.log('🎧 Démarrage Sherpa STT...');
      
      // Importer la version WASM de Sherpa-ONNX
      // @ts-ignore
      const sherpa = await import('sherpa-onnx/wasm');
      
      // Créer le recognizer
      if (!this.recognizer) {
        this.recognizer = await sherpa.createOnlineRecognizer({
          modelConfig: {
            transducer: {
              encoder: '/models/sherpa-onnx-streaming-zipformer-fr-2023-04-14/encoder-epoch-29-avg-9-with-averaged-model.onnx',
              decoder: '/models/sherpa-onnx-streaming-zipformer-fr-2023-04-14/decoder-epoch-29-avg-9-with-averaged-model.onnx',
              joiner: '/models/sherpa-onnx-streaming-zipformer-fr-2023-04-14/joiner-epoch-29-avg-9-with-averaged-model.onnx',
            },
            tokens: '/models/sherpa-onnx-streaming-zipformer-fr-2023-04-14/tokens.txt',
            numThreads: 1,
            provider: 'cpu',
            debug: false,
          },
        });
        
        console.log('✅ Recognizer créé');
      }
      
      // Créer le stream
      this.stream = this.recognizer.createStream();
      
      // Obtenir l'accès au micro
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 16000, // Sherpa utilise 16kHz
        } 
      });
      
      // Créer le contexte audio
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(mediaStream);
      
      // Créer le processeur audio
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        if (!this.isListening || !this.stream) return;
        
        // Récupérer les échantillons audio
        const samples = e.inputBuffer.getChannelData(0);
        
        // Envoyer à Sherpa
        this.stream.acceptWaveform(16000, samples);
        
        // Récupérer les résultats partiels
        while (this.recognizer.isReady(this.stream)) {
          this.recognizer.decode(this.stream);
        }
        
        const result = this.recognizer.getResult(this.stream);
        
        if (result && result.text && this.resultCallback) {
          this.resultCallback({
            transcript: result.text,
            isFinal: false,
          });
        }
      };
      
      // Connecter
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.isListening = true;
      console.log('✅ Sherpa STT démarré');
      
    } catch (error: any) {
      console.error('❌ Erreur Sherpa STT:', error);
      if (this.errorCallback) {
        this.errorCallback({ message: error.message || 'Unknown error' });
      }
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    try {
      if (!this.isListening) return;
      
      // Déconnecter
      if (this.processor) {
        this.processor.disconnect();
      }
      
      if (this.source) {
        this.source.disconnect();
      }
      
      if (this.audioContext) {
        await this.audioContext.close();
      }
      
      this.isListening = false;
      console.log('🛑 Sherpa STT arrêté');
      
    } catch (error: any) {
      console.error('❌ Erreur stop Sherpa STT:', error);
    }
  }

  onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.resultCallback = callback;
  }

  onError(callback: (error: SpeechRecognitionError) => void): void {
    this.errorCallback = callback;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
