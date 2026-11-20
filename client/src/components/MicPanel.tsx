import type { MicState } from '../audio/AudioService';

interface MicPanelProps {
    state: MicState;
    volume: number;
    isMuted: boolean;
    start: () => Promise<void>;
    mute: () => void;
    unmute: () => void;
}

export const MicPanel = ({ state, volume, isMuted, start, mute, unmute }: MicPanelProps) => {
    const isTalking = volume > 0.02 && !isMuted;

    return (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
            {state === 'idle' || state === 'error' ? (
                <button onClick={start}>Подключить микрофон</button>
            ) : (
                <>
                    <button onClick={isMuted ? unmute : mute}>
                        {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                    <div
                        style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: isMuted ? '#555' : (isTalking ? '#4caf50' : '#444'),
                            border: isTalking ? '2px solid #81c784' : '2px solid transparent',
                            transition: 'all 0.1s ease-in-out'
                        }}
                        title={`Текущий RMS: ${volume.toFixed(4)}`}
                    />
                    <span style={{ color: 'gray', fontSize: '12px' }}>State: {state}</span>
                </>
            )}
        </div>
    );
};