export type MicState = 'idle' | 'requesting' | 'active' | 'muted' | 'error';

export interface AudioServiceEvents {

    onVolume: (rms: number) => void;

    onStateChange: (state: MicState) => void;

    onError: (err: Error) => void;
}

export class AudioService {
    private stream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private rafId: number | null = null;
    private dataArray: Float32Array<ArrayBuffer> = new Float32Array(0);
    private state: MicState = 'idle';
    private destroyed = false;

    private readonly events: AudioServiceEvents;

    constructor(events: AudioServiceEvents) {
        this.events = events;
    }


    async start(): Promise<void> {
        if (this.stream) return;

        this.setState('requesting');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            if (this.destroyed) {
                stream.getTracks().forEach((t) => t.stop());
                return;
            }

            this.stream = stream;
            this.setupAnalyser(stream);
            this.setState('active');
            this.loop();
        } catch (err) {
            this.setState('error');
            this.events.onError(err as Error);
            throw err;
        }
    }

    private setupAnalyser(stream: MediaStream): void {
        const ctx = new AudioContext();

        if (ctx.state === 'suspended') {
            void ctx.resume();
        }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        source.connect(analyser);

        this.audioContext = ctx;
        this.source = source;
        this.analyser = analyser;
        this.dataArray = new Float32Array(analyser.fftSize);
    }

    private loop = (): void => {
        if (!this.analyser) return;

        this.analyser.getFloatTimeDomainData(this.dataArray);

        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            const v = this.dataArray[i];
            sum += v * v;
        }
        const rms = Math.sqrt(sum / this.dataArray.length);

        this.events.onVolume(rms);
        this.rafId = requestAnimationFrame(this.loop);
    };

    setMuted(muted: boolean): void {
        if (!this.stream) return;
        this.stream.getAudioTracks().forEach((t) => {
            t.enabled = !muted;
        });
        this.setState(muted ? 'muted' : 'active');
    }

    isMuted(): boolean {
        return this.state === 'muted';
    }

    getStream(): MediaStream | null {
        return this.stream;
    }

    getAnalyser(): AnalyserNode | null {
        return this.analyser;
    }

    stop(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.stream?.getTracks().forEach((t) => t.stop());
        this.source?.disconnect();
        this.analyser?.disconnect();
        void this.audioContext?.close().catch(() => {});
        this.stream = null;
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = new Float32Array(0);
        this.setState('idle');
    }

    destroy(): void {
        this.destroyed = true;
        this.stop();
    }

    private setState(state: MicState): void {
        if (this.state === state) return;
        this.state = state;
        this.events.onStateChange(state);
    }
}

export function describeMediaError(err: unknown): string {
    const e = err as DOMException | Error;
    const name = (e as DOMException)?.name;
    switch (name) {
        case 'NotAllowedError':
            return 'Доступ к микрофону запрещён. Разрешите его в настройках браузера.';
        case 'NotFoundError':
            return 'Микрофон не найден. Проверьте подключение устройства.';
        case 'NotReadableError':
            return 'Микрофон занят другим приложением.';
        case 'OverconstrainedError':
            return 'Не удалось настроить параметры микрофона.';
        case 'SecurityError':
            return 'Микрофон работает только на HTTPS или localhost.';
        default:
            return e?.message ?? 'Не удалось получить доступ к микрофону.';
    }
}