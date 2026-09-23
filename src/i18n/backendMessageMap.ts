import { es } from './es';
import type { Locale } from './context';

/** Same key as LocaleProvider's `LOCALE_KEY` — duplicated here so `api.ts` can
 *  read locale without importing the React provider module. */
const LOCALE_STORAGE_KEY = 'hr-locale';

/**
 * English network-fallback copy — kept inline (not via `import './en'`) so
 * `en.ts` stays a lazy chunk. Must stay in sync with `en.errors.*`.
 */
const EN_NETWORK_FALLBACKS = {
  requestFailed: 'Request failed ({status})',
  uploadFailed: 'Upload failed ({status})',
} as const;

/**
 * Exact English backend `message` → Spanish. Consulted only when locale==='es'.
 * Fragile by construction (plan.md §A.2).
 *
 * Keys are the distinct English custom messages from hr-backend controllers
 * (exact strings). Dynamic templates with interpolated values (e.g.
 * `Unknown lens '${lens}'`, `Unknown vocabulary '${type}'`) are intentionally
 * omitted — unmappable by exact match.
 */
export const BACKEND_MESSAGE_MAP: Record<string, string> = {
  'Invalid or expired code.': 'Código inválido o caducado.',
  'Too many attempts. Request a new code.': 'Demasiados intentos. Solicita un código nuevo.',
  'If that email is registered, a login code has been sent.':
    'Si ese correo está registrado, se ha enviado un código de acceso.',
  'Chat is for employees.': 'El chat es para empleados.',
  'Message not found.': 'Mensaje no encontrado.',
  'This expiry task is already resolved.': 'Esta tarea de vigencia ya está resuelta.',
  'There is no live AI proposal on this task.': 'No hay una propuesta de IA activa en esta tarea.',
  'A document cannot succeed itself.': 'Un documento no puede sucederse a sí mismo.',
  'Succession is scope-based: a successor must be a newer version of the SAME convenio. Different-convenio documents coexist and are never succession candidates.':
    'La sucesión es por ámbito: un sucesor debe ser una versión más reciente del MISMO convenio. Los documentos de convenios distintos coexisten y nunca son candidatos a sucesión.',
  'Retiring the predecessor changes which employees receive it as an answer. Re-send with retire_predecessor=true and confirm_scope_change=true to apply.':
    'Retirar el predecesor cambia qué empleados lo reciben como respuesta. Vuelve a enviar con retire_predecessor=true y confirm_scope_change=true para aplicar.',
  'Re-suggest applies only to a document still under review (an AI proposal is inert and never re-tags an already-verified document).':
    'Re-sugerir solo aplica a un documento aún en revisión (una propuesta de IA es inerte y nunca vuelve a etiquetar un documento ya verificado).',
  'This changes which employees receive this document as an answer. Re-send with confirm_scope_change=true to apply.':
    'Esto cambia qué empleados reciben este documento como respuesta. Vuelve a enviar con confirm_scope_change=true para aplicar.',
  'Value not found in controlled vocabulary.': 'Valor no encontrado en el vocabulario controlado.',
  'No image for this page.': 'No hay imagen para esta página.',
  'No source file for this document.': 'No hay archivo fuente para este documento.',
  'Topic not found in the approved vocabulary.': 'Tema no encontrado en el vocabulario aprobado.',
  'Topic already applied.': 'Tema ya aplicado.',
  'Topic is not applied to this document.': 'El tema no está aplicado a este documento.',
  'This changes the scope of the fact (which employees it would answer). Re-send with confirm_scope_change=true to apply.':
    'Esto cambia el ámbito del hecho (a qué empleados respondería). Vuelve a enviar con confirm_scope_change=true para aplicar.',
  'A verified fact cannot be rejected; edit or re-verify instead.':
    'Un hecho verificado no puede rechazarse; edítalo o vuelve a verificarlo.',
  'failure_kind is required when verdict is not "correct".':
    'failure_kind es obligatorio cuando el veredicto no es "correct".',
  'Propose-and-approve requires the vocabulary.approve ability (super_admin). You may propose; a super_admin approves.':
    'Proponer-y-aprobar requiere la capacidad vocabulary.approve (super_admin). Puedes proponer; un super_admin aprueba.',
};

export function translateBackendMessage(message: string, locale: Locale): string {
  if (locale !== 'es') return message;
  return BACKEND_MESSAGE_MAP[message] ?? message;
}

/** Module-level locale reader for non-React call sites (`api.ts`). Same key as LocaleProvider. */
export function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY);
    return v === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

/** Network/HTTP fallback strings from `es.errors` / inline EN (plan.md §A.2). */
export function networkFallbackMessage(
  kind: 'requestFailed' | 'uploadFailed',
  status: number,
  locale: Locale = readStoredLocale(),
): string {
  const template =
    locale === 'en' ? EN_NETWORK_FALLBACKS[kind] : es.errors[kind];
  return template.replace('{status}', String(status));
}
