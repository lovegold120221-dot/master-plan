import { DeepgramClient } from "@deepgram/sdk";

export class DeepgramTranscriber {
  private client: DeepgramClient;
  private connection: any = null;
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;

  constructor() {
    // Use environment variable if available, otherwise fallback to the provided key
    const apiKey = process.env.DEEPGRAM_API_KEY || "5898d6019f8acf021bc97b97af12e13e8e13f756";
    this.client = new DeepgramClient({ apiKey });
  }

  async start(callbacks: {
    onTranscript: (text: string, speaker?: string) => void;
    onError: (err: any) => void;
  }) {
    try {
      const apiKey = process.env.DEEPGRAM_API_KEY || "5898d6019f8acf021bc97b97af12e13e8e13f756";
      this.connection = await this.client.listen.v1.connect({
        model: "nova-3",
        language: "multi",
        diarize: "true",
        interim_results: "true",
        smart_format: "true",
        Authorization: apiKey,
      });

      this.connection.on("open", () => {
        console.log("Deepgram connection opened");
      });

      this.connection.on("message", (data: any) => {
        if (data.type === "Results") {
          const transcript = data.channel.alternatives[0].transcript;
          if (transcript) {
            const words = data.channel.alternatives[0].words;
            const speakers = new Set(words.map((w: any) => w.speaker));
            const speaker = speakers.size > 1 ? `${words[0].speaker}+` : (words[0]?.speaker?.toString() || "0");
            callbacks.onTranscript(transcript, speaker);
          }
        }
      });

      this.connection.on("error", (err: any) => {
        console.error("Deepgram error:", err);
        callbacks.onError(err);
      });

      this.connection.on("close", () => {
        console.log("Deepgram connection closed");
      });

      // Wait for the connection to be open before starting the media recorder
      await this.connection.waitForOpen();

      // Capture audio
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm",
      });

      this.mediaRecorder.ondataavailable = (event) => {
        // Check if connection is open before sending
        if (event.data.size > 0 && this.connection && this.connection.readyState === 1) {
          this.connection.sendMedia(event.data);
        }
      };

      this.mediaRecorder.start(250); // Send chunks every 250ms
    } catch (err) {
      console.error("Error starting Deepgram transcriber:", err);
      callbacks.onError(err);
    }
  }

  stop() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }
}
