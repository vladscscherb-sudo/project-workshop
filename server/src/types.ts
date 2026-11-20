

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
    sdp: any;
}

export interface AnswerMessage extends BaseMessage {
    type: 'answer';
    to: string;
    sdp: any;
}

export interface CandidateMessage extends BaseMessage {
    type: 'candidate';
    to: string;
    candidate: any;
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
    sdp: any;
}

export interface ServerAnswerMessage extends BaseMessage {
    type: 'answer';
    from: string;
    sdp: any;
}

export interface ServerCandidateMessage extends BaseMessage {
    type: 'candidate';
    from: string;
    candidate: any;
}

export interface ErrorMessage extends BaseMessage {
    type: 'error';
    message: string;
}

export type ServerMessage = UserJoinedMessage | UserLeftMessage | ServerOfferMessage | ServerAnswerMessage | ServerCandidateMessage | ErrorMessage;