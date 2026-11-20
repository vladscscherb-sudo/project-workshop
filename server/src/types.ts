

export type ClientMessageType = 'join' | 'leave' | 'offer' | 'answer' | 'candidate';
export type ServerMessageType = 'user-joined' | 'user-left' | 'offer' | 'answer' | 'candidate' | 'error';


interface BaseMessage {
    type: string;
}


export interface JoinMessage extends BaseMessage {
    type: 'join';
    roomId: string;
    userId: string;
}

export interface LeaveMessage extends BaseMessage {
    type: 'leave';
}

export interface OfferMessage extends BaseMessage {
    type: 'offer';
    to: string;
    sdp: unknown;
}

export interface AnswerMessage extends BaseMessage {
    type: 'answer';
    to: string;
    sdp: unknown;
}

export interface CandidateMessage extends BaseMessage {
    type: 'candidate';
    to: string;
    candidate: unknown;
}

export type ClientMessage = JoinMessage | LeaveMessage | OfferMessage | AnswerMessage | CandidateMessage;


export interface UserJoinedMessage extends BaseMessage {
    type: 'user-joined';
    userId: string;
}

export interface UserLeftMessage extends BaseMessage {
    type: 'user-left';
    userId: string;
}

export interface ServerOfferMessage extends BaseMessage {
    type: 'offer';
    from: string; // ID того, кто прислал оффер
    sdp: unknown;
}

export interface ServerAnswerMessage extends BaseMessage {
    type: 'answer';
    from: string;
    sdp: unknown;
}

export interface ServerCandidateMessage extends BaseMessage {
    type: 'candidate';
    from: string;
    candidate: unknown;
}

export interface ErrorMessage extends BaseMessage {
    type: 'error';
    message: string;
}

export type ServerMessage = UserJoinedMessage | UserLeftMessage | ServerOfferMessage | ServerAnswerMessage | ServerCandidateMessage | ErrorMessage;

export function validateMessage(msg: any): msg is ClientMessage {
    if (!msg || typeof msg !== 'object' || !msg.type) return false;

    switch (msg.type) {
        case 'join':
            return typeof msg.roomId === 'string' && msg.roomId.length > 0
                && typeof msg.userId === 'string' && msg.userId.length > 0;
        case 'leave':
            return true;
        case 'offer':
        case 'answer':
        case 'candidate':
            return typeof msg.to === 'string' && msg.to.length > 0;
        default:
            return false;
    }
}