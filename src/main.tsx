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
import { BRAND } from './theme/brand';
import App from './App.tsx';
import './index.css';

// index.html's <title> and favicon link are static markup (no SSR). Both
// shells share this document, so set them once here from brand data — no
// client name in the markup.
document.title = es.brand.productName;
document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href', BRAND.icon);

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
