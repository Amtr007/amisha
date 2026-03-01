import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, X } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, duration);
      setAudioBlob(null);
      setDuration(0);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    setAudioBlob(null);
    setDuration(0);
    onCancel();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 rounded-2xl">
      <button
        onClick={handleCancel}
        className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <X size={20} />
      </button>

      <div className="flex-1 flex items-center gap-3">
        {isRecording ? (
          <>
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-600 font-medium">{formatDuration(duration)}</span>
            <div className="flex-1 h-1 bg-red-200 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 animate-pulse" style={{ width: '100%' }} />
            </div>
          </>
        ) : audioBlob ? (
          <>
            <span className="text-gray-600 font-medium">{formatDuration(duration)}</span>
            <span className="text-gray-500 text-sm">Voice message ready</span>
          </>
        ) : (
          <span className="text-gray-500">Tap the mic to start recording</span>
        )}
      </div>

      {!isRecording && !audioBlob && (
        <button
          onClick={startRecording}
          className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
        >
          <Mic size={24} />
        </button>
      )}

      {isRecording && (
        <button
          onClick={stopRecording}
          className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
        >
          <Square size={20} />
        </button>
      )}

      {audioBlob && (
        <button
          onClick={handleSend}
          className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white hover:bg-teal-700 transition-colors"
        >
          <Send size={20} />
        </button>
      )}
    </div>
  );
}
