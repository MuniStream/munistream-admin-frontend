import { createRoot } from 'react-dom/client'
import './index.css'

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <div style={{ padding: '20px' }}>
      <h1>🏛️ CivicStream is Working!</h1>
      <p>Frontend container is successfully running.</p>
      <a href="http://localhost:8000/docs" target="_blank">Backend API Docs</a>
    </div>
  );
} else {
  console.error('Root element not found');
}