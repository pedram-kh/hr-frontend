import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Sprint 11a: self-hosted Sedena brand fonts (Montserrat + Playfair Display),
// replacing @fontsource/inter — same self-hosted, no-external-request pattern.
import './assets/fonts/fonts.css';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from './theme/ThemeProvider';
import { BRAND } from './theme/brand';
import App from './App.tsx';
import './index.css';

// Sprint 11a (§A.5): index.html's <title> is static markup (no SSR/templating
// in this build), so it's the one BRAND read that can't be a JSX expression —
// set at runtime instead, once, here.
document.title = BRAND.productName;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
