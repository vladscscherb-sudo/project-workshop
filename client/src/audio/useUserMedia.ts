import { useEffect, useMemo, useState } from 'react';
import { AudioService, describeMediaError, type MicState } from './AudioService';

export interface UseUserMediaResult {
    state: MicState;
    volume: number;
    error: Error | null;
    errorText: string | null;
    isMuted: boolean;
    isActive: boolean;
    isIdle: boolean;
    start: () => Promise<void>;
    stop: () => void;
    mute: () => void;
    unmute: () => void;
    stream: MediaStream | null;
    analyser: AnalyserNode | null;
    service: AudioService;
}

export function useUserMedia(): UseUserMediaResult {
    const [state, setState] = useState<MicState>('idle');
    const [volume, setVolume] = useState(0);
    const [error, setError] = useState<Error | null>(null);
    const [errorText, setErrorText] = useState<string | null>(null);

    const service = useMemo(
        () =>
            new AudioService({
                onVolume: setVolume,
                onStateChange: setState,
                onError: (e) => {
                    setError(e);
                    setErrorText(describeMediaError(e));
                }
            }),
        []
    );

    useEffect(() => {
        return () => {
            service.stop();
        };
    }, [service]);

    const start = async (): Promise<void> => {
        setError(null);
        setErrorText(null);
        await service.start();
    };

    const stop = (): void => service.stop();
    const mute = (): void => service.setMuted(true);
    const unmute = (): void => service.setMuted(false);

    return {
        state,
        volume,
        error,
        errorText,
        isMuted: state === 'muted',
        isActive: state === 'active',
        isIdle: state === 'idle',
        start,
        stop,
        mute,
        unmute,
        stream: service.getStream(),
        analyser: service.getAnalyser(),
        service
    };
}