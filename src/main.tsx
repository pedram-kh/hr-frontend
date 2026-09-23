import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Sprint 11a: self-hosted Sedena brand fonts (Montserrat + Playfair Display),
// replacing @fontsource/inter — same self-hosted, no-external-request pattern.
import './assets/fonts/fonts.css';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from './theme/ThemeProvider';
import { LocaleProvider } from './i18n/LocaleProvider';
import { es } from './i18n/es';
import App from './App.tsx';
import './index.css';

// Sprint 11a (§A.5): index.html's <title> is static markup (no SSR/templating
// in this build), so it's the one BRAND read that can't be a JSX expression —
// set at runtime instead, once, here.
document.title = es.brand.productName;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Sprint 11b (plan.md §B.7) — mounted alongside ThemeProvider (order
        doesn't matter, they don't interact) so LoginPage, which sits
        outside both shells, also gets a locale. */}
    <LocaleProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </LocaleProvider>
  </StrictMode>,
);
