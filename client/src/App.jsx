import { useEffect, useState } from 'react';
import api from './services/api';

function App() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    api
      .get('/health')
      .then(() => {
        setStatus('connected');
      })
      .catch(() => {
        setStatus('failed');
      });
  }, []);

  const statusText = {
    checking: 'Checking...',
    connected: '✓ Connected',
    failed: '✗ Unable to connect',
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>DevSync</h1>
        <p>Developer Collaboration Platform</p>
      </header>

      <main>
        <p className={`status status-${status}`}>
          Backend Status: {statusText[status]}
        </p>
      </main>
    </div>
  );
}

export default App;