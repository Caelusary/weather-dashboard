import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { isInvalidKey } from './lib/api';
import { isWeakDevice } from './lib/device';
import { PlacesProvider } from './providers/PlacesProvider';
import { SettingsProvider } from './providers/SettingsProvider';
import './index.css';

// Weak phones get flat glass (see .glass in index.css) and a still sky.
if (isWeakDevice()) document.documentElement.classList.add('lite');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // A bad API key will not fix itself; anything else gets one more try.
      retry: (failureCount, error) => !isInvalidKey(error) && failureCount < 1,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <PlacesProvider>
          <App />
        </PlacesProvider>
      </SettingsProvider>
    </QueryClientProvider>
  </StrictMode>,
);
