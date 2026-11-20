import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { RoomManager } from './RoomManager.js';
import { validateMessage, type ServerMessage } from './types.js';

const PORT = process.env.PORT || 8080;

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

function sendMessage(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

function handleDisconnect(ws: WebSocket): void {
    const meta = socketMeta.get(ws);
    if (!meta) return;

    const clients = roomManager.getClientsInRoom(meta.roomId);
    clients.forEach((client) => {
        if (client.id !== meta.clientId) {
            sendMessage(client.socket, {
                type: 'user-left',
                userId: meta.clientId,
            });
        }
    });

    roomManager.removeClient(meta.roomId, meta.clientId);
    socketMeta.delete(ws);
    console.log(`[Disconnect] Клиент ${meta.clientId} покинул комнату ${meta.roomId}`);
}

wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (data: Buffer) => {
        try {
            const parsed: unknown = JSON.parse(data.toString());

            if (!validateMessage(parsed)) {
                sendMessage(ws, { type: 'error', message: 'Невалидный формат сообщения' });
                return;
            }

            if (parsed.type === 'join') {
                const { roomId, userId } = parsed;
                roomManager.addClient(roomId, userId, ws);
                socketMeta.set(ws, { roomId, clientId: userId });

                const clients = roomManager.getClientsInRoom(roomId);
                clients.forEach((client) => {
                    if (client.id !== userId) {
                        sendMessage(client.socket, { type: 'user-joined', userId });
                    }
                });
                return;
            }

            const meta = socketMeta.get(ws);
            if (!meta) {
                sendMessage(ws, { type: 'error', message: 'Сначала войдите в комнату (join)' });
                return;
            }

            if (parsed.type === 'leave') {
                handleDisconnect(ws);
                return;
            }

            if (parsed.type === 'offer' || parsed.type === 'answer' || parsed.type === 'candidate') {
                const target = roomManager.getClient(meta.roomId, parsed.to);
                if (!target) {
                    sendMessage(ws, { type: 'error', message: `Пользователь ${parsed.to} не найден в комнате` });
                    return;
                }

                if (parsed.type === 'offer') {
                    sendMessage(target.socket, { type: 'offer', from: meta.clientId, sdp: parsed.sdp });
                } else if (parsed.type === 'answer') {
                    sendMessage(target.socket, { type: 'answer', from: meta.clientId, sdp: parsed.sdp });
                } else {
                    sendMessage(target.socket, { type: 'candidate', from: meta.clientId, candidate: parsed.candidate });
                }
            }
        } catch (error) {
            console.error('[Error] Ошибка парсинга JSON:', error);
            sendMessage(ws, { type: 'error', message: 'Неверный формат JSON' });
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });

    ws.on('error', (error) => {
        console.error('[Socket Error] Ошибка сокета:', error);
    });
});

server.listen(PORT, () => {
    console.log(`[Server] WebSocket сервер слушает порт ${PORT}`);
});