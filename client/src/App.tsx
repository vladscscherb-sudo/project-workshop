import { useState } from 'react';
import './App.css';
import { useUserMedia } from './audio/useUserMedia';
import { MicPanel } from './components/MicPanel';
import { useWebRTC } from './webrtc/useWebRTC';

function App() {
    const audio = useUserMedia();
    const [roomId, setRoomId] = useState('room1');
    const [userId, setUserId] = useState(() => `user-${Math.floor(Math.random() * 1000)}`);

    const rtc = useWebRTC({
        localStream: audio.stream,
    });

    const handleJoin = async () => {
        if (audio.isIdle) {
            await audio.start();
        }
        await rtc.joinRoom(roomId, userId);
    };

    return (
        <section id="center" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <h1>Проверка микрофона и WebRTC (Caller)</h1>

            <MicPanel
                state={audio.state}
                volume={audio.volume}
                isMuted={audio.isMuted}
                start={audio.start}
                mute={audio.mute}
                unmute={audio.unmute}
            />

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Room ID"
                />
                <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="User ID"
                />
                {rtc.status !== 'connected' ? (
                    <button onClick={() => void handleJoin()}>Войти в комнату</button>
                ) : (
                    <button onClick={rtc.leaveRoom}>Выйти</button>
                )}
            </div>

            <div style={{ fontSize: '14px', color: 'gray' }}>
                <div>Signaling: {rtc.status}</div>
                <div>Peers: {rtc.peers.length > 0 ? rtc.peers.join(', ') : 'нет'}</div>
                {rtc.error && <div style={{ color: '#ff5252' }}>Ошибка: {rtc.error}</div>}
            </div>
        </section>
    );
}

export default App;