import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { RoomManager } from "./RoomManager.js";

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});


const wss = new WebSocketServer({ server });
const roomManager = new RoomManager();
const socketMeta = new WeakMap<WebSocket, { roomId: string; clientId: string }>();

console.log(`[Server] Запуск WebSocket сервера...`);


wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[Connect] Новый клиент подключился. IP: ${clientIp}. Всего клиентов: ${wss.clients.size}`);


    ws.send(JSON.stringify({ type: 'welcome', message: 'Успешно подключено к сигнальному серверу' }));


    ws.on('message', (data: Buffer) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`[Message] Получено сообщение:`, message);

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
            console.error(`[Error] Неверный формат JSON`);
            ws.send(JSON.stringify({ type: 'error', message: 'Неверный формат JSON' }));
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
    console.log(`[Server] HTTP и WebSocket сервер слушают порт ${PORT}`);
    console.log(`[Server] Healthcheck доступен на http://localhost:${PORT}/health`);
});