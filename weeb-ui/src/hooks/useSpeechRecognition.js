import { useCallback, useEffect, useRef, useState } from 'react';

export function useSpeechRecognition({ lang = 'id-ID' } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSupported(true);
      const instance = new SpeechRecognition();
      instance.continuous = true;
      instance.interimResults = true;
      instance.lang = lang;

      instance.onstart = () => {
        setListening(true);
        setError(null);
      };

      instance.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      instance.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error !== 'no-speech') {
          setError(event.error);
        }
        setListening(false);
      };

      instance.onend = () => {
        setListening(false);
      };

      recognitionRef.current = instance;
    } else {
      setSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, [lang]);

  const start = useCallback(() => {
    if (recognitionRef.current && !listening) {
      try {
        setTranscript('');
        setError(null);
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (recognitionRef.current && listening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore stop error
      }
    }
  }, [listening]);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    supported,
    listening,
    transcript,
    setTranscript,
    error,
    start,
    stop,
    reset,
  };
}
