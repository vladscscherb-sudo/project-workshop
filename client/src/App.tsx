import './App.css';
import { MicPanel } from './components/MicPanel'; // Убедись, что путь до компонента верный

function App() {
  return (
      <>
        <section id="center" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
          <div>
            <h1>Проверка микрофона</h1>
            <p>
              Задачи KAN-8 и KAN-9
            </p>
          </div>

          <MicPanel />

        </section>
      </>
  )
}

export default App;