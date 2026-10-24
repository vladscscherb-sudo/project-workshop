import { useState, useEffect, useRef } from 'react';

const useAudioRMS = (stream: MediaStream | null) => {
    const [rms, setRms] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const reqRef = useRef<number>(0);

    useEffect(() => {
        if (!stream || stream.getAudioTracks().length === 0) {
            return;
        }

        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        analyserRef.current = audioCtx.createAnalyser();

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        analyserRef.current.fftSize = 256;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);

        const updateRMS = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getFloatTimeDomainData(dataArray);

            let sumSquares = 0.0;
            for (let i = 0; i < bufferLength; i++) {
                sumSquares += dataArray[i] * dataArray[i];
            }

            setRms(Math.sqrt(sumSquares / bufferLength));
            reqRef.current = requestAnimationFrame(updateRMS);
        };

        updateRMS();

        return () => {
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
            audioCtx.close();
        };
    }, [stream]);

    if (!stream || stream.getAudioTracks().length === 0) {
        return 0;
    }

    return rms;
};

export const MicPanel = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const rms = useAudioRMS(stream);

    const isTalking = rms > 0.02;

    const startMic = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(mediaStream);
            setIsMuted(false);
        } catch (error) {
            console.error("Ошибка доступа к микрофону:", error);
        }
    };

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
                setIsMuted(!track.enabled);
            });
        }
    };

    return (
        <div style={{ padding: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {!stream ? (
                <button onClick={startMic}>Подключить микрофон</button>
            ) : (
                <>
                    <button onClick={toggleMute}>
                        {isMuted ? 'Unmute' : 'Mute'}
                    </button>

                    <div
                        style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: isMuted ? '#555' : (isTalking ? '#4caf50' : '#444'),
                            border: isTalking ? '2px solid #81c784' : '2px solid transparent',
                            transition: 'all 0.1s ease-in-out'
                        }}
                        title={`Текущий RMS: ${rms.toFixed(4)}`}
                    />
                </>
            )}
        </div>
    );
};