import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './components/ui/Toast';
import { PreferencesProvider } from './lib/preferences';
import { LanguageProvider } from './lib/language';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="bias-repo-theme">
        <PreferencesProvider>
          <LanguageProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </LanguageProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
