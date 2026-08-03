import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserApi } from './adapters';
import { App } from './ui/App';
import './ui/styles.css';

const { api } = createBrowserApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App api={api} />
  </StrictMode>,
);
