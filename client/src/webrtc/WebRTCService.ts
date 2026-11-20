export const DEFAULT_RTC_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export interface WebRTCServiceEvents {
    onOfferCreated: (peerId: string, offer: RTCSessionDescriptionInit) => void;
    onAnswerCreated: (peerId: string, answer: RTCSessionDescriptionInit) => void;
    onIceCandidate?: (peerId: string, candidate: RTCIceCandidateInit) => void;
    onRemoteTrack?: (peerId: string, stream: MediaStream) => void;
    onConnectionStateChange?: (peerId: string, state: RTCPeerConnectionState) => void;
}

export class WebRTCService {
    private readonly peers = new Map<string, RTCPeerConnection>();
    private readonly config: RTCConfiguration;
    private readonly events: WebRTCServiceEvents;
    private localStream: MediaStream | null = null;

    constructor(events: WebRTCServiceEvents, config: RTCConfiguration = DEFAULT_RTC_CONFIG) {
        this.events = events;
        this.config = config;
    }

    setLocalStream(stream: MediaStream | null): void {
        this.localStream = stream;
    }

    createPeerConnection(peerId: string): RTCPeerConnection {
        if (this.peers.has(peerId)) {
            this.closePeer(peerId);
        }

        const pc = new RTCPeerConnection(this.config);

        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                pc.addTrack(track, this.localStream!);
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.events.onIceCandidate?.(peerId, event.candidate.toJSON());
            }
        };

        pc.ontrack = (event) => {
            const remoteStream = event.streams[0];
            if (remoteStream) {
                this.events.onRemoteTrack?.(peerId, remoteStream);
            }
        };

        pc.onconnectionstatechange = () => {
            this.events.onConnectionStateChange?.(peerId, pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                this.closePeer(peerId);
            }
        };

        this.peers.set(peerId, pc);
        return pc;
    }

    async initiateCall(peerId: string): Promise<RTCSessionDescriptionInit> {
        const pc = this.createPeerConnection(peerId);

        const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
        });

        await pc.setLocalDescription(offer);
        this.events.onOfferCreated(peerId, offer);

        return offer;
    }

    async handleOffer(
        peerId: string,
        offer: RTCSessionDescriptionInit
    ): Promise<RTCSessionDescriptionInit> {
        const pc = this.createPeerConnection(peerId);

        await pc.setRemoteDescription(offer);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.events.onAnswerCreated(peerId, answer);

        return answer;
    }

    async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
        const pc = this.peers.get(peerId);
        if (!pc) {
            console.warn(`[WebRTC] PeerConnection для ${peerId} не найден при получении Answer`);
            return;
        }

        await pc.setRemoteDescription(answer);
    }

    getPeer(peerId: string): RTCPeerConnection | undefined {
        return this.peers.get(peerId);
    }

    getPeerIds(): string[] {
        return Array.from(this.peers.keys());
    }

    closePeer(peerId: string): void {
        const pc = this.peers.get(peerId);
        if (!pc) return;

        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.close();
        this.peers.delete(peerId);
    }

    closeAll(): void {
        for (const peerId of Array.from(this.peers.keys())) {
            this.closePeer(peerId);
        }
    }
}