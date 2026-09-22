// Sprint 11a (§E.2, §G.3 Q6) — static, deterministic welcome-screen prompts
// for the employee chat's empty state. Pedram's exact final five (overriding
// this plan's original corpus-gap-based substitution): permisos/jornada are
// back in (the mis-chunking defect this plan cited as a reason to exclude
// permisos already shipped in Sprint 10a), "¿Cuánto preaviso...?" is dropped
// (flagged as a known-escalating question in that sprint's eval), and nómina
// stays out. A plain array, not a component prop default, so a future change
// is a one-line edit here — never a prompt engineers hunt for inside JSX.
export const SUGGESTED_QUESTIONS: string[] = [
  '¿Cuántos días de vacaciones me corresponden al año?',
  '¿Cuántos días de permiso tengo por matrimonio?',
  '¿Cuánto dura el periodo de prueba en mi convenio?',
  '¿Cuál es mi jornada anual?',
  'Quiero hablar con una persona de Recursos Humanos',
];
