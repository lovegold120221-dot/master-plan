import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Agent, Message } from "../types";

export class NexusLiveClient {
  private ai: GoogleGenAI;
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: Int16Array[] = [];
  private isPlaying = false;
  private nextStartTime = 0;
  private recorderContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  private retryCount = 0;
  private maxRetries = 5;

  async connect(agent: Agent, callbacks: {
    onTranscription?: (text: string, isUser: boolean) => void;
    onAudioStart?: () => void;
    onAudioEnd?: () => void;
    onToolCall?: (name: string, args: any) => void;
    onError?: (err: any) => void;
  }, history?: Message[]): Promise<any> {
    try {
      if (this.session) {
        await this.session.close();
      }

      let systemInstruction = agent.voicePrompt;

      // Add conversation history for context
      if (history && history.length > 0) {
        systemInstruction += "\n\n--- CONVERSATION CONTEXT (from Local DB) ---\n";
        systemInstruction += "You must reconsider your ideas based on the current dynamic conversation history below:\n";
        history.forEach(msg => {
          const sender = msg.type === 'user' ? 'Master E (User)' : (msg.agentName || 'System');
          systemInstruction += `[${sender}]: ${msg.content}\n`;
        });
        systemInstruction += "--- END OF CONTEXT ---\n";
      }

      if (agent.knowledgeBase) {
        systemInstruction += "\n\nYour specific Knowledge Base:";
        if (agent.knowledgeBase.url) {
          systemInstruction += `\n- Reference URL: ${agent.knowledgeBase.url}`;
        }
        if (agent.knowledgeBase.files && agent.knowledgeBase.files.length > 0) {
          systemInstruction += "\n- Attached Files:";
          agent.knowledgeBase.files.forEach(f => {
            systemInstruction += `\n  - ${f.name} (${f.type}): ${f.content.substring(0, 1000)}${f.content.length > 1000 ? '...' : ''}`;
          });
        }
      }

      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: this.getVoiceForAgent(agent) } },
          },
          systemInstruction,
          tools: agent.tools ? [{ functionDeclarations: agent.tools }] : undefined,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log(`Connected to ${agent.name}`);
            this.retryCount = 0; // Reset retry count on successful connection
          },
          onmessage: async (message: LiveServerMessage) => {
            const serverContent = message.serverContent as any;
            if (!serverContent) return;
            
            // Handle tool calls, audio, and transcription from model
            if (serverContent.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
                if (part.functionCall) {
                  callbacks.onToolCall?.(part.functionCall.name, part.functionCall.args);
                }
                if (part.inlineData?.data) {
                  this.handleIncomingAudio(part.inlineData.data);
                }
                if (part.text) {
                  callbacks.onTranscription?.(part.text, false);
                }
              }
            }

            // Handle transcription from user
            if (serverContent.userTurn?.parts) {
              for (const part of serverContent.userTurn.parts) {
                if (part.text) {
                  callbacks.onTranscription?.(part.text, true);
                }
              }
            }
            
            if (serverContent.turnComplete) {
              callbacks.onAudioEnd?.();
            }

            if (serverContent.interrupted) {
              this.stopAudio();
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            callbacks.onError?.(err);
          }
        }
      });

      return this.session;
    } catch (err: any) {
      const isQuotaError = 
        err.message?.toLowerCase().includes('quota') || 
        err.message?.toLowerCase().includes('rate limit') ||
        err.message?.toLowerCase().includes('429') ||
        err.message?.toLowerCase().includes('exceeded your current quota');

      if (isQuotaError && this.retryCount < this.maxRetries) {
        this.retryCount++;
        // Use a more aggressive backoff for quota errors
        const delay = Math.pow(2, this.retryCount) * 3000; 
        console.warn(`Quota exceeded, retrying in ${delay}ms... (Attempt ${this.retryCount}/${this.maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        return this.connect(agent, callbacks, history);
      }
      
      this.retryCount = 0; // Reset for future calls
      callbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * Determines the voice to use for a specific agent.
   * Prioritizes the agent's 'voice' property, then falls back to a hardcoded mapping,
   * and finally defaults to 'Zephyr'.
   */
  private getVoiceForAgent(agent: Agent): string {
    // 1. Primary: Use the voice explicitly assigned to the agent
    if (agent.voice) {
      return agent.voice;
    }

    // 2. Secondary: Fallback mapping for legacy or core agents
    const voiceMapping: Record<string, string> = {
      zeus: 'Zephyr',
      aquiles: 'Fenrir',
      maximus: 'Charon',
      orbit: 'Kore',
      echo: 'Puck',
      master: 'Zephyr',
      atlas: 'Fenrir',
      forge: 'Puck',
      nova: 'Kore',
      nexus: 'Charon',
      stratix: 'Zephyr',
      botmaster: 'Fenrir',
      openmind: 'Charon',
      bizflow: 'Kore',
      edgecore: 'Puck',
      codeking: 'Zephyr',
      terminal: 'Fenrir',
      talent: 'Kore'
    };

    // 3. Tertiary: Default to 'Zephyr' if no other voice is found
    return voiceMapping[agent.id.toLowerCase()] || 'Zephyr';
  }

  private async handleIncomingAudio(base64: string) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const binary = atob(base64);
    const buffer = new Int16Array(binary.length / 2);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = (binary.charCodeAt(i * 2) & 0xFF) | (binary.charCodeAt(i * 2 + 1) << 8);
    }
    
    this.audioQueue.push(buffer);
    if (!this.isPlaying) {
      this.playNextChunk();
    }
  }

  private async playNextChunk() {
    if (this.audioQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const chunk = this.audioQueue.shift()!;
    const audioBuffer = this.audioContext.createBuffer(1, chunk.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < chunk.length; i++) {
      channelData[i] = chunk[i] / 32768.0;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const startTime = Math.max(this.audioContext.currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;

    source.onended = () => {
      this.playNextChunk();
    };
  }

  private stopAudio() {
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextStartTime = 0;
    // In a real app, you'd want to stop the current source node too
  }

  async sendAudio(base64: string) {
    if (this.session) {
      await this.session.sendRealtimeInput({
        audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
      });
    }
  }

  async sendText(text: string) {
    if (this.session) {
      await this.session.sendRealtimeInput({
        text: text
      });
    }
  }

  async close() {
    this.stopRecording();
    if (this.session) {
      await this.session.close();
      this.session = null;
    }
  }

  async startRecording(onAudioData: (base64: string) => void) {
    try {
      if (!this.recorderContext) {
        this.recorderContext = new AudioContext({ sampleRate: 16000 });
      }
      
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.recorderContext.createMediaStreamSource(this.stream);
      this.processor = this.recorderContext.createScriptProcessor(4096, 1, 1);

      source.connect(this.processor);
      this.processor.connect(this.recorderContext.destination);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        onAudioData(base64);
      };
    } catch (err) {
      console.error("Error starting recording:", err);
      throw err;
    }
  }

  stopRecording() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}
