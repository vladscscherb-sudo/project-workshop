export interface JoinMessage {
    type: 'join';
    roomId: string;
    userId: string;
}

export interface LeaveMessage {
    type: 'leave';
}

export interface OfferMessage {
    type: 'offer';
    to: string;
    sdp: RTCSessionDescriptionInit;
}

export interface AnswerMessage {
    type: 'answer';
    to: string;
    sdp: RTCSessionDescriptionInit;
}

export interface CandidateMessage {
    type: 'candidate';
    to: string;
    candidate: RTCIceCandidateInit;
}

export type ClientMessage =
    | JoinMessage
    | LeaveMessage
    | OfferMessage
    | AnswerMessage
    | CandidateMessage;

export interface UserJoinedMessage {
    type: 'user-joined';
    userId: string;
}

export interface UserLeftMessage {
    type: 'user-left';
    userId: string;
}

export interface ServerOfferMessage {
    type: 'offer';
    from: string;
    sdp: RTCSessionDescriptionInit;
}

export interface ServerAnswerMessage {
    type: 'answer';
    from: string;
    sdp: RTCSessionDescriptionInit;
}

export interface ServerCandidateMessage {
    type: 'candidate';
    from: string;
    candidate: RTCIceCandidateInit;
}

export interface ErrorMessage {
    type: 'error';
    message: string;
}

export type ServerMessage =
    | UserJoinedMessage
    | UserLeftMessage
    | ServerOfferMessage
    | ServerAnswerMessage
    | ServerCandidateMessage
    | ErrorMessage;