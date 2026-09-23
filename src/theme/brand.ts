// Sprint 11a (§A.5) — the single place a component reads NON-COLOR brand
// facts from. Color values live in index.css as tokens (ADR-0012); this
// object exists only for the logo asset. The product name string moved into
// the locale dictionaries in Sprint 11b (`t.brand.productName`) so the
// anti-rot guard can clear this file — both locales use the same brand
// identity string by design. `main.tsx` still needs a sync bootstrap title
// before React mounts, so it reads `es.brand.productName` directly.
import logo from '../assets/brand/logo.svg';

export const BRAND = {
  logo,
} as const;
