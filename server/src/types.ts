export type ClientMessage =
    | { type: 'join'; roomId: string; userId: string }
    | { type: 'offer'; to: string; sdp: any }
    | { type: 'answer'; to: string; sdp: any }
    | { type: 'candidate'; to: string; candidate: any };

export function validateMessage(msg: any): msg is ClientMessage {
    if (!msg || typeof msg !== 'object' || !msg.type) return false;

    switch (msg.type) {
        case 'join':
            return typeof msg.roomId === 'string' && msg.roomId.length > 0
                && typeof msg.userId === 'string' && msg.userId.length > 0;
        case 'offer':
        case 'answer':
        case 'candidate':
            return typeof msg.to === 'string' && msg.to.length > 0;
        default:
            return false;
    }
}