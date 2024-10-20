import {
  HumeClient,
  convertBlobToBase64,
  ensureSingleValidAudioTrack,
  getAudioStream,
  MimeType,
} from 'hume';

// Create a Hume Client
let client: HumeClient | null = null;
let socket: Hume.empathicVoice.chat.ChatSocket | null = null;
let recorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;

// Connect to Hume WebSocket and pass the message handling callback
export async function connectToHume(
  setSocket: (socket: Hume.empathicVoice.chat.ChatSocket) => void,
  handleMessage: (role: string, content: string) => void  // <-- Add message handler
) {
  if (!client) {
    client = new HumeClient({
      apiKey: import.meta.env.VITE_HUME_API_KEY || '',
      secretKey: import.meta.env.VITE_HUME_SECRET_KEY || '',
    });
  }

  socket = await client.empathicVoice.chat.connect({
    configId: import.meta.env.VITE_HUME_CONFIG_ID || '',
  });

  // WebSocket events
  socket.on('open', () => console.log('WebSocket connection opened with Hume.'));
  socket.on('message', (message) => {
    if (message.type === 'user_message' || message.type === 'assistant_message') {
      const { role, content } = message.message;
      handleMessage(role, content);  // <-- Call the callback with the message
    }
  });
  socket.on('error', (error) => console.error('WebSocket error:', error));
  socket.on('close', () => console.log('WebSocket connection closed.'));

  setSocket(socket);
}

// Capture audio and send to Hume
export async function captureAudio(socket: Hume.empathicVoice.chat.ChatSocket) {
  audioStream = await getAudioStream();
  ensureSingleValidAudioTrack(audioStream);

  recorder = new MediaRecorder(audioStream, { mimeType: MimeType.WEBM });
  recorder.ondataavailable = async ({ data }) => {
    if (data.size > 0) {
      const encodedAudioData = await convertBlobToBase64(data);
      socket.sendAudioInput({ data: encodedAudioData });
    }
  };

  recorder.start(100);  // Capture audio every 100ms
}

// Stop recording
export function stopRecording() {
  recorder?.stop();
  audioStream?.getTracks().forEach(track => track.stop());
}

// Disconnect WebSocket
export function disconnectFromHume() {
  socket?.close();
}