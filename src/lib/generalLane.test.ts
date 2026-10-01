import { describe, expect, it } from 'vitest';
import { es } from '../i18n/es';
import { en } from '../i18n/en';
import { generalLaneBasis, isGeneralLaneAnswer, stripGeneralLaneCaveat } from './generalLane';

// Slice 13c (plan.md §2.5). The two caveats are hand-copied from hr-backend (`ChatService::GENERAL_LANE_CAVEAT` and
// `GENERAL_LANE_MODEL_CAVEAT`); the strings here are copied again on purpose, so a one-sided edit fails this test.
const WEB_CAVEAT = '\n\nInformación general — no procede de tu convenio ni de la normativa cargada.';
const MODEL_CAVEAT =
  '\n\nInformación general, redactada sin consultar tu convenio ni la normativa cargada y sin una fuente verificable. ' +
  'No describe lo que se te aplica a ti: consúltalo en tu convenio o con Recursos Humanos.';
const DRAFT = 'La excedencia es una situación de suspensión del contrato. Consulta tu convenio o a Recursos Humanos.';

describe('stripGeneralLaneCaveat', () => {
  it('strips the web caveat', () => {
    expect(stripGeneralLaneCaveat(DRAFT + WEB_CAVEAT)).toBe(DRAFT);
  });

  it('strips the model-knowledge caveat', () => {
    expect(stripGeneralLaneCaveat(DRAFT + MODEL_CAVEAT)).toBe(DRAFT);
  });

  it('strips only the trailing caveat, and only an exact one', () => {
    expect(stripGeneralLaneCaveat(WEB_CAVEAT + ' ' + DRAFT)).toBe(WEB_CAVEAT + ' ' + DRAFT);
    expect(stripGeneralLaneCaveat(DRAFT)).toBe(DRAFT);
    expect(stripGeneralLaneCaveat(DRAFT + MODEL_CAVEAT.replace('verificable', 'verificada'))).toContain('verificada');
  });

  it('does not strip a caveat that has been stacked twice (the persisted text is never doubled, and we do not hide it if it is)', () => {
    expect(stripGeneralLaneCaveat(DRAFT + WEB_CAVEAT + WEB_CAVEAT)).toBe(DRAFT + WEB_CAVEAT);
  });
});

describe('generalLaneBasis / isGeneralLaneAnswer', () => {
  it('reads the declared basis; an absent one (a pre-13c turn) is a web answer', () => {
    expect(generalLaneBasis({ basis: 'model_knowledge' })).toBe('model_knowledge');
    expect(generalLaneBasis({ basis: 'web' })).toBe('web');
    expect(generalLaneBasis({})).toBe('web');
    expect(generalLaneBasis(undefined)).toBe('web');
  });

  it('a lane answer is recognised by its authority', () => {
    expect(isGeneralLaneAnswer(['general_knowledge'])).toBe(true);
    expect(isGeneralLaneAnswer(['official_convenio'])).toBe(false);
    expect(isGeneralLaneAnswer(undefined)).toBe(false);
  });
});

describe('the chip per basis (both dictionaries)', () => {
  it('has a distinct, non-empty chip for the model-knowledge basis', () => {
    expect(es.chat.generalLaneBadgeModel).toBe('Información general · sin fuente verificada');
    expect(en.chat.generalLaneBadgeModel).toBe('General information · no verified source');
    expect(es.chat.generalLaneBadgeModel).not.toBe(es.chat.generalLaneBadge);
    expect(en.chat.generalLaneBadgeModel).not.toBe(en.chat.generalLaneBadge);
  });
});
