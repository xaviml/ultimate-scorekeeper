import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GameProvider } from './state/GameContext';
import { I18nProvider } from './i18n';
import './index.css';
import { applyTheme, watchSystemTheme } from './state/uiPreferences';
import { prefetchTeamsYaml } from './state/loadTeamsYaml';

// Every page is a history entry (see hooks/useRoute), but some stay mounted, hidden,
// under the page opened over them, so the browser's own scroll restoration would
// restore positions that belong to a different page than the one React is about to
// show. Manual restoration leaves every scroll decision to the app
// (usePreservedScroll, and each screen's own scroll-to-top on mount).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// index.html already set the theme attribute before paint; this sets the browser
// bar colour to match and keeps it in step with the phone's own setting.
applyTheme();
watchSystemTheme();

// The Teams page's YAML view is a chunk of its own; fetching it once the app is idle
// is what puts it in the service worker's cache before anyone needs it offline.
prefetchTeamsYaml();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </I18nProvider>
  </React.StrictMode>,
);
