import './App.css';
import { MicPanel } from './components/MicPanel';

function App() {
  return (
      <>
        <section id="center" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
          <div>
            <h1>Проверка микрофона</h1>
          </div>

          <MicPanel />

        </section>
      </>
  )
}

export default App;