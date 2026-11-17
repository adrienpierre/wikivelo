import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

const handleEmergencyReset = () => {
  try {
    localStorage.removeItem('velolegends_tcg_save_v4');
    localStorage.removeItem('velolegends_tcg_save_v3');
  } catch {
    // Ignore storage errors
  }
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary onResetSave={handleEmergencyReset}>
      <App />
    </ErrorBoundary>
  );
}
