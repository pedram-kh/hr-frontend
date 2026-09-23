import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Sprint 11b (plan.md §A.3 / §2 boundary) — the §2 guard test. The eight
// backend-produced constants below are content, not chrome: this sprint's
// absolute boundary is that none of them is ever translated, wrapped in
// `t()`, or copy-pasted into a dictionary file. This test asserts the
// STRONGER, more mechanical version plan.md §A.3 describes: the exact text
// of each constant never appears verbatim in `es.ts`/`en.ts` at all — that
// catches a copy-paste into a dictionary just as surely as a `t()`-wrapping
// attempt would be caught by code review.
//
// Values are HAND-COPIED from `hr-backend` (not read from it at test time)
// — same trade-off `statusLabels.test.ts` already documents for its own
// backend-sourced fixture lists ("hand-copied... a real trade-off: this
// guard only re-checks a copy against a copy"). `hr-frontend` and
// `hr-backend` are separate git repositories (confirmed while building this
// sprint); a cross-repo file read at test time would make this test fail to
// even RUN in a checkout that only has `hr-frontend`, which is worse than
// the copy-drift risk it would avoid. If one of these constants' wording
// ever changes in `hr-backend`, this fixture list needs a manual update —
// exactly the same maintenance burden `statusLabels.test.ts` already
// accepts for the label maps it guards.
const PROTECTED_STRINGS: Array<{ name: string; citation: string; value: string }> = [
  {
    name: 'ChatService::FALLBACK_CAVEAT',
    citation: 'hr-backend/app/Services/ChatService.php:86-90',
    value:
      'Esta respuesta se basa en el Estatuto de los Trabajadores, que establece los ' +
      'mínimos legales para cualquier persona trabajadora. Tu convenio colectivo puede ' +
      'mejorar estas condiciones (nunca empeorarlas). Para confirmar lo que se aplica en ' +
      'tu caso concreto, consulta con Recursos Humanos.',
  },
  {
    name: 'ChatService::ESCALATION_MESSAGE',
    citation: 'hr-backend/app/Services/ChatService.php:46-47',
    value:
      'No estoy seguro de la respuesta a esta pregunta, ' +
      'así que la estoy pasando a una persona del equipo de Recursos Humanos.',
  },
  {
    name: 'ChatService::EMPLOYEE_ESCALATION_MESSAGE',
    citation: 'hr-backend/app/Services/ChatService.php:62-63',
    value: 'Un/a compañero/a de Recursos Humanos revisará tu consulta y te responderá.',
  },
  {
    name: 'ChatService::AGGREGATION_MESSAGE',
    citation: 'hr-backend/app/Services/ChatService.php:93-97',
    value:
      'Para darte una cifra fiable necesito que me preguntes por un ' +
      'tipo concreto de días libres (por ejemplo, las vacaciones, los días de asuntos propios o un ' +
      'permiso específico). Sumar todos los tipos en un único "total" no es un dato que pueda ' +
      'fundamentar con exactitud en tu convenio, así que te derivo con una persona del equipo de ' +
      'Recursos Humanos.',
  },
  {
    name: 'ChatService::CROSSPATH_MESSAGE',
    citation: 'hr-backend/app/Services/ChatService.php:100-103',
    value:
      'Tu pregunta combina dos cosas: la parte salarial puedo ' +
      'consultarla en las tablas, pero también preguntas por otro tema (por ejemplo, las vacaciones) ' +
      'que necesita una persona del equipo de Recursos Humanos. Te derivo para que te respondan ambas ' +
      'partes correctamente.',
  },
  {
    name: 'ChatService::COMPOSITION_CONFLICT_MESSAGE',
    citation: 'hr-backend/app/Services/ChatService.php:111-114',
    value:
      'Sobre este tema tengo un dato de referencia y también ' +
      'lo que dice tu convenio, y no coinciden. Como tu convenio es el que manda, no quiero darte una ' +
      'cifra mezclada o equivocada: te derivo con una persona del equipo de Recursos Humanos para que ' +
      'te lo confirme con exactitud.',
  },
  {
    name: 'ChatService::STATUTORY_SALARY_MESSAGE',
    citation: 'hr-backend/app/Services/ChatService.php:123-126',
    value:
      'El SMI (salario mínimo interprofesional) es una cifra ' +
      'legal general que fija el Estado, no un dato de tu tabla salarial estructurada — no quiero ' +
      'confirmártelo desde aquí con una cifra que no sea la tuya. Te derivo con una persona del ' +
      'equipo de Recursos Humanos.',
  },
  {
    name: 'SalaryAnswerService::COVERAGE_GAP_MESSAGE',
    citation: 'hr-backend/app/Services/SalaryAnswerService.php:54-56',
    value:
      'Todavía no tengo tu tabla salarial para ese año o esa ' +
      'categoría en mi base de datos estructurada, y no quiero darte una cifra que no pueda ' +
      'confirmar de forma exacta. Te derivo con una persona del equipo de Recursos Humanos.',
  },
];

const I18N_DIR = dirname(fileURLToPath(import.meta.url));
const DICT_FILES = ['es.ts', 'en.ts'];

describe('§2 guard — no backend-produced constant ever appears in a dictionary file', () => {
  for (const dictFile of DICT_FILES) {
    const source = readFileSync(join(I18N_DIR, dictFile), 'utf8');
    for (const { name, citation, value } of PROTECTED_STRINGS) {
      it(`${dictFile} does not contain ${name} (${citation})`, () => {
        expect(source.includes(value), `${dictFile} contains ${name}'s exact text verbatim — §2 boundary violation`).toBe(false);
      });
    }
  }

  // `suggestedQuestions.ts` (plan.md §A.3's frontend §2 carve-out, spec §2's
  // welcome-questions exception) — stays Spanish-only regardless of UI
  // locale. Not a "never appears in a dictionary" check like the eight
  // constants above (it's frontend content, not backend), but the same
  // boundary: it must never be run through `t()` / duplicated into `en.ts`
  // as if it were translatable chrome.
  it('SUGGESTED_QUESTIONS never appears in en.ts (it is Spanish-only content, not translated chrome)', () => {
    // Imported dynamically (not a hand-copied fixture): unlike the backend
    // constants, this file lives in `hr-frontend` itself, so there is no
    // cross-repo coupling risk in reading it directly.
    const suggested = readFileSync(join(I18N_DIR, '../lib/suggestedQuestions.ts'), 'utf8');
    const enSource = readFileSync(join(I18N_DIR, 'en.ts'), 'utf8');
    const questionLines = suggested
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith("'") || l.startsWith('"'));
    for (const line of questionLines) {
      expect(enSource.includes(line), `en.ts contains a line from SUGGESTED_QUESTIONS verbatim: ${line}`).toBe(false);
    }
  });
});
