import type { ClientMessage, ServerMessage } from './types';

export interface SignalingClientEvents {
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (err: Event) => void;
    onMessage: (message: ServerMessage) => void;
}

export class SignalingClient {
    private ws: WebSocket | null = null;
    private readonly url: string;
    private readonly events: SignalingClientEvents;

    constructor(url: string, events: SignalingClientEvents) {
        this.url = url;
        this.events = events;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                resolve();
                return;
            }

            const ws = new WebSocket(this.url);
            this.ws = ws;

            ws.onopen = () => {
                this.events.onOpen?.();
                resolve();
            };

            ws.onerror = (event) => {
                this.events.onError?.(event);
                reject(new Error('WebSocket connection error'));
            };

            ws.onclose = () => {
                this.ws = null;
                this.events.onClose?.();
            };

            ws.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(String(event.data)) as ServerMessage;
                    this.events.onMessage(parsed);
                } catch (err) {
                    console.error('[Signaling] Не удалось распарсить сообщение:', err);
                }
            };
        });
    }

    send(message: ClientMessage): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[Signaling] Сокет не открыт, сообщение не отправлено:', message);
            return;
        }
        this.ws.send(JSON.stringify(message));
    }

    join(roomId: string, userId: string): void {
        this.send({ type: 'join', roomId, userId });
    }

    leave(): void {
        this.send({ type: 'leave' });
    }

    sendOffer(to: string, sdp: RTCSessionDescriptionInit): void {
        this.send({ type: 'offer', to, sdp });
    }

    sendAnswer(to: string, sdp: RTCSessionDescriptionInit): void {
        this.send({ type: 'answer', to, sdp });
    }

    sendCandidate(to: string, candidate: RTCIceCandidateInit): void {
        this.send({ type: 'candidate', to, candidate });
    }

    disconnect(): void {
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.leave();
            }
            this.ws.close();
            this.ws = null;
        }
    }
}