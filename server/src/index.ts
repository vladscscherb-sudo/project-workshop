import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { RoomManager } from "./RoomManager.js";

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
const roomManager = new RoomManager();
const socketMeta = new WeakMap<WebSocket, { roomId: string; clientId: string }>();


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

            if (message.type === 'join') {
                const { roomId, userId } = message;

                roomManager.addClient(roomId, userId, ws);
                socketMeta.set(ws, { roomId, clientId: userId });

                const clients = roomManager.getClientsInRoom(roomId);
                clients.forEach((client) => {
                    if (client.id !== userId) {
                        client.socket.send(JSON.stringify({ type: 'user-joined', userId }));
                    }
                });
                return;
            }

            if (message.type === 'offer' || message.type === 'answer' || message.type === 'candidate') {
                const meta = socketMeta.get(ws);
                if (!meta) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Сначала войдите в комнату' }));
                    return;
                }

                const target = roomManager.getClient(meta.roomId, message.to);
                if (target) {
                    target.socket.send(JSON.stringify({ ...message, from: meta.clientId }));
                }
                return;
            }

            ws.send(JSON.stringify({ type: 'echo', original: message }));

        } catch (error) {
            console.error(`[Error] Ошибка парсинга JSON:`, error);
            sendMessage(ws, { type: 'error', message: 'Неверный формат JSON' });
        }
    });

    ws.on('close', () => {
        const meta = socketMeta.get(ws);
        if (meta) {
            const clients = roomManager.getClientsInRoom(meta.roomId);
            clients.forEach((client) => {
                if (client.id !== meta.clientId) {
                    client.socket.send(JSON.stringify({
                        type: 'user-left',
                        userId: meta.clientId
                    }));
                }
            });

            roomManager.removeClient(meta.roomId, meta.clientId);
            console.log(`[Disconnect] Клиент ${meta.clientId} отключился. Осталось клиентов: ${wss.clients.size}`);
        } else {
            console.log(`[Disconnect] Клиент отключился (не был в комнате). Осталось клиентов: ${wss.clients.size}`);
        }
    });

    ws.on('error', (error) => {
        console.error(`[Socket Error] Ошибка сокета:`, error);
    });
});

server.listen(PORT, () => {
    console.log(`[Server] WebSocket сервер слушает порт ${PORT}`);
});