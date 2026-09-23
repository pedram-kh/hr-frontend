// Sprint 11b (plan.md §B.5) — es.ts is the SOURCE OF TRUTH. `en.ts` is a
// human-reviewed mirror typed against this file's shape (`typeof es`), so a
// missing or stray English key is a `tsc -b` failure, not a silent runtime
// gap (§B.4.2) — no library, no codegen.
//
// Namespaced by area, mirroring the per-area breakdown in plan.md §A.1 so
// the file's own structure documents where each string renders. Only the
// CP-1 slice (plan.md §C.9 step 4 — AdminShell's sidebar/shell chrome +
// DirectoryPage) has real content below; every other namespace is an
// empty-but-typed placeholder, filled in area by area per the build order
// (steps 6-8) so `en.ts`'s `: typeof es` stays satisfiable at every commit.
//
// §2 boundary: nothing in this file may ever contain the text of a
// backend-produced constant (ChatService.php / SalaryAnswerService.php's
// caveat/escalation/coverage-gap messages) — enforced by
// `protectedStrings.test.ts`, not just convention.
export const es = {
  common: {
    // Populated as shared cross-page strings are found during extraction
    // (steps 6-8). Several of these are ALREADY English in today's live
    // Spanish UI (a pre-existing mixed-language spot, same category as
    // `adminShell.logout`'s "Log out" at CP-1) — preserved verbatim here
    // rather than "fixed" into proper Spanish, since this sprint's scope is
    // extraction + a real toggle, not an unreviewed content rewrite of
    // strings nobody asked to change. Each flagged inline where it applies.
    close: 'Cerrar',
    cancel: 'Cancelar',
    save: 'Guardar',
    loading: 'Cargando…',
    error: 'Error',
    convenio: 'Convenio',
    confianza: 'confianza',
    validity: 'Validity', // already English live (DocumentDetailPanel.tsx:255 etc.) — preserved, see comment above
    territory: 'Territory', // same as `validity` above
    sector: 'Sector', // same word both languages
    type: 'Type', // already English live
    topic: 'Topic', // already English live
    dash: '—',
    jobCategory: 'Job category', // already English live (ReferenceFactPanel.tsx, GroupsQueue.tsx)
  },

  // AdminShell.tsx — the shell chrome around every admin view: sidebar nav
  // groups/items, the collapse/mobile-menu controls, the footer, and the
  // per-view heading+description pairs the shell itself renders (34 matches,
  // plan.md §A.1's per-area table).
  adminShell: {
    groups: {
      conocimiento: 'Conocimiento',
      atencion: 'Atención',
      analisis: 'Análisis',
      personas: 'Personas',
      gobierno: 'Gobierno',
    },
    nav: {
      mapa: 'Mapa',
      documentos: 'Documentos',
      revision: 'Revisión',
      escalaciones: 'Escalado',
      historial: 'Historial',
      analitica: 'Analítica',
      cobertura: 'Cobertura',
      calidad: 'Calidad',
      directorio: 'Directorio',
      administradores: 'Administradores',
      guardrails: 'Guardrails',
      ajustes: 'Ajustes',
    },
    collapseMenu: 'Colapsar menú',
    expandMenu: 'Expandir menú',
    openMobileMenu: 'Abrir menú',
    closeMobileMenu: 'Cerrar menú', // also used by EmployeeShell.tsx's identical hamburger toggle
    // "Log out" is kept verbatim in `en.ts` too — it's already English in
    // today's source (AdminShell.tsx:277-281) despite the surrounding
    // Spanish chrome, one of the §0/finding-2 mixed-language spots this
    // sprint is meant to resolve into one deliberate choice per locale, not
    // an oversight carried over silently. Recorded in review.md.
    logout: 'Log out',
    // `heading` is stored verbatim per view rather than composed from
    // `groups`/`nav` above: four of these (history, admins, guardrails,
    // settings) genuinely differ from their nav-label text today
    // ("Guardarraíles" vs. the nav's "Guardrails", "Answer model" vs.
    // "Ajustes", etc.) — one more instance of plan.md §0's "already a
    // Spanish/English mix, inconsistently" finding, preserved exactly
    // rather than silently normalized away during extraction.
    views: {
      map: {
        heading: 'Conocimiento · Mapa',
        description:
          'Navigate the corpus by lens, spot coverage gaps, and open a document to inspect, test, or edit its labels.',
      },
      documents: {
        heading: 'Conocimiento · Documentos',
        description: 'Sube carpetas de convenios, revisa el etiquetado automático, resuelve conflictos y confirma.',
      },
      review: {
        heading: 'Conocimiento · Revisión',
        description:
          'Las colas de la cola larga: propuestas de etiquetado por IA para verificar, propuestas de vocabulario para aprobar y documentos próximos a vencer para sucesión. La fucsia marca contenido de IA sin verificar.',
      },
      escalations: {
        heading: 'Atención · Escalado',
        description:
          'Gestiona preguntas escaladas: asigna, responde al empleado y resuelve — opcionalmente publicando la respuesta como conocimiento reutilizable.',
      },
      analytics: {
        heading: 'Análisis · Analítica',
        // Split at the `<code>` command-name spans (kept as literal,
        // untranslated JSX in AdminShell.tsx — a CLI command name is
        // invariant across locale, not chrome; see the guard test's
        // `ALLOWED_HARDCODED_STRINGS` entries for `stats:*`/`questions:cluster`).
        description: 'Deflection, escalaciones por corrección y agrupación de preguntas — todo reproducible desde los comandos',
      },
      coverage: {
        heading: 'Análisis · Cobertura',
        description: 'La rejilla convenio × (prosa, salario, datos, resoluciones) — la misma consulta que',
      },
      quality: {
        heading: 'Análisis · Calidad',
        descriptionBeforeCode: 'Muestra mensual estratificada de turnos respondidos (',
        descriptionBetweenCodes: '). Lectura abierta a cualquier admin; marcar una muestra requiere',
      },
      directory: {
        heading: 'Personas · Directorio',
        description:
          'Gestiona el alta y los datos de las personas (convenio, territorio, categoría). Cada cambio queda auditado; importa en bloque por CSV.',
      },
      history: {
        heading: 'Atención · Histórico de conversaciones',
        description:
          'Consulta y busca las conversaciones de toda la organización (solo lectura). Cada apertura queda registrada en el registro de accesos.',
      },
      admins: {
        heading: 'Personas · Administradores y roles',
        description: 'Crea administradores, asigna los cuatro roles y desactiva cuentas (la desactivación retira el acceso de inmediato).',
      },
      guardrails: {
        heading: 'Gobierno · Guardarraíles',
        description:
          'Ajusta la capa configurable sobre la base de seguridad fija. Solo puede endurecer, nunca debilitar: el servidor aplica siempre el valor más estricto y rechaza cualquier valor por debajo del mínimo. Escritura solo para super_admin; auditor en solo lectura.',
      },
      settings: {
        heading: 'Gobierno · Answer model',
        description: 'Configure the external answer-model provider key (ADR-0015).',
      },
      brandPreview: {
        heading: 'Brand preview (CP-1 — sprint-11a)',
        description: 'Not in the nav — reachable only via #view=brand-preview. See sprint-11a/plan.md §G.1 step 3.',
      },
    },
  },

  // DirectoryPage.tsx — the employee directory list + create/edit drawer
  // (53 matches, plan.md §A.1's per-area table).
  directory: {
    searchPlaceholder: 'Buscar por nombre o correo…',
    searchAriaLabel: 'Buscar empleados',
    filterConvenioAriaLabel: 'Filtrar por convenio',
    filterStatusAriaLabel: 'Filtrar por estado',
    allConvenios: 'Todos los convenios',
    allStatuses: 'Activos e inactivos',
    activePlural: 'Activos',
    inactivePlural: 'Inactivos',
    newEmployee: 'Nuevo empleado',
    hideImport: 'Ocultar importación',
    importCsv: 'Importar CSV',
    loading: 'Cargando…',
    colName: 'Nombre',
    colEmail: 'Correo',
    colConvenio: 'Convenio',
    colTerritory: 'Territorio',
    colCategory: 'Categoría',
    colGroup: 'Grupo',
    colStatus: 'Estado',
    colReview: 'Revisión',
    dash: '—',
    noGroup: 'sin grupo',
    statusActive: 'Activo',
    statusInactive: 'Inactivo',
    notReviewed: 'Sin revisar',
    noMatches: 'No hay empleados que coincidan.',
    drawer: {
      ariaLabel: 'Empleado',
      newTitle: 'Nuevo empleado',
      defaultTitle: 'Empleado',
      close: 'Cerrar',
      loading: 'Cargando…',
      fullNameLabel: 'Nombre completo',
      emailLabel: 'Correo (clave de acceso)',
      emailChangeWarning: 'Cambiar el correo cambia cómo inicia sesión esta persona. Se pedirá confirmación explícita.',
      convenioLabel: 'Convenio',
      choose: 'Selecciona…',
      jobCategoryLabel: 'Categoría profesional',
      chooseConvenioFirst: 'Elige primero un convenio',
      noCategory: 'Sin categoría',
      convenioGroupLabel: 'Grupo del convenio',
      noGroupsApproved: 'Este convenio no tiene grupos aprobados',
      noGroupOption: 'Sin grupo',
      groupSuggestedNotice: 'Sugerido a partir de la categoría — confírmalo. Nada se guarda hasta que envíes el formulario.',
      groupNotSuggestedNotice:
        'Sin grupo, las respuestas que dependan del grupo se derivarán a una persona de RRHH en lugar de arriesgar un dato incorrecto.',
      territoryLabel: 'Territorio',
      employmentTypeLabel: 'Tipo de jornada',
      fullTime: 'Completa',
      partTime: 'Parcial',
      workLocationLabel: 'Centro de trabajo',
      externalIdLabel: 'ID externo',
      statusLabel: 'Estado',
      inactiveHint: 'Inactivo (no podrá iniciar sesión ni chatear)',
      saving: 'Guardando…',
      createEmployee: 'Crear empleado',
      saveChanges: 'Guardar cambios',
      reviewTitle: 'Revisión del perfil',
      neverReviewed: 'Nunca revisado.',
      lastReviewedPrefix: 'Revisado por última vez el',
      lastReviewedNote: 'Editar no cuenta como revisar: es una atestación explícita.',
      markReviewed: 'Marcar como revisado',
      historyTitle: 'Historial de cambios',
      noChangesRecorded: 'Sin cambios registrados.',
      created: 'creado',
      confirmEmailChange: {
        ariaLabel: 'Confirmar cambio de correo',
        title: '¿Cambiar el correo de acceso?',
        bodyPrefix: 'El correo es la clave de inicio de sesión. Vas a cambiarlo de',
        bodyMiddle: 'a',
        bodySuffix: 'La persona iniciará sesión con el nuevo correo. El cambio queda registrado.',
        cancel: 'Cancelar',
        confirm: 'Confirmar cambio',
      },
    },
  },

  // DocumentDetailPanel.tsx — the right-hand document detail card: scope
  // facets, notices, AI-suggestion review, topics, chunk health, lineage,
  // provenance timeline, source viewer, sandbox, page viewer (98 matches,
  // plan.md §A.1). Much of this file is ALREADY English in today's live
  // Spanish UI — each such string is flagged and preserved verbatim per
  // the mixed-language precedent (`common`'s comment above), not silently
  // rewritten into proper Spanish.
  documentDetail: {
    close: 'Close', // already English live
    loadingTitle: 'Loading…', // already English live
    confirmFailedPrefix: 'Confirm failed: ', // already English live
    scanNoTextNotice: 'No extractable text — this is a scan PDF. AI tagging requires a text layer.', // already English live
    hrRulingBadge: 'Resolución RR. HH.',
    ocrdBadge: "OCR'd", // already English live
    createdFromEscalation: 'Creada desde la escalación',
    byAgent: 'por',
    viewCard: 'Ver la tarjeta →',
    readOnlyPrefix: "Read-only — you don't have the", // already English live
    readOnlySuffix: 'ability. You can browse, inspect, and run the sandbox.', // already English live
    noConvenioNotice:
      "No convenio — this document carries no scope (scope is derived via the convenio), so employees won't receive it as an answer.", // already English live
    noTextOcrPrefix: 'No extractable text — this looks like a scanned, image-only PDF. Run', // already English live
    noTextOcrMiddle: '(Sprint 7e, ADR-0026) to OCR it, or re-ingest with', // already English live
    suspectedMistagPrefix: 'Suspected salary-table mistag: tagged as convenio prose but named like a table.', // already English live
    suspectedMistagEditHint: 'Use "Re-type document" below → Tablas salariales.', // already English live; "Tablas salariales" is a real backend vocabulary item name (OQ-2 — data, not chrome), kept as-is regardless of locale
    suspectedMistagNoEditHint: 'A knowledge editor can retag this.', // already English live
    aiTaggingUnverified: 'Unverified AI tagging —', // already English live
    aiTaggingInert: 'inert',
    aiTaggingUntilConfirm: 'until you confirm.',
    aiTaggingStep1Label: 'Step 1:',
    aiTaggingStep1Text: 'review the fuchsia suggestions below; use the edit pickers to accept or correct the convenio, type, and validity.', // already English live
    aiTaggingStep2Label: 'Step 2:',
    aiTaggingStep2Click: 'click',
    confirmTagsButton: 'Confirm tags', // already English live
    aiTaggingStep2Suffix: '— that writes the scope and makes the document retrievable.', // already English live
    derivedLabel: 'derived', // already English live
    derivedTitleHint: 'Derived from the convenio — not editable', // already English live
    removedLabel: 'removed', // already English live
    scopeHeading: 'Scope', // already English live
    kvRetrieval: 'Retrieval', // already English live
    kvAuthority: 'Authority', // already English live
    kvLanguage: 'Language', // already English live
    kvStatus: 'Status', // already English live
    reviewTasksHeading: 'Review tasks', // already English live
    tagsConfirmed: 'Tags confirmed ✓', // already English live
    resuggestButton: 'Re-suggest with AI', // already English live
    proposing: 'Proposing…', // already English live
    resuggestTitleNoText: 'No extractable text — scan PDF, cannot AI-tag', // already English live
    resuggestTitleReady: 'Re-run the AI tagging proposal (queued)', // already English live
    provenanceHeading: 'Provenance', // already English live
    adminHashPrefix: 'admin #', // already English live
    aiSuggestedHeading: 'Suggested facets',
    aiSuggestedUnverified: '(unverified)', // already English live
    aiUnresolvedNotice: 'The AI couldn\u2019t resolve a facet — see the flagged values below.', // already English live
    aiSuggestionsNotChanged: 'These are suggestions only — they have NOT changed the document\u2019s scope.', // already English live
    aiSuggestionsEditHint: 'Adjust below if needed, then Confirm tags to verify (the human write).', // already English live
    aiSuggestionsNoEditHint: 'A knowledge editor verifies them.', // already English live
    proposeVocabulary: 'Propose vocabulary', // already English live
    cancelPropose: 'Cancel', // already English live
    topicsHeading: 'Topics', // already English live
    noTopicsNotice: 'No topics tagged yet — topic tagging arrives with the AI tier (Sprint 7); a human can tag now.', // already English live
    removeTopicAriaPrefix: 'Remove', // already English live
    addTopicPlaceholder: 'Add a topic…', // already English live
    addTopicButton: 'Add topic', // already English live
    chunkHealthHeading: 'Chunk health', // already English live
    zeroChunksNotice: 'Zero chunks — this document is not retrievable (unanswerable until re-chunked; re-chunking is not a Knowledge-Center action).',
    chunksLabel: 'Chunks', // already English live
    tokensLabel: 'Tokens', // already English live
    pagesLabel: 'Pages', // already English live
    embeddingsLabel: 'Embeddings', // already English live
    embeddingsPresent: 'present', // already English live
    embeddingsMissing: 'missing', // already English live
    lineageHeading: 'Lineage', // already English live
    lineageSupersedes: 'supersedes', // already English live
    lineageSupersededBy: 'superseded by', // already English live
    editLabelsHeading: 'Edit labels', // already English live
    editLabelsNotice:
      'Bounded edit (FK pickers into existing vocabulary). Territory & sector are derived from the convenio and not editable. Every save appends append-only human provenance.', // already English live
    rescopeConvenio: 'Re-scope convenio', // already English live
    retypeDocument: 'Re-type document', // already English live
    selectValuePlaceholder: 'Select a value…', // already English live
    retagButton: 'Retag', // already English live
    applyButton: 'Apply', // already English live
    rescopeConfirmTitle: 'Re-scope this document?', // already English live
    retypeConfirmTitle: 'Re-type to a salary table?', // already English live
    rescopeConfirmBody:
      'Changing the convenio changes the document\u2019s derived territory + sector — i.e. which employees receive it as an answer. This appends human provenance and cannot rewrite history.', // already English live
    retypeConfirmBody:
      'Marking this as a salary table moves it off the prose answer path onto the structured salary (SQL) path, and removes it from convenio-prose retrieval. This appends human provenance.', // already English live
    retrievalFieldLabel: 'Retrieval', // already English live
    taggingFieldLabel: 'Tagging', // already English live
    validFromLabel: 'Valid from', // already English live
    validToLabel: 'Valid to', // already English live
    saveLifecycle: 'Save lifecycle', // already English live
    scopeAffectingSuffix: '(scope-affecting)', // already English live
    scopeAffectingModalTitle: 'Scope-affecting change', // already English live
    scopeAffectingModalBody:
      'Changing the retrieval status or validity window moves the eligibility window — which employees receive this document as an answer. This appends human provenance and cannot rewrite history.', // already English live
    confirmChangeButton: 'Confirm change', // already English live
    originalDocumentHeading: 'Original document', // already English live
    hideSource: 'Hide source', // already English live
    viewOriginal: 'View original', // already English live
    cantEmbedPrefix: 'Can\u2019t embed inline —', // already English live
    openTheFile: 'open the file', // already English live
    downloadOrOpen: 'Download / open the original file', // already English live
    sandboxHeading: 'Sandbox', // already English live
    sandboxTag: 'read-only · persists nothing', // already English live
    sandboxRunPrefix: 'Run the answer pipeline against',
    sandboxRunSuffix: 'only. Same gates as production; no chat, no escalation is saved.', // already English live
    sandboxPlaceholder: '\u00bfcu\u00e1ntos d\u00edas de vacaciones tengo?',
    testButton: 'Test', // already English live
    running: 'Running…', // already English live
    outcomeAnswered: 'Respondida',
    outcomeEscalated: 'Escalada',
    outcomeResult: 'result', // already English live
    retrievedPrefix: 'retrieved', // already English live
    topScorePrefix: 'top', // already English live
    pageAbbr: 'p.',
    draftSummary: 'Draft the model produced (not served)', // already English live
    groundingStoppedPrefix: 'Stopped by the grounding gate — ungrounded:', // already English live
    sourcePagesHeading: 'Source pages', // already English live
    pagerPrev: '← Anterior',
    pagerNext: 'Siguiente →',
    pageCounter: 'Página',
    pageCounterOf: 'de',
    ocrExtractedText: 'Texto obtenido por OCR',
    ocrQualityPrefix: 'calidad',
    ocrBilingualNotice: 'Página bilingüe — revisa también la columna en euskera frente a la columna en castellano.',
    loadingImage: 'Cargando imagen…',
    pageAlt: 'Página',
    noImage: '(sin imagen)',
    noExtractableText: '(sin texto extraíble)',
  },

  // ReviewQueuePage.tsx — the five review-surface tabs: AI tagging backlog,
  // reference facts, groups (rendered by GroupsQueue.tsx separately),
  // vocabulary proposals, expiry/succession (77 matches, plan.md §A.1).
  // Mixed-language like documentDetail above — flagged inline.
  reviewQueue: {
    tabTagging: 'AI tagging', // already English live
    tabReferenceFacts: 'Reference facts', // already English live
    tabGroups: 'Groups', // already English live
    tabVocabulary: 'Vocabulary proposals', // already English live
    tabExpiry: 'Expiry', // already English live
    facts: {
      intro:
        'Reference facts awaiting verification — AI-segmented or manually created —', // already English live
      introUncertainFirst: 'uncertain-first',
      introRest:
        ', then lowest-confidence, then (ties only) topic demand (a manual fact carries neither signal, so it falls to the bottom of its tier). Inert until a human verifies, whichever source it came from. Open one to check the source (the quoted line for an AI proposal, fuchsia; the linked document for a manual fact) against the assigned scope.', // already English live
      allTopics: 'All topics', // already English live
      colId: 'Id', // already English live
      colValue: 'Value', // already English live
      colSource: 'Source', // already English live
      colScope: 'Scope', // already English live
      colGroup: 'Group', // already English live
      colTopic: 'Topic', // already English live
      colConf: 'Conf.', // already English live
      colFlags: 'Flags', // already English live
      manualBadge: 'Manual', // already English live
      versionBadge: 'version',
      resolveVersion: 'Resolver versión',
      noFacts: 'No facts awaiting review — the queue is clear.', // already English live
      totalOne: 'fact', // already English live
      totalMany: 'facts', // already English live
    },
    tagging: {
      introPrefix: 'Documents', // already English live
      underReview: 'under_review',
      introSuffix:
        '— not retrievable until verified. The AI auto-proposes facets on ingest; lowest-confidence first. Open one to review the (fuchsia) AI suggestions and Confirm.', // already English live
      colTitle: 'Title', // already English live
      colConvenio: 'Convenio',
      colType: 'Type', // already English live
      colConfidence: 'Confidence', // already English live
      colFlags: 'Flags', // already English live
      conflictBadge: 'Conflict', // already English live
      noTextBadge: 'No text', // already English live
      nothingUnderReview: 'Nothing under review — the queue is clear.', // already English live
      totalOne: 'document', // already English live
      totalMany: 'documents', // already English live
    },
    vocabulary: {
      introPrefix:
        'Proposed vocabulary (variant→alias is the default; create-new is deliberate). Approving writes into the controlled vocabulary — gated by', // already English live
      introSuffix: '(super_admin). The AI proposes only.', // already English live
      noProposals: 'No open vocabulary proposals.', // already English live
      looksLikePrefix: '· looks like #', // already English live
      proposedByPrefix: 'proposed by', // already English live
      fromDocumentPrefix: '· from', // already English live
      reject: 'Reject', // already English live
      awaitingApproval: 'Awaiting a super_admin to approve.', // already English live
      totalOne: 'proposal', // already English live
      totalMany: 'proposals', // already English live
    },
    expiry: {
      intro: 'Active prose within 90 days of expiry (or already past). Confirm a successor (same convenio only) to write the lineage —', // already English live
      introOldDocIs: '— the old document is', // already English live
      introNeverRetired: 'never auto-retired',
      introSuffix: '.', // already English live
      nothingExpiringPrefix: 'Nothing expiring — the queue is clear. (Run', // already English live
      nothingExpiringSuffix: 'to refresh.)', // already English live
      totalOne: 'task', // already English live
      totalMany: 'tasks', // already English live
      pastBadge: 'Past', // already English live
      noConvenio: 'no convenio', // already English live
      validPrefix: 'valid', // already English live
      noSuggestion: 'Sin sugerencia de sucesión:',
      retry: 'Reintentar',
      aiRejectedNotice: 'Sugerencia de IA rechazada — sin efecto sobre el documento.',
      relationshipLabels: {
        successor: 'Sucesor propuesto',
        conflict: 'Posible conflicto (no sucesión)',
        coexistingSibling: 'Documentos que coexisten (no sucesión)',
        uncertain: 'Sin relación afirmada',
      },
      unverifiedNotWritten: '— sin verificar, no se ha escrito nada.',
      candidatePrefix: 'Candidato:',
      overlapPrefix: '· solapamiento',
      thisDocumentPrefix: 'este documento',
      candidatePairPrefix: 'candidato',
      strictlyLaterSuffix: '(vigencia estrictamente posterior)',
      thisDocumentLabel: 'Este documento',
      candidateScorePrefix: 'Candidato ·',
      confirmSuccession: 'Confirmar esta sucesión',
      rejectSuggestion: 'Rechazar sugerencia',
      noSuccessionHint: 'La IA no propone una sucesión aquí; si crees que la hay, elígela abajo a mano.',
      linkedSuccessorRetired: 'Enlazado el sucesor y se retiró el documento antiguo.',
      linkedSuccessorKept: 'Enlazado el sucesor (el documento antiguo sigue activo).',
      dismissed: 'Descartado.',
      escalatedForAdjudication: 'Escalado para adjudicación.',
      aiRejectedTaskOpen: 'Sugerencia de IA rechazada — no se ha escrito ninguna relación; la tarea sigue abierta.',
      queuedForComparison: 'Comparación en cola — vuelve a cargar en unos segundos.',
      noConvenioSuccessionNotice: 'No convenio — succession is scope-based, so no same-convenio successor can be linked. Dismiss or escalate.', // already English live
      pickSuccessor: 'Pick the successor (same convenio)…', // already English live
      alsoRetire: 'Also retire this one (historical)', // already English live
      confirmSuccessionRetire: 'Confirm succession + retire', // already English live
      confirmSuccessionButton: 'Confirm succession', // already English live
      dismissAction: 'Dismiss (renewed in place / no action)', // already English live
      escalateAction: 'Escalate', // already English live
    },
  },

  // EscalationCardDrawer.tsx — the card-scoped detail drawer: conversation +
  // trace, triage (assign/move), the AI/deterministic explanation block,
  // reply, resolve/publish-as-knowledge, activity log (68 matches, plan.md
  // §A.1). Almost entirely Spanish source text (unlike documentDetail/
  // reviewQueue above) — straight translation, no mixed-language flags.
  escalationCard: {
    statusLabels: {
      new: 'Nueva',
      assigned: 'Asignada',
      in_progress: 'En curso',
      resolved: 'Resuelta',
      closed: 'Cerrada',
    },
    error: 'Error',
    close: 'Cerrar',
    loading: 'Cargando…',
    cardHeadingPrefix: 'Escalación ·',
    readOnlyNotice: 'Solo lectura — puedes ver la conversación y el razonamiento, pero no asignar, responder ni resolver.',
    noOriginQuestion: '(sin pregunta de origen)',
    escalatedOnPrefix: 'Escalada el',
    colStatus: 'Estado',
    colEmployee: 'Empleado',
    colConvenio: 'Convenio',
    colAssignedTo: 'Asignada a',
    unassigned: 'Sin asignar',
    colTopic: 'Tema',
    triageHeading: 'Triaje',
    assignToMe: 'Asignarme',
    unassignButton: 'Quitar asignación',
    moveStatusAriaLabel: 'Mover estado',
    moveToPlaceholder: 'Mover a…',
    conversationHeading: 'Conversación',
    conversationRestrictedNotice: 'No tienes permiso para ver el contenido de la conversación. Se requiere',
    conversationRestrictedOr: 'o',
    conversationIntro:
      'La conversación completa de la sesión de esta tarjeta (no es un histórico general). Una misma sesión puede generar varias tarjetas, que comparten esta conversación; la pregunta que originó',
    conversationIntroThis: 'esta',
    conversationIntroSuffix: 'tarjeta se muestra arriba.',
    explanationHeading: 'Explicación',
    noStructuredExplanation: 'Sin explicación estructurada todavía (tarjeta anterior a esta función, o pendiente de re-procesar).',
    aiSummaryBadge: 'Resumen IA',
    aiSummaryBadgeTitle: 'Redactado por IA a partir de los hechos estructurados de abajo — no añade ningún dato nuevo',
    fixLinkLabel: 'Corregir',
    employeeHeading: 'Empleado',
    employeeContextRestrictedNotice: 'No tienes permiso para ver el contexto del empleado. Se requiere',
    colName: 'Nombre',
    colEmail: 'Email',
    colTerritory: 'Territorio',
    colCategoryGroup: 'Categoría / grupo',
    colSeniority: 'Antigüedad',
    seniorityYearsSuffix: 'año(s) (desde',
    // Plural forms for HistoryPage §B.8 (replaces the naive `año(s)` above
    // at the Intl-wired call site; suffix kept for EscalationCardDrawer).
    yearOne: 'año',
    yearOther: 'años',
    senioritySincePrefix: '(desde',
    notRegistered: 'no registrada',
    suggestedActionPrefix: 'Acción sugerida:',
    hrAgentDefaultLabel: 'Recursos Humanos',
    hrReplyBadgePrefix: 'Respuesta de',
    hrReplyBadgeSuffix: '(persona)',
    escalatedToHrBadge: 'Escalado a Recursos Humanos',
    replyHeading: 'Responder a la persona',
    replyIntro: 'Se enviará al chat del empleado como respuesta humana, claramente atribuida a Recursos Humanos.',
    replyPlaceholder: 'Escribe la respuesta para el empleado…',
    sending: 'Enviando…',
    sendReply: 'Enviar respuesta',
    officialConvenioFallback: 'Convenio oficial',
    pagePrefix: 'pág.',
    similarityTitle: 'Similitud semántica (0–1) entre tu texto y este pasaje',
    yourTextCompared: 'Tu texto comparado:',
    resolveHeading: 'Resolver / Guardar como conocimiento',
    resolutionPlaceholder: 'Redacta la resolución para esta consulta…',
    publishAsKnowledge: 'Publicar como conocimiento (resolución interna de RR. HH.)',
    topicPlaceholder: 'Tema… (recomendado)',
    noTopicScopeWarning: 'Sin tema, la verja de conflicto bloquea por ámbito completo (sobreprotege). Asigna un tema para afinarla.',
    publishedLosslessPrefix: 'Publicada —',
    publishedLosslessSuffix: 'fragmento(s) indexados (texto íntegro verificado).',
    publishedMismatch: 'Publicada, pero el texto indexado NO coincide exactamente con el escrito (revisar — posible mangling).',
    acknowledgeComparisonUnavailable: 'He revisado el convenio vigente por mi cuenta y confirmo que esta resolución no lo contradice.',
    acknowledgeReadPassages: 'He leído los pasajes y confirmo que esta resolución no se solapa con el convenio vigente.',
    publishing: 'Publicando…',
    publishWithConfirmation: 'Publicar con esta confirmación',
    publishAsKnowledgeButton: 'Publicar como conocimiento',
    markResolved: 'Marcar como resuelta',
    confirmScopeAriaLabel: 'Confirmar ámbito',
    confirmScopeTitle: '¿Publicar e heredar el ámbito del empleado?',
    confirmScopeBody:
      'La resolución se publicará como internal_hr_ruling heredando el convenio del empleado (territorio y sector incluidos) y pasará a responder a otras personas de ese ámbito. No puede prevalecer sobre un convenio oficial vigente para el mismo ámbito y tema (se bloqueará si lo hace).',
    cancel: 'Cancelar',
    confirmAndPublish: 'Confirmar y publicar',
    activityHeading: 'Actividad',
  },

  // lib/statusLabels.ts — shared human-status label maps for closed backend
  // enums (retrieval_status, tagging_status, reference_facts.status,
  // ConvenioGroup(Category) status, EscalationExplainer::MATRIX's 49
  // reason.sub_outcome pairs). Coverage against those real enums is guard-
  // tested in `lib/statusLabels.test.ts` against BOTH this file and en.ts —
  // unchanged content, just relocated from the old module-level consts so
  // the labels are locale-aware (plan.md §C.9 step 6).
  statusLabels: {
    subOutcome: {
      'sensitive_topic.pattern_baseline': 'Tema sensible (base)',
      'sensitive_topic.admin_blocked_topic': 'Tema bloqueado por admin',
      'off_domain.legal_medical': 'Consejo legal/médico',
      'off_domain.other_employee_data': 'Datos de otra persona',
      'off_domain.router_off_domain': 'Fuera de ámbito',
      'off_domain.admin_off_domain': 'Fuera de ámbito (admin)',
      'explicit_request.explicit_request': 'Petición explícita de RR.HH.',
      'low_confidence.no_retrieval': 'Sin contenido encontrado',
      'low_confidence.weak_retrieval': 'Contenido poco relevante',
      'low_confidence.citations_failed': 'Sin respaldo documental',
      'low_confidence.figure_not_grounded': 'Cifra no respaldada',
      'low_confidence.entailment_failed': 'Afirmación no respaldada',
      'low_confidence.grounding_truncated': 'Comprobación incompleta',
      'low_confidence.aggregation': 'Total agregado no soportado',
      'low_confidence.cross_path': 'Pregunta compuesta (salario + otro)',
      'low_confidence.answer_model_not_configured': 'Modelo de respuesta sin configurar',
      'low_confidence.provider_error': 'Fallo del proveedor de respuestas',
      'low_confidence.unspecified': 'Baja confianza (sin detalle)',
      'conflict.fact_vs_convenio': 'Dato vs. convenio en conflicto',
      'salary_coverage_gap.no_convenio': 'Sin convenio asignado',
      'salary_coverage_gap.no_table': 'Sin tabla salarial cargada',
      'salary_coverage_gap.future_only': 'Tabla aún no vigente',
      'salary_coverage_gap.category_unresolved': 'Categoría no válida',
      'salary_coverage_gap.no_row_for_category': 'Sin fila para la categoría',
      'salary_coverage_gap.statutory_figure': 'Cifra estatutaria (SMI)',
      'reference_fact_coverage_gap.no_convenio': 'Sin convenio asignado',
      'reference_fact_coverage_gap.no_reference_data': 'Sin dato de referencia',
      'reference_fact_coverage_gap.only_needs_review': 'Dato sin verificar',
      'reference_fact_coverage_gap.out_of_validity': 'Dato fuera de vigencia',
      'reference_fact_coverage_gap.employee_group_unknown': 'Grupo del empleado desconocido',
      'reference_fact_coverage_gap.group_structure_not_approved': 'Grupo sin aprobar',
      'reference_fact_coverage_gap.subarea_not_recorded': 'Sub-área no registrada',
      'reference_fact_coverage_gap.group_split_since_fact_bound': 'Grupo dividido tras vincular el dato',
      'reference_fact_coverage_gap.same_validity_conflict': 'Datos en conflicto (misma vigencia)',
      'publish.topic_scope_conflict': 'Tema sin etiquetar',
      'publish.semantic_overlap': 'Coincide con el convenio',
      'publish.semantic_near_overlap': 'Posible coincidencia parcial',
      'publish.semantic_compare_unavailable': 'Comparación no disponible',
      'publish.semantic_no_text_to_compare': 'Sin texto para comparar',
      'publish.convert_blocked': 'Motivo no convertible',
      'quality_sample_wrong.wrong_scope': 'Ámbito incorrecto',
      'quality_sample_wrong.wrong_figure': 'Cifra incorrecta',
      'quality_sample_wrong.stale_document': 'Documento desactualizado',
      'quality_sample_wrong.unclear': 'Respuesta poco clara',
      'quality_sample_wrong.other': 'Otro motivo',
      'estatuto_fallback_gap.expired_no_successor': 'Convenio vencido sin sucesor',
      'estatuto_fallback_gap.tagging_under_review': 'Etiquetado sin verificar',
      'estatuto_fallback_gap.scan_no_text': 'Escaneo sin texto',
      'estatuto_fallback_gap.not_yet_embedded': 'Indexado pendiente',
    } as Record<string, string>,
    factStatus: {
      verified: 'Verificado',
      needs_review: 'Por revisar',
    } as Record<string, string>,
    groupNodeStatus: {
      needs_review: 'Por revisar',
      approved: 'Aprobado',
      rejected: 'Rechazado',
    } as Record<string, string>,
    retrievalStatus: {
      draft: 'Borrador',
      active: 'Activo',
      historical: 'Histórico',
    } as Record<string, string>,
    taggingStatus: {
      auto_proposed: 'Auto-propuesto',
      under_review: 'En revisión',
      verified: 'Verificado',
    } as Record<string, string>,
  },

  // ReferenceFactPanel.tsx — the reference-fact detail drawer (Sprint 7b-1/
  // 7b-2), same shape as DocumentDetailPanel's card: scope facets, the AI/
  // manual review UX, the bounded edit form, provenance timeline (58
  // matches, plan.md §A.1). Already heavily English-in-Spanish-UI (a
  // pre-existing state, see `common` comment above) — preserved verbatim in
  // this file; the handful of genuinely Spanish sentences (the `resolution`
  // block) are translated normally into en.ts, applying the approved
  // glossary's "vigencia" → "validity" rule where it appears.
  referenceFactPanel: {
    heading: 'Reference fact', // already English live
    loadingText: 'Loading…', // already English live (distinct from `common.loading`'s Spanish 'Cargando…', which is NOT what this file showed)
    typeBadge: 'dato', // glossary: "dato (de referencia)" → translate for en.ts only
    aiProposalBadge: 'AI proposal', // already English live
    manualBadge: 'Manual', // already English live
    badgeVerified: 'verified', // already English live
    badgeNeedsReview: 'needs review', // already English live
    badgeRejected: 'rejected', // already English live
    closeAriaLabel: 'Close', // already English live
    readOnlyNoticePrefix: "Read-only — you don't have the", // already English live
    readOnlyNoticeSuffix: 'ability.', // already English live
    aiProposalNoticeBold: 'AI-segmented proposal — unverified.', // already English live
    aiProposalNoticeRest:
      'Check the scope against the quoted source line below before verifying. The agent only proposes; it never verifies itself.', // already English live
    confidencePrefix: 'Confidence:', // already English live
    versionDuplicateBold: 'Possible version/duplicate', // already English live
    versionDuplicatePrefix: '— same scope as an existing fact with a different value ("', // already English live
    versionDuplicateSuffix: '"). Decide which is true, and since when.', // already English live
    resolveDuplicateButton: 'Resolver versión (comparar lado a lado)',
    supersededBold: 'Sustituido',
    supersededByPrefix: 'por “',
    supersededBySuffix: '”',
    supersededSincePrefix: '(desde',
    supersededSinceSuffix: ')',
    supersededTrailing: 'este valor sigue siendo el correcto para su periodo de vigencia; no se ha borrado.',
    supersedesBold: 'Sustituye',
    supersedesTrailing: 'a una versión anterior, cuya vigencia se cerró.',
    coexistsBold: 'Coexiste',
    coexistsTrailing: 'con el hecho marcado: no son versiones del mismo dato.',
    rejectedDuplicateBold: 'Descartado',
    rejectedDuplicateTrailing: 'como duplicado incorrecto.',
    inertNoticeBold: 'Inert until verified', // already English live
    inertNoticeRest: 'this fact is not answerable until a human verifies it (once verified, it can be served directly as a live answer).', // already English live
    sourceLineHeading: 'Source line (check the scope)', // already English live
    valueHeading: 'Value', // already English live
    rawValuesSummary: 'Original (raw_values)', // already English live
    scopeHeading: 'Scope', // already English live
    groupLabel: 'Group', // already English live
    noJobCategoryFallback: '— (convenio-wide)', // already English live
    authorityLabel: 'Authority', // already English live
    authorityLockTitle: 'A reference fact can never outrank a convenio (enforced in schema + validation).', // already English live
    sourceLabel: 'Source', // already English live
    sourceManual: 'manual', // already English live
    statusLabel: 'Status', // already English live
    verifiedByPrefix: 'by', // already English live
    noSourceDocLinked: 'No source document linked', // already English live
    verifying: 'Verifying…', // already English live
    verifyProposal: 'Verify proposal', // already English live
    verifyFact: 'Verify fact', // already English live
    cancelEdit: 'Cancel edit', // already English live
    fixThenVerify: 'Fix then verify', // already English live
    editButton: 'Edit', // already English live
    rejecting: 'Rejecting…', // already English live
    rejectButton: 'Reject', // already English live
    resegmentTitle: 'Re-run the segmentation agent on the source (idempotent upsert)', // already English live
    resegmentButton: 'Re-segment source', // already English live
    provenanceHeading: 'Provenance', // already English live
    adminHashPrefix: 'admin #', // already English live
    validityStartLabel: 'Validity start', // already English live
    validityEndLabel: 'Validity end', // already English live
    sourceLocatorLabel: 'Source locator', // already English live
    sourceLocatorPlaceholder: 'p.3 §2 / sheet:smi26', // already English/technical live
    authorityLockedPrefix: 'Authority is locked to', // already English live
    authorityLockedSuffix: '— it cannot be raised.', // already English live
    saving: 'Saving…', // already English live
    confirmScopeChangeAriaLabel: 'Confirm scope change', // already English live
    scopeChangeTitle: 'Scope change', // already English live
    scopeChangeBody: 'This changes the validity/scope of the fact (which employees it would answer). Confirm to apply.', // already English live
    confirmChangeButton: 'Confirm change', // already English live
  },

  // QualitySampleQueue.tsx — the Calidad screen: the monthly verdict
  // summary + trend chart, the sample table, and the per-sample review
  // drawer (conversation + verdict/failure-kind/note form) (54 matches,
  // plan.md §A.1). Almost entirely Spanish source text; the handful of
  // pieces shared verbatim with EscalationCardDrawer.tsx's conversation
  // bubbles (the hr_agent reply badge, the escalated-to-HR badge, the
  // "Conversación" heading) reuse those exact keys rather than duplicating.
  qualitySampleQueue: {
    verdictLabels: {
      correct: 'Correcta',
      partially: 'Parcialmente correcta',
      wrong: 'Incorrecta',
    },
    failureKindLabels: {
      wrong_scope: 'Ámbito incorrecto',
      wrong_figure: 'Cifra incorrecta',
      stale_document: 'Documento obsoleto',
      unclear: 'Poco claro',
      other: 'Otro',
    },
    noVerdictsYet: 'Sin veredictos registrados todavía.',
    monthlyCorrectSuffix: 'correcta',
    monthlyPartiallySuffix: 'parcialmente',
    monthlyWrongSuffix: 'incorrecta',
    accuracySuffix: 'de precisión',
    chartLabelCorrect: 'Correcta',
    chartLabelPartially: 'Parcialmente',
    chartLabelWrong: 'Incorrecta',
    introPart1:
      'Muestra mensual estratificada de turnos respondidos (§6.2) — cada fila es un turno REAL que un empleado recibió, no un caso sintético. Marcar',
    introPart2: 'abre una tarjeta de corrección (',
    introPart3: '), igual que cualquier otra escalación.',
    sampleWord: 'muestra',
    monthPlaceholder: 'Mes (AAAA-MM)…',
    unreviewedOnlyLabel: 'Solo sin revisar',
    loadingText: 'Loading…', // already English live (distinct from `common.loading`'s Spanish 'Cargando…')
    colMonth: 'Mes',
    colQuestion: 'Pregunta',
    colStratum: 'Estrato',
    colTerritory: 'Territorio',
    colVerdict: 'Veredicto',
    colReviewer: 'Revisor',
    colCard: 'Tarjeta',
    viewAnswerSummary: 'Ver respuesta',
    stratumPathFallback: 'prose', // already English live — a technical fallback token, not prose-about-prose
    nationalFallback: 'nacional',
    notReviewedBadge: 'Sin revisar',
    noSamplesPrefix: 'No hay muestras para este filtro. (Ejecuta',
    noSamplesSuffix: 'para generar la del mes.)',
    drawerHeading: 'Muestra de calidad',
    colSeed: 'Semilla',
    colCorrectionCard: 'Tarjeta de corrección',
    noConversationAssociated: 'Sin conversación asociada.',
    reviewHeading: 'Revisión',
    readOnlyReviewNoticePrefix: 'Solo lectura — se requiere',
    readOnlyReviewNoticeSuffix: 'para registrar un veredicto.',
    reviewerBarredNotice: 'No puedes revisar esta muestra: estás asignado a una tarjeta de escalación de la misma sesión (§6.3).',
    failureKindPlaceholder: 'Motivo de fallo…',
    notePlaceholder: 'Nota (opcional)…',
    saving: 'Guardando…',
    saveVerdictButton: 'Guardar veredicto',
    alreadyReviewedPrefix: 'Ya revisada por',
    alreadyReviewedMiddle: 'el',
    alreadyReviewedSuffix: '— guardar de nuevo sobrescribe el veredicto.',
    selectFailureReasonError: 'Selecciona un motivo de fallo.',
  },

  // GuardrailsPage.tsx — the admin "Guardrails" console (Sprint 6, ADR-0019):
  // thresholds, blocked-topics list, off-domain message, tone constraints,
  // convert-by-reason, change history (53 matches, plan.md §A.1). Entirely
  // Spanish source text — straight translation, applying the approved
  // glossary's "ámbito" → "scope" rule where it appears.
  guardrailsPage: {
    reasonLabels: {
      low_confidence: 'Baja confianza',
      salary_coverage_gap: 'Hueco en tablas salariales',
      off_domain: 'Fuera de ámbito',
      explicit_request: 'Petición explícita',
      sensitive_topic: 'Tema sensible',
    } as Record<string, string>,
    thresholdRetrievalLabel: 'Umbral de recuperación (Check A)',
    thresholdRetrievalHelp: 'Puntuación mínima del mejor fragmento para intentar responder. Subirlo escala más preguntas dudosas. Es una verdadera puerta.',
    thresholdConfidenceLabel: 'Umbral de confianza (Check C — desempate)',
    thresholdConfidenceHelp: 'Señal secundaria, NO una puerta principal. Las puertas reales son A (recuperación) y B (citas). Subirlo afina el desempate.',
    thresholdRouterLabel: 'Umbral del enrutador (secundario)',
    thresholdRouterHelp: 'Confianza mínima del enrutador. Subirlo envía más casos intermedios al camino seguro de prosa.',
    loadFailedError: 'No se pudo cargar la configuración.',
    saveFailedError: 'No se pudo guardar.',
    addFailedError: 'No se pudo añadir.',
    disableFailedError: 'No se pudo desactivar.',
    violationNumberSuffix: ': introduce un número.',
    violationBelowFloorMiddle: 'no puede bajar de',
    violationBelowFloorSuffix: '(mínimo de seguridad).',
    violationAboveOne: 'no puede superar 1.',
    introPrefix: 'Esta configuración solo puede',
    introBoldHarden: 'endurecer',
    introMiddle:
      'el comportamiento base, nunca debilitarlo. El sistema aplica siempre el valor más estricto entre el mínimo de seguridad (fijo en el código) y tu ajuste; un valor por debajo del mínimo se',
    introBoldReject: 'rechaza',
    introSuffix: '(no se recorta). Los patrones base de seguridad (acoso, salud mental, despido, legal/médico, otras personas) no son editables.',
    readOnlyRoleNotice: 'Tu rol es de solo lectura.',
    thresholdsHeading: 'Umbrales',
    thresholdsIntro1: 'Cada umbral muestra su mínimo de seguridad fijo. Solo puedes subirlo. El de confianza (Check C) es un',
    thresholdsIntroBold: 'desempate',
    thresholdsIntro2: ', no una puerta principal — las puertas reales son la recuperación (A) y las citas (B).',
    placeholderMinimoPrefix: 'mínimo',
    placeholderMinimoSuffix: '(sin ajuste)',
    helpFixedMinimumMiddle: '· Mínimo fijo:',
    helpEffectiveNowMiddle: '· Efectivo ahora:',
    usingMinimumSuffix: '(usando el mínimo)',
    savingThresholds: 'Guardando…',
    saveThresholdsButton: 'Guardar umbrales',
    blockedTopicsHeading: 'Temas bloqueados y fuera de ámbito',
    blockedTopicsIntro1: 'Lista',
    blockedTopicsIntroBold: 'aditiva',
    blockedTopicsIntro2:
      'sobre la base fija: cada entrada añade una escalación, nunca quita una. Se compara como texto literal (sin acentos, por palabra completa) — no como expresión regular. Una pregunta bloqueada escala',
    blockedTopicsIntroBold2: 'antes',
    blockedTopicsIntro3: 'de llegar al proveedor.',
    noEntriesYet: 'Sin entradas todavía.',
    kindOffDomainBadge: 'Fuera de ámbito',
    kindSensitiveTopicBadge: 'Tema sensible',
    disableButton: 'Desactivar',
    disabledLabel: 'desactivado',
    addPatternPlaceholder: 'palabra o frase',
    addButton: 'Añadir',
    offDomainHeading: 'Mensaje de «fuera de ámbito»',
    offDomainIntro: 'Texto que se muestra al escalar por estar fuera de ámbito. Solo afecta al texto; no cambia ninguna decisión.',
    saveMessageButton: 'Guardar mensaje',
    toneHeading: 'Tono y estilo',
    toneIntro1: 'Solo',
    toneIntroBold1: 'estilo y formato',
    toneIntro2: '(p. ej. «trato de usted, respuestas breves»). El tono',
    toneIntroBold2: 'no puede',
    toneIntro3:
      'saltarse la fundamentación ni las citas: las verificaciones son independientes y posteriores. Una instrucción que intente desbloquear una puerta se rechaza. Máximo',
    toneIntroSuffix: 'caracteres.',
    saveToneButton: 'Guardar tono',
    convertHeading: 'Conversión a conocimiento por motivo',
    convertIntroPrefix: 'Qué motivos de escalación pueden convertirse en una regla publicada. Solo puedes',
    convertIntroBold: 'restringir',
    convertIntroSuffix: '. «Tema sensible» nunca es convertible (bloqueado).',
    historyHeading: 'Historial de cambios',
    historyIntro: 'Cada cambio queda registrado (quién, cuándo, de qué a qué). Solo lectura.',
    noChangesYet: 'Sin cambios todavía.',
    colField: 'Campo',
    colBefore: 'Antes',
    colAfter: 'Después',
    colWho: 'Quién',
    colWhen: 'Cuándo',
  },

  // GroupsQueue.tsx — the Groups review tab (Sprint 7f, ADR-0028): the
  // convenio list, the AI-proposed group tree with the binding-diff review
  // modal, and the unbindable-facts manual-assignment table (51 matches,
  // plan.md §A.1). Entirely Spanish source text — straight translation,
  // applying the approved glossary's "vigencia" → "validity" rule.
  groupsQueue: {
    introText: 'Estructura de grupos por convenio. Los nodos propuestos por la IA son inertes: no los usa nadie hasta que se aprueban.',
    colPending: 'Pendientes',
    colApproved: 'Aprobados',
    colFactsWithGroup: 'Datos con grupo',
    chooseConvenioPrompt: 'Elige un convenio.',
    loadingStructure: 'Cargando estructura…',
    enqueueing: 'Encolando…',
    proposeStructureButton: 'Proponer estructura con IA',
    noStructureYet:
      'Este convenio no tiene ninguna estructura de grupos todavía. Sin ella, un dato con grupo no puede vincularse y la pregunta se deriva a una persona.',
    orphanAreasHeading: 'Áreas sin grupo padre visible',
    unbindableHeading: 'Datos que no se vinculan solos',
    unbindableIntro:
      'Estas etiquetas no se pueden resolver sin criterio humano. Se listan aquí en lugar de descartarse: mientras no se vinculen, esas preguntas se derivan. Si tú sí sabes a qué nodo pertenecen, elígelo — queda registrado como decisión tuya, no como lectura del analizador.',
    colId: 'Id',
    colLabel: 'Etiqueta',
    colValue: 'Valor',
    colSource: 'Fuente',
    colReason: 'Motivo',
    colBindTo: 'Vincular a',
    boundManuallyBadge: 'vinculado a mano',
    convenioWideScopeNotice: 'ámbito convenio — no se acota',
    approveNodeFirstNotice: 'aprueba primero un nodo',
    chooseNodePlaceholder: 'Elegir nodo…',
    bindButton: 'Vincular',
    matcherKeyTitle: 'La clave que comparará el emparejador',
    boundFactsSuffix: 'dato(s) vinculados',
    noConvenioQuoteNotice: 'Sin cita del convenio.',
    proposedCategoriesHeading: 'Categorías propuestas',
    evidencePrefix: 'indicio:',
    factsPointingHeading: 'Datos que apuntan a este nodo',
    boundLabel: 'vinculado',
    unboundLabel: 'sin vincular',
    unbindButton: 'desvincular',
    bindLinkLabel: 'vincular',
    reviewAndApproveButton: 'Revisar y aprobar…',
    editButton: 'Editar',
    rejectButton: 'Rechazar',
    editLabelHint: 'Escribe la etiqueta tal como la imprime el convenio; la clave se recalcula sola.',
    diffHeading: 'Qué vinculará esta aprobación',
    noFactsPointNotice: 'Ningún dato apunta a este nodo. Se puede aprobar igualmente.',
    colValidity: 'Vigencia',
    colStatus: 'Estado',
    alsoBindsPrefix: 'Este dato abarca también otro(s) nodo(s):',
    alsoBindsSuffix: 'Vincúlalo allí también o su ámbito quedará incompleto.',
    openEndedFallback: 'abierta',
    alreadyBoundBadge: 'ya vinculado',
    manualBindingNeededHeading: 'No se resuelven solos',
    approveAndBindPrefix: 'Aprobar nodo y vincular',
    approveAndBindSuffix: 'dato(s)',
  },

  // HistoryPage.tsx — the gated full-conversation History browser (ADR-0018,
  // history.view_all only): search, the conversation list/filters, and the
  // read-only conversation drawer (44 matches, plan.md §A.1). The employee-
  // context block and reply/escalation badges deliberately reuse
  // `escalationCard.*` keys — the code comments document this as an
  // intentional mirror of EscalationCardDrawer's block, same four rows.
  historyPage: {
    searchPlaceholder: 'Buscar en el contenido de las conversaciones…',
    searchAriaLabel: 'Buscar en conversaciones',
    searching: 'Buscando…',
    searchButton: 'Buscar',
    viewListButton: 'Ver listado',
    allConveniosOption: 'Todos los convenios',
    allTerritoriesOption: 'Todos los territorios',
    resultLabel: 'Resultado',
    outcomeAllOption: 'Respondidas y escaladas',
    outcomeAnsweredOnlyOption: 'Solo respondidas',
    outcomeEscalatedOnlyOption: 'Solo escaladas',
    escalationReasonAriaLabel: 'Motivo de escalación',
    fromAriaLabel: 'Desde',
    toAriaLabel: 'Hasta',
    colMessages: 'Mensajes',
    colLastActivity: 'Última actividad',
    noConversationsMatch: 'No hay conversaciones que coincidan.',
    escalatedBadge: 'Escalada',
    answeredBadge: 'Respondida',
    matchesCountSuffix: 'coincidencia(s) para',
    matchesIntroContinuation:
      'Se muestran fragmentos breves; abre una conversación para leerla (cada apertura queda registrada).',
    colRole: 'Rol',
    colSnippet: 'Fragmento',
    colActivity: 'Actividad',
    noMatches: 'Sin coincidencias.',
    conversationAriaLabel: 'Conversación',
    conversationDefaultHeading: 'Conversación',
    readOnlyNotice: 'Solo lectura. Esta apertura ha quedado registrada en el registro de accesos.',
    startedLabel: 'Inicio',
  },

  // ReferenceFactCreatePanel.tsx — the manual "create a Structured Reference
  // fact by hand" drawer (Sprint 7b-1, ADR-0021): the reference-source reader
  // on the left, the create form on the right (38 matches, plan.md §A.1).
  // Entirely English source text already (this drawer has never shown
  // Spanish chrome) — verbatim preservation throughout, except the value
  // placeholder, which is a real convenio value example and stays in
  // Spanish in both dictionaries (it exemplifies source-document phrasing,
  // not UI chrome). `typeBadge` and `closeAriaLabel`/`validityStartLabel`/
  // `validityEndLabel`/`sourceLocatorPlaceholder` reuse `referenceFactPanel`'s
  // identical keys rather than duplicating.
  referenceFactCreatePanel: {
    heading: 'New reference fact', // already English live
    requiredFieldsError: 'A convenio and a value are required.', // already English live
    convenioRequiredLabel: 'Convenio *', // already English live
    selectConvenioPlaceholder: 'Select a convenio…', // already English live
    derivedScopePrefix: 'Derived scope:', // already English live
    derivedScopeSuffix: '(territory & sector ride the convenio — not editable)', // already English live
    jobCategoryOptionalLabel: 'Job category (optional)', // already English live
    convenioWideOption: 'Convenio-wide', // already English live
    topicOptionalLabel: 'Topic (optional)', // already English live
    noTopicOption: 'No topic', // already English live
    valueRequiredLabel: 'Value *', // already English live
    valuePlaceholder: 'periodo de prueba 90/75 días', // intentionally untranslated: a real convenio value example, not UI chrome
    originalTextOptionalLabel: 'Original text (raw, optional)', // already English live
    rawTextPlaceholder: 'Paste the verbatim source phrasing (kept in raw_values)…', // already English live
    sourceDocumentOptionalLabel: 'Source document (optional)', // already English live
    noSourceLinkOption: 'No source link', // already English live
    sourceLocatorOptionalLabel: 'Source locator (optional)', // already English live
    authorityPrefix: 'Authority:', // already English live
    lockedSuffix: '— locked.', // already English live
    authorityNeverOutrankNotice: 'A reference fact can never outrank a convenio.', // already English live
    willLandPrefix: 'The fact will land', // already English live
    willLandSuffix: '— verify it from its card to make it count.', // already English live
    creating: 'Creating…', // already English live
    createFactButton: 'Create fact', // already English live
    cancelButton: 'Cancel', // already English live
    readerHeading: 'Reference source', // already English live
    readerIntroPrefix: 'Read a non-salary .docx/.xlsx to enter facts by hand. Tagging it', // already English live
    readerIntroSuffix: 'keeps it off the salary path.', // already English live
    uploadLabel: 'Upload a new source (.docx / .xlsx)', // already English live
    uploadingText: 'Uploading + reading…', // already English live
    uploadedNote: 'Uploaded — select it below to read its content.', // already English live
    openSourceLabel: 'Open a source', // already English live
    selectSourcePlaceholder: 'Select a reference source…', // already English live
    loadingContentText: 'Loading content…', // already English live
    noExtractableContent: '(no extractable content)', // already English live
    sectionPrefix: 'Section', // already English live
    useAsLocatorTitle: 'Use as source locator', // already English live
    useLocatorButton: 'use locator', // already English live
  },

  // CsvImportPanel.tsx — the employee-directory CSV bootstrap (ADR-0004):
  // the column-schema help text, the group-format help text, the
  // validate/apply controls, and the per-row report table (29 matches,
  // plan.md §A.1). The `<code>` column/group examples (email, group,
  // Grupo 2, etc.) are real CSV schema literals, not prose — left
  // untranslated in the component and allowlisted in the R3 guard.
  csvImportPanel: {
    heading: 'Importar empleados (CSV)',
    colsPrefix: 'Columnas:',
    colsRequiredSuffix: '(obligatorias); opcionales',
    colsValidationNote:
      'Primero se valida (sin escribir nada); las filas con error se informan, no se descartan en silencio.',
    groupAcceptsPrefix: 'acepta el grupo tal y como lo escribe el convenio (',
    groupAcceptsMid: ') o su código (',
    groupAcceptsClose: ');',
    groupAndConnector: 'y',
    groupSameGroupContinued: 'son el mismo grupo. Para un área dentro de un grupo, usa',
    groupApprovedNote:
      '. Solo se admiten grupos ya aprobados de ese convenio: un valor que no exista, o que sea ambiguo (p. ej.',
    groupAmbiguousTail:
      'cuando existe en dos grupos), da error en su fila — nunca se elige uno por ti ni se crea un grupo nuevo. En blanco, la persona queda sin grupo, y las preguntas que dependan del grupo se derivan a RRHH.',
    validating: 'Validando…',
    validateButton: 'Validar (simulación)',
    importing: 'Importando…',
    importPrefix: 'Importar',
    importSuffix: 'fila(s) válida(s)',
    importedPrefix: 'Importadas:',
    createdSuffix: 'creadas,',
    updatedSuffix: 'actualizadas',
    invalidNotAppliedSuffix: 'con error (no aplicadas).',
    simulationPrefix: 'Simulación:',
    totalRowsSuffix: 'fila(s) ·',
    validSuffix: 'válidas ·',
    invalidSuffix: 'con error.',
    colRow: 'Fila',
    colEmail: 'Email',
    colAction: 'Acción',
    colStatus: 'Estado',
    colDetail: 'Detalle',
    okLabel: 'OK',
    errorLabel: 'Error',
  },

  // FactDuplicatePanel.tsx — the fact-VERSION resolution surface (Sprint 7d,
  // ADR-0024 part B): the side-by-side comparison, the three human verdicts
  // (supersede/coexist/reject), and their confirmation modal (29 matches,
  // plan.md §A.1). Entirely Spanish source text. Per the approved glossary
  // (review.md), "vigencia" → "validity" as the default noun EXCEPT at
  // `supersedeSuccessMsg`, the exact site the glossary review called out as
  // reading better with per-site phrasing than a bare noun-swap.
  factDuplicatePanel: {
    supersedeSuccessMsg: "Superseded — the previous fact's validity period has closed. Neither has been deleted.",
    coexistSuccessMsg: 'Marked as coexisting — both remain answerable.',
    rejectSuccessMsg: 'Discarded as a duplicate — it is no longer answerable.',
    heading: 'Resolver versión',
    readOnlyPrefix: 'Solo lectura — necesitas',
    readOnlySuffix: 'para resolver una versión.',
    resolvedNotice: 'Este par ya está resuelto. El enlace se conserva como linaje de versiones; nada se ha borrado.',
    noticeIntro: 'Dos hechos del mismo ámbito y tema con valores distintos. Decide si uno',
    supersedeBold: 'sustituye',
    noticeMid1: 'al otro (una versión posterior), si',
    coexistBold: 'coexisten',
    noticeMid2: '(no son versiones) o si uno es',
    incorrectBold: 'incorrecto',
    noticeMid3: '. Sustituir cierra la vigencia del anterior y',
    noDeleteBold: 'no borra nada',
    noticeTail: ': una pregunta con fecha antigua seguirá obteniendo el valor que era cierto entonces.',
    resolveHeading: 'Resolver',
    whichIsNewerPrefix: '¿Cuál es la versión posterior? Se cerrará la vigencia de la otra el',
    sincePrefix: '· desde',
    noteLabel: 'Nota (queda en la provenencia)',
    supersedeButton: 'Sustituir (cerrar vigencia de la anterior)',
    coexistButton: 'Coexisten (no son versiones)',
    rejectButton: 'Descartar este hecho',
    confirmResolutionAriaLabel: 'Confirmar resolución',
    confirmLabel: 'Confirmar',
    applying: 'Aplicando…',
    confirmSupersedePrefix: 'Se cerrará la vigencia del hecho anterior el',
    confirmSupersedeSuffix:
      '. Ambos hechos se conservan verificados: el anterior seguirá respondiendo a preguntas fechadas en su periodo.',
    confirmCoexistBody:
      'Los dos hechos se marcarán como coexistentes. Ambos siguen siendo respondibles y la marca de versión deja de pedir atención.',
    confirmRejectBody:
      'Este hecho pasará a rechazado y dejará de ser respondible. No se borra: queda con su provenencia para auditoría.',
    newerBadge: 'más reciente',
    verifiedBadge: 'verificado',
    unverifiedBadge: 'sin verificar',
    rejectedBadge: 'rechazado',
    groupAsWrittenLabel: 'Grupo (tal cual)',
    categoryLabel: 'Categoría',
    topicLabel: 'Tema',
    validityStartLabel: 'Vigencia desde',
    validityEndLabel: 'Vigencia hasta',
    sourceLineLabel: 'Línea de origen',
    resolvedByConnector: 'por',
  },

  // DocumentsPage.tsx — the Knowledge → Documents ingestion + verification
  // table: upload, filters, the document list, and the pager (27 matches,
  // plan.md §A.1). Entirely English source text already — verbatim
  // preservation, reusing `common.territory`/`common.sector`/`common.type`/
  // `common.validity`/`common.dash` and `documentDetail.retrievalFieldLabel`/
  // `kvStatus`/`ocrdBadge` (identical English text) rather than duplicating.
  documentsPage: {
    uploadFolderLabel: 'Upload folder', // already English live
    convenioFilterPrefix: 'Convenio #', // already English live
    removeConvenioFilterAriaLabel: 'Quitar filtro de convenio', // the one Spanish string in an otherwise-English toolbar — translated for en.ts, preserved verbatim here
    ingestingPrefix: 'Ingesting', // already English live
    ingestingSuffix: 'file(s)…', // already English live
    ingestedLabel: 'Ingested', // already English live
    skippedLabel: 'skipped', // already English live
    failedLabel: 'failed', // already English live
    ingestFailedPrefix: "Couldn't ingest these files:", // already English live
    documentWord: 'document', // already English live
    documentsWordPlural: 'documents', // already English live
    allStatusesOption: 'All statuses', // already English live
    autoProposedOption: 'Auto-proposed', // already English live
    underReviewOption: 'Under review', // already English live
    verifiedOption: 'Verified', // already English live
    conflictsOnlyLabel: 'Conflicts only', // already English live
    titleHeader: 'Title', // already English live
    flagsHeader: 'Flags', // already English live
    conflictBadge: 'Conflict', // already English live
    noTextBadge: 'No text', // already English live
    nationalBadge: 'National', // already English live
    noDocumentsMatchFilters: 'No documents match these filters.', // already English live
    noDocumentsYet: 'No documents yet — upload a convenio folder to ingest.', // already English live
    prevButton: '‹ Prev', // already English live
    nextButton: 'Next ›', // already English live
    pagePrefix: 'Page', // already English live
    pageOfConnector: 'of', // already English live
  },

  // AnalyticsPage.tsx — the Analítica screen (Sprint 8 step 7, ADR-0030):
  // KPI tiles, path/authority split charts, the escalations-by-fix table,
  // question clustering, and the unanswered ranking (25 matches, plan.md
  // §A.1). Mostly Spanish source text; `loadingText` is the one already-
  // English string (verbatim), and `fixLinkFallback` reuses
  // `escalationCard.fixLinkLabel`'s identical "Corregir" rather than
  // duplicating it.
  analyticsPage: {
    loadingText: 'Loading…', // already English live
    periodPrefix: 'Periodo',
    periodNote: 'Deflection rate excluye `needs_category` del denominador (§2.1, resuelto).',
    kpiDeflectionRateLabel: 'Tasa de resolución (deflection)',
    kpiAnsweredLabel: 'Respondidas',
    kpiEscalatedLabel: 'Escaladas',
    kpiNeedsCategoryLabel: 'Necesitan categoría',
    kpiNeedsCategorySub: 'excluido del denominador',
    kpiHrRepliesLabel: 'Respuestas humanas (RR. HH.)',
    kpiSatisfactionLabel: 'Satisfacción (👍/👍+👎)',
    kpiSatisfactionSubSuffix: '(§7, opcional)',
    pathSplitHeading: 'Reparto por vía (path_split)',
    authoritySplitHeading: 'Reparto por autoridad (authority_split)',
    escalationsByFixHeading: 'Escalaciones por corrección (§3)',
    unexplainedCountSuffix: 'tarjeta(s) anteriores sin explicación estructurada aún.',
    resolvedInPeriodSuffix: 'resueltas en el periodo · tasa de conversión a conocimiento',
    reasonHeader: 'Motivo',
    subOutcomeHeader: 'Sub-resultado',
    fixActionHeader: 'Acción de corrección',
    cardsHeader: 'Tarjetas',
    resolvedHeader: 'Resueltas',
    noEscalationsInPeriod: 'Sin escalaciones en el periodo.',
    clusteringHeadingPrefix: 'Agrupación de preguntas (§4) — ejecución',
    clusteringNotePrefix: 'Etiqueta = medoide del cluster (nunca un resumen de IA). Umbral τ=',
    medoidHeader: 'Medoide',
    membersHeader: 'Miembros',
    similarityHeader: 'Similitud (mín–máx)',
    escalationRateHeader: 'Tasa de escalación',
    topReasonHeader: 'Motivo top',
    uniqueLabel: '(único)',
    noClustersPrefix: 'Sin clusters (ejecuta',
    noClustersSuffix: ').',
    topicsHeading: 'Preguntas por tema (top 10)',
    unansweredRankingHeading: 'Ranking "sin responder" (escalation_rate × volumen × personas afectadas)',
    volumeLabel: 'volumen',
    rateLabel: 'tasa',
    headcountWeightLabel: 'peso por plantilla',
    scoreLabel: 'score',
    noDataNotice: 'Sin datos.',
  },

  // gapMeta.ts — the coverage-gap badge label/hint text shared by the
  // Hierarchy tree and the coverage-gap panel of KnowledgeMapPage.tsx (24
  // matches, plan.md §A.1). Entirely English source text already —
  // verbatim preservation. `cls` (the CSS gap--danger/warning/neutral
  // class) is a technical value, not chrome, and stays in `gapMeta.ts`
  // itself rather than moving into the dictionary.
  gapMeta: {
    unanswerable: {
      label: 'Unanswerable',
      hint: 'Active document with 0 indexed chunks (e.g. a scanned PDF, or still under review) — it cannot answer.',
    },
    expired_no_successor: {
      label: 'No active successor',
      hint: 'Only historical prose remains for this scope — no active version to answer from (coverage hole).',
    },
    suspected_mistag: {
      label: 'Suspected mistag',
      hint: 'Tagged as convenio prose but the title/filename says "tabla" — likely a salary table. Human decides (retag in the card).',
    },
    date_expired_active: {
      label: 'Date-expired (still active)',
      hint: 'Validity end is in the past but the document is still active — a staleness signal, not a hole. The scope is still answerable.',
    },
    unscoped: {
      label: 'Unscoped',
      hint: 'A non-national document with no convenio carries no scope (the scope-rides-on-convenio limitation).',
    },
    SCAN_NO_TEXT: {
      label: 'Scan, no text',
      hint: 'Active prose document(s) exist but have 0 indexed chunks (e.g. a scanned PDF) — it cannot answer.',
    },
    UNDER_REVIEW_SCOPE: {
      label: 'Scope under review',
      hint: 'Prose document(s) exist but tagging is not yet verified — the scope is provisional, not yet answerable.',
    },
    EXPIRED_NO_SUCCESSOR: {
      label: 'Expired, no successor',
      hint: 'Only historical/expired prose exists for this cell — no active successor to answer from.',
    },
    SALARY_PDF_NOT_IMPORTED: {
      label: 'Salary PDF not imported',
      hint: 'A PDF salary document exists but has not been converted/imported into the salary table yet.',
    },
    FACT_NEEDS_REVIEW: {
      label: 'Fact needs review',
      hint: 'A proposed reference fact exists but no human has verified it yet.',
    },
    NO_SALARY_SOURCE: {
      label: 'No salary source',
      hint: 'No salary table, and no salary PDF either — nothing to import from yet.',
    },
    coverage_gap_unclassified: {
      label: 'Unclassified gap',
      hint: 'This cell is uncovered but does not match a known reason code — needs manual investigation.',
    },
  } as Record<string, { label: string; hint: string }>,

  // AdminsPage.tsx — the super_admin-only admin & role management screen
  // (Sprint 5): the admin table, the create-admin form, and the per-row
  // role editor (22 matches, plan.md §A.1). `roleLabels`/`roleHints` were
  // module-level constants (`ROLE_LABELS`/`ROLE_HINTS`), moved here for the
  // same reason `statusLabels.ts`'s maps were (locale-awareness). Entirely
  // Spanish source text otherwise; `cancelButton`/`saveButton` reuse
  // `common.cancel`/`common.save`.
  adminsPage: {
    roleLabels: {
      super_admin: 'Super admin',
      hr_agent: 'Agente de RR. HH.',
      knowledge_editor: 'Editor de conocimiento',
      auditor: 'Auditor',
    } as Record<string, string>,
    roleHints: {
      super_admin: 'Acceso total · gestiona admins · ve todo el histórico',
      hr_agent: 'Trabaja escalaciones · gestiona el directorio',
      knowledge_editor: 'Edita conocimiento · sin acceso a conversaciones',
      auditor: 'Ve y busca todo el histórico (solo lectura)',
    } as Record<string, string>,
    newAdminButton: 'Nuevo administrador',
    colName: 'Nombre',
    colEmail: 'Correo',
    colRoles: 'Roles',
    colStatus: 'Estado',
    noAdminsNotice: 'No hay administradores.',
    fullNameLabel: 'Nombre completo',
    creatingButton: 'Creando…',
    createAdminButton: 'Crear administrador',
    noRoleNotice: 'sin rol',
    activeStatus: 'Activo',
    inactiveStatus: 'Inactivo',
    deactivateButton: 'Desactivar',
    reactivateButton: 'Reactivar',
  },

  // ProposeVocabularyForm.tsx — the propose-new-vocabulary chooser (Sprint
  // 7a, ADR-0011/0020) and its compact review-queue approve/reject control
  // (19 matches, plan.md §A.1). Entirely English source text already —
  // verbatim preservation throughout; the 'provincial'/'regional'/'national'
  // level enum values are real API values, not translated.
  proposeVocabularyForm: {
    proposeForPrefix: 'Propose vocabulary for', // already English live
    foldIntoPrefix: 'Fold into', // already English live
    foldAsAliasLabel: 'as an alias', // already English live
    similarityPrefix: '(similarity', // already English live
    percentCloseParen: '%)', // already English live
    foldIntoExistingLabel: 'Fold into an existing value', // already English live
    nothingCloseFoundHint: '(nothing close enough was found)', // already English live
    createNewPrefix: 'Create a new', // already English live
    deliberateHint: '(deliberate)', // already English live
    levelLabel: 'Level', // already English live
    convenioBlockedNotice: 'Convenios are created by the registry import, not this flow. Fold the spelling into an existing convenio instead.', // already English live
    approveAsAliasButton: 'Approve as alias', // already English live
    proposeOnlyButton: 'Propose (a super_admin approves)', // already English live
    approveAsNewValueButton: 'Approve as new value', // already English live
    foldedMsgPrefix: 'Folded “', // already English live
    foldedMsgMid: '” into', // already English live
    foldedMsgSuffix: '.', // already English live
    createdNewMsgPrefix: 'Created new', // already English live
    createdNewMsgMid: '“', // already English live
    createdNewMsgSuffix: '”.', // already English live
    proposedMsgPrefix: 'Proposed “', // already English live
    proposedMsgSuffix: '” — a super_admin will approve it.', // already English live
    foldedExistingMsg: 'Folded into the existing value.', // already English live
    createdNewValueMsg: 'Created the new value.', // already English live
    topicNoAliasNotice: 'Topics have no alias-fold mechanism — spelling variants are resolved in code via TopicLexicon, not here.', // already English live
  },

  // CoveragePage.tsx — the Cobertura screen (Sprint 8, plan.md §5, ADR-0030):
  // graph/list toggle, export/refresh controls, and the two ranked-gap
  // sections + trend chart below the Hierarchy map (17 matches, §A.1).
  coveragePage: {
    viewGroupAriaLabel: 'View', // already English live
    graphButton: 'Graph', // already English live
    listButton: 'List', // already English live
    exportingButton: 'Exportando…',
    exportButton: '↓ Exportar (.md)',
    refreshButton: '↻ Actualizar',
    asOfPrefix: 'a fecha de',
    loadingText: 'Loading…', // already English live
    fullGapHeadingPrefix: 'Convenios con brecha total',
    fullGapIntro: 'Ni prosa, ni salario, ni datos, ni resoluciones — ordenados por plantilla afectada.',
    personWord: 'persona',
    personsWordPlural: 'personas',
    viewLink: 'Ver',
    noFullGapConvenios: 'Ningún convenio con brecha total.',
    noRegistryHeadingPrefix: 'Ámbitos sin convenio de registro',
    territoryColumn: 'Territorio',
    sectorColumn: 'Sector',
    headcountColumn: 'Plantilla',
    reasonColumn: 'Motivo',
    closedGapsHeadingPrefix: 'Brechas cerradas — tendencia (últimos',
    closedGapsHeadingSuffix: 'instantáneas)',
  },

  // AnswerModelPage.tsx — the Ajustes "Modelo de respuesta" API-key screen
  // (ADR-0015, 15 matches, §A.1).
  answerModelPage: {
    loadFailed: 'No se pudo cargar el estado.',
    saveFailed: 'No se pudo guardar la clave.',
    removeFailed: 'No se pudo eliminar la clave.',
    heading: 'Modelo de respuesta',
    intro: 'La clave del proveedor se guarda cifrada, se muestra enmascarada y se puede rotar, pero nunca se vuelve a mostrar. El navegador nunca ve la clave ni llama al proveedor.',
    statusLabel: 'Estado',
    configuredBadge: 'Configurado ✓',
    notConfiguredBadge: 'Sin configurar',
    providerLabel: 'Proveedor',
    keyLabel: 'Clave',
    newKeyRotateLabel: 'Nueva clave (rotar)',
    providerKeyLabel: 'Clave del proveedor',
    savingButton: 'Guardando…',
    saveKeyButton: 'Guardar clave',
    rotateKeyButton: 'Rotar clave',
    removeKeyButton: 'Eliminar clave',
  },

  // EscalationBoardPage.tsx — the Escalaciones kanban board (drag-drop
  // status columns) and its card drawer trigger (10 matches, §A.1).
  escalationBoardPage: {
    columnLabels: {
      new: 'Nuevas',
      assigned: 'Asignadas',
      in_progress: 'En curso',
      resolved: 'Resueltas',
      closed: 'Cerradas',
    } as Record<string, string>,
    readOnlyNoticePrefix: 'Solo lectura — no tienes el permiso',
    readOnlyNoticeSuffix: '.',
    filterByReasonAriaLabel: 'Filtrar por motivo',
    assignedToMeOnlyLabel: 'Solo asignadas a mí',
    noQuestionText: '(sin texto)',
    unassignedLabel: 'Sin asignar',
  },

  // Hierarchy.tsx — the shared lens-hierarchy component (ADR-0001/0012),
  // list + graph forms, reused by KnowledgeMapPage and CoveragePage (10
  // matches, §A.1). Reuses `referenceFactPanel`'s `typeBadge`/badge-status
  // keys for the identical "dato"/verified/needs-review badges.
  hierarchy: {
    loadingMapText: 'Loading map…', // already English live
    noTopicsNotice: 'No topics tagged yet — topic tagging arrives with the AI tier (Sprint 7). You can tag topics by hand from a document card.', // already English live
    nothingToShowNotice: 'Nothing to show for this lens yet.', // already English live
    factBadgeTitle: 'Structured reference fact', // already English live
    emptyChildren: '(empty)', // already English live
    itemWord: 'item', // already English live
    itemsWordPlural: 'items', // already English live
  },

  // Pager.tsx — the shared pager control (Sprint 8, used by ReviewQueuePage
  // 4x and QualitySampleQueue once). Same "‹ Prev"/"Next ›"/"Page X of Y"
  // text as `documentsPage`'s own copy-pasted inline pager, kept as its own
  // namespace since this is a distinct, reused component (1 match, §A.1).
  pager: {
    prevButton: '‹ Prev', // already English live
    pagePrefix: 'Page', // already English live
    pageOfConnector: 'of', // already English live
    nextButton: 'Next ›', // already English live
  },

  // charts.tsx — the shared chart primitives (KpiTile/BarChart/LineChart,
  // Sprint 8 §10, ADR-0030) used across CoveragePage/AnalyticsPage (4 matches).
  charts: {
    noDataText: 'Sin datos.',
    trendChartAriaLabel: 'trend chart', // already English live
  },

  // ProtectedRoute.tsx — the route guard's loading state (1 match).
  protectedRoute: {
    loadingText: 'Loading…', // already English live
  },

  // FilterToolbar.tsx — the shared filter-chrome shell (Sprint 11a §C.2),
  // wrapped around most admin list screens (2 matches).
  filterToolbar: {
    filtersToggle: 'Filtros',
    clearFiltersButton: 'Limpiar filtros',
  },

  chat: {
    // ChatScreen.tsx — employee chat surface (Sprint 2b + later). SUGGESTED_QUESTIONS
    // stay Spanish-only per spec §2 carve-out (protectedStrings.test.ts); only
    // chrome below is locale-switched. Glossary: vacaciones→"annual leave",
    // jornada (sense 2)→"schedule".
    basedOnPrefix: 'Basado en: ',
    basedOnSuffix: '.',
    feedbackGroupAriaLabel: '¿Te ha resultado útil esta respuesta?',
    usefulAriaLabel: 'Respuesta útil',
    notUsefulAriaLabel: 'Respuesta no útil',
    thanksFeedback: 'Gracias por tu valoración.',
    humanReplyBadgePrefix: 'Respuesta de ',
    humanReplyBadgeSuffix: ' (persona)',
    escalatedBadge: 'Escalado a Recursos Humanos',
    pickCategoryAriaLabel: 'Elige tu categoría profesional',
    groupPrefix: ' (grupo ',
    groupSuffix: ')',
    categorySelectedNote: 'Categoría seleccionada.',
    welcomeText: 'Pregúntame sobre tu convenio: jornada, vacaciones, permisos, festivos… Te respondo según tu ámbito, citando las fuentes.',
    faqAriaLabel: 'Preguntas frecuentes',
    sendFailed: 'No se pudo enviar la pregunta. Inténtalo de nuevo.',
    myCategoryPrefix: 'Mi categoría: ',
    pickFailed: 'No se pudo enviar la selección. Inténtalo de nuevo.',
    thinking: 'Pensando…',
    inputPlaceholder: 'Escribe tu pregunta sobre convenio, jornada, vacaciones…',
    sendingButton: 'Enviando…',
    sendButton: 'Enviar',
    hrFallbackAuthor: 'Recursos Humanos',
  },

  // LoginPage.tsx — the email-OTP sign-in screen (shared by both shells,
  // pre-auth so before any locale switcher is reachable — entirely English
  // source text already, preserved verbatim throughout).
  login: {
    subtitle: 'Sign in with a one-time email code (email OTP).', // already English live
    emailRequestFailed: "We couldn't send the code. Check the email address and try again.", // already English live
    codeVerifyFailed: "That code didn't match. Request a new one and try again.", // already English live
    emailLabel: 'Email', // already English live
    sendingButton: 'Sending…', // already English live
    sendCodeButton: 'Send code', // already English live
    codeSentPrefix: 'We sent a 6-digit code to', // already English live
    codeSentMailhogPrefix: '. In local dev it is visible in MailHog at', // already English live
    codeSentMailhogSuffix: '.', // already English live
    codeLabel: 'Code', // already English live
    verifyingButton: 'Verifying…', // already English live
    verifyAndSignInButton: 'Verify & sign in', // already English live
    useDifferentEmailButton: 'Use a different email', // already English live
  },

  // CitationList.tsx — the numbered source list under a chat answer
  // (Sprint 2b-2 §7): authority badges, page reference, and the "Fuentes"
  // label (10 matches).
  citationList: {
    salaryTableBadge: 'Tabla salarial',
    referenceFactBadge: 'Dato de referencia',
    nationalLawBadge: 'Ley nacional',
    officialConvenioBadge: 'Convenio',
    internalHrRulingBadge: 'Resolución RR. HH.',
    sourceBadge: 'Fuente',
    pagePrefix: 'p.',
    sourcesLabel: 'Fuentes',
    documentFallbackPrefix: 'Documento',
  },

  // TracePanel.tsx — the expandable "how I got here" provenance timeline under
  // a chat answer (design-system §8). Labels for each pipeline step + the
  // summary toggle and reformulation disclosure (14 matches, §A.1). Meta-line
  // Spanish fragments that are StringLiterals (ternary arms) are extracted too
  // so English locale doesn't leave half the timeline in Spanish.
  tracePanel: {
    scopeResolvedLabel: 'Ámbito resuelto',
    guardrailLabel: 'Salvaguarda',
    routedLabel: 'Enrutado',
    salarySqlLabel: 'Salario (SQL)',
    referenceFactLabel: 'Dato de referencia (estructurado)',
    compositionLabel: 'Composición (dato + convenio)',
    convenioCoverageLabel: 'Cobertura del convenio',
    retrievalLabel: 'Recuperación',
    synthesisLabel: 'Síntesis',
    groundingLabel: 'Fundamentación (entailment)',
    decisionLabel: 'Decisión',
    summaryToggle: 'Cómo llegué a esto',
    showReformulationsSummary: 'Ver texto de la(s) reformulación(es)',
    guardrailFiredPrefix: 'activada (',
    guardrailFiredSuffix: ')',
    guardrailClear: 'sin incidencias',
    subqueryCountSuffix: ' subconsulta(s)',
    reformulationCountSuffix: ' reformulación(es)',
    confidencePrefix: ' · confianza ',
    categoryPrefix: ' · categoría: ',
    yearPrefix: ' · año ',
    scopePrefix: ' · ámbito: ',
    validityPrefix: ' · validez: ',
    conflictPrefix: ' · CONFLICTO (',
    conflictFactMid: ': dato ',
    conflictVsConvenio: ' vs convenio ',
    conflictEscalateSuffix: ') → escala, no mezcla',
    convenioGoverns: ' · el convenio gobierna',
    convenioChunkCountSuffix: ' fragmento(s) de convenio sobre el tema',
    pendingIndex: ' · pendiente de indexar',
    neverIngestedMeta: 'convenio nunca cargado · se responde con el Estatuto (mínimos legales)',
    unrecoverableMeta: 'el convenio existe pero no es recuperable · el Estatuto NO lo sustituye (ultraactividad) → escala',
    recallPassesSuffix: ' pasadas (recall)',
    fragmentsScorePrefix: ' fragmentos · score máx. ',
    citationCountSuffix: ' cita(s)',
    groundedOnPrefix: ' · fundamentado en: ',
    claimCountSuffix: ' afirmación(es)',
    groundedVerified: 'verificada',
    groundedUnverified: 'no verificada',
    ungroundedSuffix: ' sin respaldo',
    outcomeAnswer: 'responder',
    outcomeNeedsCategory: 'pedir categoría',
    outcomeEscalate: 'escalar',
    estatutoFallback: ' · base: Estatuto (mínimos legales)',
    convenioPrefix: 'convenio ',
    statusPrefix: ' · estado ',
  },

  // GrafoSection.tsx + GrafoNodeCard.tsx — Knowledge → Map's Grafo section
  // (Sprint 11c, plan.md §C.9 step 8): mode toggle, filter chips, legend
  // caption, and the thin side card (~32 matches). `3D`/`2D` stay bare
  // (allowlisted) — invariant across locale. TYPE_LABEL / STATE_BADGE maps
  // live here as `typeLabels` / `stateLabels`; badge CSS classes stay in
  // the component (same split as `gapMeta`).
  grafo: {
    loadingGraphText: 'Cargando grafo…',
    modeAriaLabel: 'Modo',
    webglUnavailableTitle: 'WebGL no disponible en este navegador',
    webglUnavailableNotice: 'WebGL no disponible — mostrando 2D.',
    filtersAriaLabel: 'Filtros del grafo',
    hideHistoricalChip: 'Ocultar históricos',
    hideUnverifiedAiChip: 'Ocultar IA sin verificar',
    clearFiltersButton: 'Limpiar filtros',
    loadingRendererText: 'Cargando renderizador…',
    captionLegendBeforeFuchsia: 'Verde = conocimiento vigente · Ámbar = borrador · Gris = histórico · ',
    captionFuchsia: 'Fucsia = IA sin verificar',
    captionOrphanDocumentsMid: ' documentos sin vínculo y ',
    captionRejectedFactsSuffix: ' datos rechazados no se dibujan.',
    typeLabels: {
      convenio: 'Convenio',
      document: 'Documento',
      fact: 'Dato de referencia',
      territory: 'Territorio',
      sector: 'Sector',
      topic: 'Tema',
    },
    stateLabels: {
      scope: 'Ámbito',
      active: 'Vigente',
      verified: 'Verificado',
      draft: 'Borrador',
      historical: 'Histórico',
      unverified_ai: 'IA sin verificar',
    },
    foldedTerritoryPrefix: 'Territorio: ',
    foldedSectorPrefix: 'Sector: ',
    foldedNoHubSuffix: ' (sin hub propio — muy pocos convenios).',
    sharedSourcePrefix: 'Fuente compartida: «',
    sharedSourceSuffix: '» — no dibujada como nodo (ver honestidad del grafo).',
    connectionsPrefix: 'Conexiones: ',
    openDocumentButton: 'Abrir documento',
    openReferenceFactButton: 'Abrir dato de referencia',
    viewCoverageButton: 'Ver cobertura',
  },

  // KnowledgeMapPage.tsx — Knowledge → Map toolbar (Jerarquía|Grafo section
  // toggle, lens/view segments, "+ New reference fact", coverage-gap bar)
  // (14 matches, plan.md §A.1 / §C.9 step 8). Several labels are ALREADY
  // English in today's live Spanish UI — preserved verbatim.
  knowledgeMap: {
    sectionAriaLabel: 'Sección',
    hierarchyTab: 'Jerarquía',
    grafoTab: 'Grafo',
    lensAriaLabel: 'Lens', // already English live
    lensTerritory: 'Territory', // already English live
    lensSector: 'Sector', // already English live
    lensValidity: 'Validity', // already English live
    lensTopic: 'Topic', // already English live
    viewAriaLabel: 'View', // already English live
    viewGraph: 'Graph', // already English live
    viewList: 'List', // already English live
    newReferenceFactButton: '+ New reference fact', // already English live
    coverageGapsTitle: 'Coverage gaps', // already English live
    coverageGapsNone: 'None detected.', // already English live
  },

  // Network/HTTP fallback strings (plan.md §A.2, "generic network/HTTP
  // fallback" row) — the one A.2 category that's frontend-mapped in both
  // directions since the string lives in `hr-frontend` already (`api.ts`).
  // `{status}` is replaced by `networkFallbackMessage` in backendMessageMap.ts.
  errors: {
    requestFailed: 'La solicitud falló ({status})',
    uploadFailed: 'La carga falló ({status})',
  },

  // escalationReasons.ts — reason → human label map (Correction-02). Locale-
  // aware twin of statusLabels: the closed enum keys stay in code, the labels
  // live here (11 matches, §A.1).
  escalationReasons: {
    allReasons: 'Todos los motivos',
    labels: {
      low_confidence: 'Baja confianza',
      off_domain: 'Fuera de ámbito',
      sensitive_topic: 'Tema sensible',
      explicit_request: 'Petición explícita',
      salary_coverage_gap: 'Hueco salarial',
      salary_not_in_chat: 'Salario no disponible',
      reference_fact_coverage_gap: 'Hueco en datos de referencia',
      estatuto_fallback_gap: 'Convenio vencido / sin texto vigente',
      conflict: 'Conflicto',
      quality_sample_wrong: 'Muestra de calidad incorrecta',
    } as Record<string, string>,
  },

  // brand.ts — product name (1 match). Identical both locales by design
  // (brand identity); still in the dict so the guard can clear brand.ts.
  brand: {
    productName: 'HR Platform',
  },
} as const;

// `en.ts` must match this exact key structure but, obviously, uses different
// string VALUES. Typing `en.ts` as bare `typeof es` doesn't work: `as const`
// above makes every leaf a string LITERAL type (e.g. `'Mapa'`), so `en.ts`
// assigning `'Map'` to that same key would fail to typecheck against its
// Spanish literal. `Widen` keeps the exact key structure — so a missing or
// extra key is still a `tsc -b` error, the whole point of §B.4.2's
// type-safety story — while relaxing every leaf to plain `string`.
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };
export type Dict = Widen<typeof es>;
