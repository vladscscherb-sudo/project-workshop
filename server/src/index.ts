import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { ClientMessage, ServerMessage } from './types.js';

const PORT = process.env.PORT || 8080;


const rooms = new Map<string, Map<string, WebSocket>>();

const clients = new Map<string, string>();

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });

        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }
    res.writeHead(404);
    res.end('Not Found');
});

const wss = new WebSocketServer({ server });


function sendMessage(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}


function broadcastToRoom(roomId: string, senderId: string, message: ServerMessage) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.forEach((clientWs, userId) => {
        if (userId !== senderId) {
            sendMessage(clientWs, message);
        }
    });
}

wss.on('connection', (ws: WebSocket) => {
    let currentUserId: string | null = null;
    let currentRoomId: string | null = null;

    ws.on('message', (data: Buffer) => {
        try {
            const message: ClientMessage = JSON.parse(data.toString());


            if (message.type === 'join') {
                currentUserId = message.userId;
                currentRoomId = message.roomId;


                if (!rooms.has(currentRoomId)) {
                    rooms.set(currentRoomId, new Map());
                }


                rooms.get(currentRoomId)!.set(currentUserId, ws);
                clients.set(currentUserId, currentRoomId);

                console.log(`[Join] Пользователь ${currentUserId} вошел в комнату ${currentRoomId}`);


                broadcastToRoom(currentRoomId, currentUserId, {
                    type: 'user-joined',
                    userId: currentUserId
                });
                return;
            }


            if (!currentUserId || !currentRoomId) {
                sendMessage(ws, { type: 'error', message: 'Сначала войдите в комнату (join)' });
                return;
            }

            if (message.type === 'offer' || message.type === 'answer' || message.type === 'candidate') {
                const targetWs = rooms.get(currentRoomId)?.get(message.to);

                if (targetWs) {

                    const routedMessage = {
                        ...message,
                        from: currentUserId,
                    } as ServerMessage;

                    delete (routedMessage as any).to;

                    sendMessage(targetWs, routedMessage);
                    console.log(`[Route] Сообщение ${message.type} от ${currentUserId} к ${message.to}`);
                } else {
                    sendMessage(ws, { type: 'error', message: `Пользователь ${message.to} не найден в комнате` });
                }
                return;
            }


            if (message.type === 'leave') {
                handleDisconnect();
            }

        } catch (error) {
            console.error(`[Error] Ошибка парсинга JSON:`, error);
            sendMessage(ws, { type: 'error', message: 'Неверный формат JSON' });
        }
    });


    ws.on('close', () => {
        handleDisconnect();
    });

    function handleDisconnect() {
        if (currentUserId && currentRoomId) {
            const room = rooms.get(currentRoomId);
            if (room) {
                room.delete(currentUserId);

                if (room.size === 0) {
                    rooms.delete(currentRoomId);
                } else {

                    broadcastToRoom(currentRoomId, currentUserId, {
                        type: 'user-left',
                        userId: currentUserId
                    });
                }
            }
            clients.delete(currentUserId);
            console.log(`[Leave] Пользователь ${currentUserId} покинул комнату ${currentRoomId}`);

            currentUserId = null;
            currentRoomId = null;
        }
    }
});

server.listen(PORT, () => {
    console.log(`[Server] WebSocket сервер слушает порт ${PORT}`);
});