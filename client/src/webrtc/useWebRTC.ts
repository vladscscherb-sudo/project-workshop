import { useCallback, useEffect, useRef, useState } from 'react';
import { SignalingClient } from './SignalingClient';
import { WebRTCService } from './WebRTCService';
import type { ServerMessage } from './types';

export type RoomStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseWebRTCOptions {
    signalingUrl?: string;
    localStream: MediaStream | null;
}

export interface UseWebRTCResult {
    status: RoomStatus;
    peers: string[];
    error: string | null;
    joinRoom: (roomId: string, userId: string) => Promise<void>;
    leaveRoom: () => void;
}

const DEFAULT_SIGNALING_URL = 'ws://localhost:8080';

export function useWebRTC({
                              signalingUrl = DEFAULT_SIGNALING_URL,
                              localStream,
                          }: UseWebRTCOptions): UseWebRTCResult {
    const [status, setStatus] = useState<RoomStatus>('disconnected');
    const [peers, setPeers] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const signalingRef = useRef<SignalingClient | null>(null);
    const webrtcRef = useRef<WebRTCService | null>(null);

    useEffect(() => {
        webrtcRef.current?.setLocalStream(localStream);
    }, [localStream]);

    const handleServerMessage = useCallback(async (message: ServerMessage) => {
        const webrtc = webrtcRef.current;
        if (!webrtc) return;

        switch (message.type) {
            case 'user-joined': {
                console.log(`[WebRTC] Новый участник ${message.userId}, создаём Offer (Caller)...`);
                try {
                    await webrtc.initiateCall(message.userId);
                    setPeers(webrtc.getPeerIds());
                } catch (err) {
                    console.error('[WebRTC] Ошибка при createOffer:', err);
                    setError(err instanceof Error ? err.message : 'Ошибка создания Offer');
                }
                break;
            }
            case 'user-left': {
                console.log(`[WebRTC] Участник ${message.userId} вышел`);
                webrtc.closePeer(message.userId);
                setPeers(webrtc.getPeerIds());
                break;
            }
            case 'offer': {
                console.log(`[WebRTC] Получен Offer от ${message.from}, создаём Answer (Callee)...`);
                try {
                    await webrtc.handleOffer(message.from, message.sdp);
                    setPeers(webrtc.getPeerIds());
                } catch (err) {
                    console.error('[WebRTC] Ошибка при обработке Offer / createAnswer:', err);
                    setError(err instanceof Error ? err.message : 'Ошибка создания Answer');
                }
                break;
            }
            case 'answer': {
                console.log(`[WebRTC] Получен Answer от ${message.from}, применяем RemoteDescription...`);
                try {
                    await webrtc.handleAnswer(message.from, message.sdp);
                } catch (err) {
                    console.error('[WebRTC] Ошибка при применении Answer:', err);
                    setError(err instanceof Error ? err.message : 'Ошибка применения Answer');
                }
                break;
            }
            case 'candidate': {
                console.log(`[WebRTC] Получен ICE-кандидат от ${message.from}`);
                break;
            }
            case 'error': {
                console.error('[Signaling] Ошибка сервера:', message.message);
                setError(message.message);
                break;
            }
        }
    }, []);

    const leaveRoom = useCallback(() => {
        webrtcRef.current?.closeAll();
        signalingRef.current?.disconnect();
        webrtcRef.current = null;
        signalingRef.current = null;
        setPeers([]);
        setStatus('disconnected');
    }, []);

    const joinRoom = useCallback(
        async (roomId: string, userId: string) => {
            leaveRoom();
            setError(null);
            setStatus('connecting');

            const signaling = new SignalingClient(signalingUrl, {
                onClose: () => {
                    webrtcRef.current?.closeAll();
                    setPeers([]);
                    setStatus('disconnected');
                },
                onError: () => {
                    setError('Не удалось подключиться к signaling-серверу');
                    setStatus('error');
                },
                onMessage: (msg) => {
                    void handleServerMessage(msg);
                },
            });

            const webrtc = new WebRTCService({
                onOfferCreated: (peerId, offer) => {
                    console.log(`[WebRTC] Отправляем Offer для ${peerId}`);
                    signaling.sendOffer(peerId, offer);
                },
                onAnswerCreated: (peerId, answer) => {
                    console.log(`[WebRTC] Отправляем Answer для ${peerId}`);
                    signaling.sendAnswer(peerId, answer);
                },
                onIceCandidate: (peerId, candidate) => {
                    signaling.sendCandidate(peerId, candidate);
                },
                onConnectionStateChange: (peerId, state) => {
                    console.log(`[WebRTC] Состояние соединения с ${peerId}: ${state}`);
                },
            });

            webrtc.setLocalStream(localStream);

            signalingRef.current = signaling;
            webrtcRef.current = webrtc;

            try {
                await signaling.connect();
                signaling.join(roomId, userId);
                setStatus('connected');
            } catch {
                leaveRoom();
                setStatus('error');
                setError('Не удалось подключиться к WebSocket-серверу');
            }
        },
        [signalingUrl, localStream, handleServerMessage, leaveRoom]
    );

    useEffect(() => {
        return () => {
            leaveRoom();
        };
    }, [leaveRoom]);

    return {
        status,
        peers,
        error,
        joinRoom,
        leaveRoom,
    };
}