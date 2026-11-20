import './App.css';
import { useUserMedia } from './audio/useUserMedia';
import { MicPanel } from './components/MicPanel';

function App() {
    const audio = useUserMedia();
  return (
      <>
        <section id="center" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
          <div>
            <h1>Проверка микрофона</h1>
          </div>

          <MicPanel
              state={audio.state}
              volume={audio.volume}
              isMuted={audio.isMuted}
              start={audio.start}
              mute={audio.mute}
              unmute={audio.unmute}
          />

        </section>
      </>
  )
}

export default App;