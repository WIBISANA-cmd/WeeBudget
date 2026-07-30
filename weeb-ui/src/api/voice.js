import { apiPost } from './http';

export const voiceApi = {
  parse: async (transcript) => apiPost('/transactions/voice-parse', { transcript }),
  transcribeAudio: async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    return apiPost('/transactions/voice-transcribe-audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
