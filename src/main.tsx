import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DerivProvider } from './contexts/DerivContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DerivProvider>
      <App />
    </DerivProvider>
  </StrictMode>,
);
