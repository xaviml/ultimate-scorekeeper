import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GameProvider } from './state/GameContext';
import { I18nProvider } from './i18n';
import './index.css';

// The history stack here (see useBackGuard) exists only to catch the phone/
// browser back gesture, not to move between real pages — so the browser's
// default scroll restoration on a popstate is restoring a position that has
// nothing to do with the screen React is about to render, and can race an
// explicit `scrollTo(0, 0)` fired from that screen's own mount effect (e.g.
// ConfigScreen's, after "Exit report"). Manual restoration leaves every
// scroll decision to the app.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </I18nProvider>
  </React.StrictMode>,
);
