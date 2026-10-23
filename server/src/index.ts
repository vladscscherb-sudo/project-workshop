import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

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

console.log(`[Server] Запуск WebSocket сервера...`);


wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[Connect] Новый клиент подключился. IP: ${clientIp}. Всего клиентов: ${wss.clients.size}`);


    ws.send(JSON.stringify({ type: 'welcome', message: 'Успешно подключено к сигнальному серверу' }));


    ws.on('message', (data: Buffer) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`[Message] Получено сообщение:`, message);

            // Пока просто эхо-ответ, чтобы проверить работу
            ws.send(JSON.stringify({ type: 'echo', original: message }));
        } catch (error) {
            console.error(`[Error] Неверный формат JSON`);
            ws.send(JSON.stringify({ type: 'error', message: 'Неверный формат JSON' }));
        }
    });


    ws.on('close', () => {
        console.log(`[Disconnect] Клиент отключился. Осталось клиентов: ${wss.clients.size}`);
    });

    // Обработка ошибок сокета
    ws.on('error', (error) => {
        console.error(`[Socket Error] Ошибка сокета:`, error);
    });
});


server.listen(PORT, () => {
    console.log(`[Server] HTTP и WebSocket сервер слушают порт ${PORT}`);
    console.log(`[Server] Healthcheck доступен на http://localhost:${PORT}/health`);
});