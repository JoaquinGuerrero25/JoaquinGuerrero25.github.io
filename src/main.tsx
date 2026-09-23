import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/global.css';
import { I18nProvider } from './i18n';
import { SyncProvider } from './scene/SyncContext';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <SyncProvider>
        <App />
      </SyncProvider>
    </I18nProvider>
  </StrictMode>,
);
