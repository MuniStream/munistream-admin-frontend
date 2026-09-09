import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fuente autoalojada: los temas llevaban años nombrando familias que nunca se
// descargaban, así que el admin se veía en la fuente del sistema. Se sirve desde
// el propio contenedor y no desde Google Fonts, que la red de un organismo
// público suele tener bloqueado. Solo los subconjuntos latinos, que es lo que
// esta interfaz usa.
import '@fontsource/noto-sans/latin-400.css'
import '@fontsource/noto-sans/latin-500.css'
import '@fontsource/noto-sans/latin-600.css'
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
