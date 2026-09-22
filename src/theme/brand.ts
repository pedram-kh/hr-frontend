// Sprint 11a (§A.5) — the single place a component reads NON-COLOR brand
// facts from. Color values live in index.css as tokens (ADR-0012); this
// object exists only for the product name string and the logo asset, so a
// future name/logo change is a one-line edit here instead of a grep across
// every shell/page that says "HR Platform".
import logo from '../assets/brand/logo.svg';

export const BRAND = {
  productName: 'HR Platform',
  logo,
} as const;
