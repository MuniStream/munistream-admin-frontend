import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Set document title based on tenant
const tenantName = import.meta.env.VITE_TENANT_NAME || import.meta.env.VITE_ORGANIZATION || 'MuniStream';
document.title = `${tenantName} Admin Dashboard`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
