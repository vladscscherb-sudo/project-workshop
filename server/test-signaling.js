import { WebSocket } from 'ws';

const wsA = new WebSocket('ws://localhost:8080');
wsA.on('open', () => {
    wsA.send(JSON.stringify({ type: 'join', roomId: 'room1', userId: 'Vova' }));
    setTimeout(() => {
        wsA.send(JSON.stringify({ type: 'offer', to: 'Bob', sdp: { fake: 'sdp-data' } }));
    }, 1000);
});
wsA.on('message', (e) => console.log('Vova получил:', e.toString()));

const wsB = new WebSocket('ws://localhost:8080');
wsB.on('open', () => {
    wsB.send(JSON.stringify({ type: 'join', roomId: 'room1', userId: 'Bob' }));
});
wsB.on('message', (e) => console.log('Bob получил:', e.toString()));

setTimeout(() => {
    console.log('Вова отключается...');
    wsA.close();
}, 3000);