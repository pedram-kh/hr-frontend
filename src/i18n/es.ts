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
    validity: 'Válido', // already English live (DocumentDetailPanel.tsx:255 etc.) — preserved, see comment above
    territory: 'Territorio', // same as `validity` above
    sector: 'Sector', // same word both languages
    type: 'Tipo', // already English live
    topic: 'Tema', // already English live
    dash: '—',
    jobCategory: 'Categoría profesional', // already English live (ReferenceFactPanel.tsx, GroupsQueue.tsx)
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
      guardrails: 'Guardarraíles',
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
    logout: 'Cerrar sesión',
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
          'Navega el corpus por criterio, localiza huecos de cobertura y abre un documento para inspeccionar, probar o editar sus etiquetas.',
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
        description: 'Tasa de resolución (deflection), escalaciones por corrección y agrupación de preguntas — todo reproducible desde los comandos',
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
        heading: 'Gobierno · Modelo de respuesta',
        description: 'Configura la clave del proveedor externo del modelo de respuesta.',
      },
      brandPreview: {
        heading: 'Vista previa de marca',
        description: 'No está en el menú — solo por #view=brand-preview.',
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
    close: 'Cerrar', // already English live
    loadingTitle: 'Cargando…', // already English live
    confirmFailedPrefix: 'No se pudo confirmar: ', // already English live
    scanNoTextNotice: 'Sin texto extraíble: es un PDF escaneado. El etiquetado por IA necesita una capa de texto.', // already English live
    hrRulingBadge: 'Resolución RR. HH.',
    ocrdBadge: 'Con OCR', // already English live
    createdFromEscalation: 'Creada desde la escalación',
    byAgent: 'por',
    viewCard: 'Ver la tarjeta →',
    readOnlyPrefix: 'Solo lectura — no tienes permiso de edición. Puedes consultar, inspeccionar y usar el simulador.',
    noConvenioNotice:
      'Sin convenio: este documento no tiene alcance (el alcance se deriva del convenio), por lo que los empleados no lo recibirán como respuesta.', // already English live
    noTextOcrPrefix: 'Sin texto extraíble: parece un PDF escaneado, solo imagen. Ejecuta', // already English live
    noTextOcrMiddle: 'para hacer el OCR, o vuelve a importar con', // already English live
    suspectedMistagPrefix: 'Posible confusión con tabla salarial: etiquetado como prosa de convenio, pero el nombre parece una tabla.', // already English live
    suspectedMistagEditHint: 'Usa «Cambiar tipo de documento» más abajo → Tablas salariales.', // already English live; "Tablas salariales" is a real backend vocabulary item name (OQ-2 — data, not chrome), kept as-is regardless of locale
    suspectedMistagNoEditHint: 'Un editor de conocimiento puede reetiquetarlo.', // already English live
    aiTaggingUnverified: 'Etiquetado de IA sin verificar —', // already English live
    aiTaggingInert: 'sin efecto',
    aiTaggingUntilConfirm: 'hasta que confirmes.',
    aiTaggingStep1Label: 'Paso 1:',
    aiTaggingStep1Text: 'revisa las sugerencias en fucsia; usa los selectores para aceptar o corregir el convenio, el tipo y la vigencia.', // already English live
    aiTaggingStep2Label: 'Paso 2:',
    aiTaggingStep2Click: 'pulsa',
    confirmTagsButton: 'Confirmar etiquetas', // already English live
    aiTaggingStep2Suffix: '— eso fija el alcance y hace recuperable el documento.', // already English live
    derivedLabel: 'derivado', // already English live
    derivedTitleHint: 'Derivado del convenio — no editable', // already English live
    removedLabel: 'eliminado', // already English live
    scopeHeading: 'Alcance', // already English live
    kvRetrieval: 'Recuperación', // already English live
    kvAuthority: 'Autoridad', // already English live
    kvLanguage: 'Idioma', // already English live
    kvStatus: 'Status', // already English live
    reviewTasksHeading: 'Tareas de revisión', // already English live
    tagsConfirmed: 'Etiquetas confirmadas ✓', // already English live
    resuggestButton: 'Volver a sugerir con IA', // already English live
    proposing: 'Proponiendo…', // already English live
    resuggestTitleNoText: 'Sin texto extraíble: PDF escaneado, no se puede etiquetar con IA', // already English live
    resuggestTitleReady: 'Volver a lanzar la propuesta de etiquetado por IA (en cola)', // already English live
    provenanceHeading: 'Procedencia', // already English live
    adminHashPrefix: 'admin n.º ', // already English live
    aiSuggestedHeading: 'Facetas sugeridas',
    aiSuggestedUnverified: '(sin verificar)', // already English live
    aiUnresolvedNotice: 'La IA no pudo resolver una faceta — mira los valores marcados abajo.', // already English live
    aiSuggestionsNotChanged: 'Son solo sugerencias: NO han cambiado el alcance del documento.', // already English live
    aiSuggestionsEditHint: 'Ajusta abajo si hace falta y luego Confirmar etiquetas para verificar (la escritura humana).', // already English live
    aiSuggestionsNoEditHint: 'Las verifica un editor de conocimiento.', // already English live
    proposeVocabulary: 'Proponer vocabulario', // already English live
    cancelPropose: 'Cancelar', // already English live
    topicsHeading: 'Temas', // already English live
    noTopicsNotice: 'Aún no hay temas etiquetados; ya es posible etiquetarlos manualmente.', // already English live
    removeTopicAriaPrefix: 'Quitar', // already English live
    addTopicPlaceholder: 'Añadir un tema…', // already English live
    addTopicButton: 'Añadir tema', // already English live
    chunkHealthHeading: 'Estado de los fragmentos', // already English live
    zeroChunksNotice: 'Sin fragmentos — este documento no es recuperable y no puede responder. Hay que volver a fragmentarlo (no disponible desde aquí).',
    chunksLabel: 'Fragmentos', // already English live
    tokensLabel: 'Tokens', // already English live
    pagesLabel: 'Páginas', // already English live
    embeddingsLabel: 'Embeddings', // already English live
    embeddingsPresent: 'presentes', // already English live
    embeddingsMissing: 'ausentes', // already English live
    lineageHeading: 'Sucesión', // already English live
    lineageSupersedes: 'sucede a', // already English live
    lineageSupersededBy: 'sucedido por', // already English live
    editLabelsHeading: 'Editar etiquetas', // already English live
    editLabelsNotice:
      'Edición acotada (selectores sobre el vocabulario existente). Territorio y sector se derivan del convenio y no se editan. Cada guardado añade procedencia humana, solo de añadido.', // already English live
    rescopeConvenio: 'Cambiar convenio', // already English live
    retypeDocument: 'Cambiar tipo de documento', // already English live
    selectValuePlaceholder: 'Selecciona un valor…', // already English live
    retagButton: 'Reetiquetar', // already English live
    applyButton: 'Aplicar', // already English live
    rescopeConfirmTitle: '¿Cambiar el convenio de este documento?', // already English live
    retypeConfirmTitle: '¿Pasarlo a tabla salarial?', // already English live
    rescopeConfirmBody:
      'Cambiar el convenio cambia el territorio y el sector derivados — es decir, qué empleados lo reciben como respuesta. Añade procedencia humana y no reescribe el historial.', // already English live
    retypeConfirmBody:
      'Marcarlo como tabla salarial lo saca de la vía de prosa y lo pasa a la vía salarial estructurada (SQL), y lo quita de la recuperación de prosa de convenio. Añade procedencia humana.', // already English live
    retrievalFieldLabel: 'Recuperación', // already English live
    taggingFieldLabel: 'Etiquetado', // already English live
    validFromLabel: 'Vigente desde', // already English live
    validToLabel: 'Vigente hasta', // already English live
    saveLifecycle: 'Guardar vigencia', // already English live
    scopeAffectingSuffix: '(afecta al alcance)', // already English live
    scopeAffectingModalTitle: 'Cambio que afecta al alcance', // already English live
    scopeAffectingModalBody:
      'Cambiar el estado de recuperación o la ventana de vigencia mueve quién puede recibir este documento como respuesta. Añade procedencia humana y no reescribe el historial.', // already English live
    confirmChangeButton: 'Confirmar cambio', // already English live
    originalDocumentHeading: 'Documento original', // already English live
    hideSource: 'Ocultar fuente', // already English live
    viewOriginal: 'Ver original', // already English live
    cantEmbedPrefix: 'No se puede incrustar —', // already English live
    openTheFile: 'abrir el archivo', // already English live
    downloadOrOpen: 'Descargar / abrir el archivo original', // already English live
    sandboxHeading: 'Simulador', // already English live
    sandboxTag: 'solo lectura · no guarda nada', // already English live
    sandboxRunPrefix: 'Ejecuta el proceso de respuesta contra',
    sandboxRunSuffix: 'solo. Las mismas compuertas que en producción; no se guarda ni el chat ni la escalación.', // already English live
    sandboxPlaceholder: '\u00bfcu\u00e1ntos d\u00edas de vacaciones tengo?',
    testButton: 'Probar', // already English live
    running: 'Ejecutando…', // already English live
    outcomeAnswered: 'Respondida',
    outcomeEscalated: 'Escalada',
    outcomeResult: 'resultado', // already English live
    retrievedPrefix: 'recuperados', // already English live
    topScorePrefix: 'máx.', // already English live
    pageAbbr: 'p.',
    draftSummary: 'Borrador que produjo el modelo (no se sirve)', // already English live
    groundingStoppedPrefix: 'Detenido por la compuerta de fundamentación — sin respaldo:', // already English live
    sourcePagesHeading: 'Páginas de origen', // already English live
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
    tabTagging: 'Etiquetado IA', // already English live
    tabReferenceFacts: 'Datos de referencia', // already English live
    tabGroups: 'Grupos', // already English live
    tabVocabulary: 'Propuestas de vocabulario', // already English live
    tabExpiry: 'Vencimiento', // already English live
    facts: {
      intro:
        'Datos de referencia pendientes de verificación — segmentados por IA o creados a mano —', // already English live
      introUncertainFirst: 'primero los más inciertos',
      introRest:
        ', luego menor confianza y, solo en empate, la demanda del tema (un dato manual no trae ninguna de las dos señales, así que cae al final de su tramo). Sin efecto hasta que una persona lo verifique, venga de donde venga. Abre uno para contrastar la fuente (la línea citada si es propuesta de IA, en fucsia; el documento enlazado si es un dato manual) con el alcance asignado.', // already English live
      allTopics: 'Todos los temas', // already English live
      colId: 'Id', // already English live
      colValue: 'Valor', // already English live
      colSource: 'Fuente', // already English live
      colScope: 'Alcance', // already English live
      colGroup: 'Grupo', // already English live
      colTopic: 'Tema', // already English live
      colConf: 'Conf.', // already English live
      colFlags: 'Flags', // already English live
      manualBadge: 'Manual', // already English live
      versionBadge: 'versión',
      resolveVersion: 'Resolver versión',
      noFacts: 'No hay datos pendientes de revisión — la cola está vacía.', // already English live
      totalOne: 'dato', // already English live
      totalMany: 'datos', // already English live
    },
    tagging: {
      introPrefix: 'Documentos', // already English live
      underReview: 'en revisión',
      introSuffix:
        '— no recuperables hasta verificarlos. La IA propone las facetas al importar; primero los de menor confianza. Abre uno para revisar las sugerencias (fucsia) y Confirmar.', // already English live
      colTitle: 'Título', // already English live
      colConvenio: 'Convenio',
      colType: 'Tipo', // already English live
      colConfidence: 'Confianza', // already English live
      colFlags: 'Flags', // already English live
      conflictBadge: 'Conflicto', // already English live
      noTextBadge: 'Sin texto', // already English live
      nothingUnderReview: 'Nada en revisión — la cola está vacía.', // already English live
      totalOne: 'documento', // already English live
      totalMany: 'documentos', // already English live
    },
    vocabulary: {
      introPrefix:
        'Vocabulario propuesto (variante→alias es lo habitual; crear uno nuevo es deliberado). Aprobar escribe en el vocabulario controlado — lo autoriza', // already English live
      introSuffix: '(super_admin). La IA solo propone.', // already English live
      noProposals: 'No hay propuestas de vocabulario abiertas.', // already English live
      looksLikePrefix: '· se parece a n.º ', // already English live
      proposedByPrefix: 'propuesto por', // already English live
      fromDocumentPrefix: '· desde', // already English live
      reject: 'Rechazar', // already English live
      awaitingApproval: 'A la espera de que un super_admin lo apruebe.', // already English live
      totalOne: 'propuesta', // already English live
      totalMany: 'propuestas', // already English live
    },
    expiry: {
      intro: 'Prosa vigente a menos de 90 días del vencimiento (o ya vencida). Confirma un sucesor (solo del mismo convenio) para escribir la sucesión —', // already English live
      introOldDocIs: 'el documento antiguo', // already English live
      introNeverRetired: 'nunca se retira solo',
      introSuffix: '.', // already English live
      nothingExpiringPrefix: 'Nada próximo a vencer — la cola está vacía. (Ejecuta', // already English live
      nothingExpiringSuffix: 'para actualizar.)', // already English live
      totalOne: 'tarea', // already English live
      totalMany: 'tareas', // already English live
      pastBadge: 'Vencido', // already English live
      noConvenio: 'sin convenio', // already English live
      validPrefix: 'vigente', // already English live
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
      noConvenioSuccessionNotice: 'Sin convenio: la sucesión se basa en el alcance, así que no se puede enlazar un sucesor del mismo convenio. Descartar o escalar.', // already English live
      pickSuccessor: 'Elige el sucesor (mismo convenio)…', // already English live
      alsoRetire: 'Retirar también este (histórico)', // already English live
      confirmSuccessionRetire: 'Confirmar sucesión y retirar', // already English live
      confirmSuccessionButton: 'Confirmar sucesión', // already English live
      dismissAction: 'Descartar (renovado en el sitio / sin acción)', // already English live
      escalateAction: 'Escalar', // already English live
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
    colEmail: 'Correo',
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
    noTopicScopeWarning: 'Sin tema, la verja de conflicto bloquea por alcance completo (sobreprotege). Asigna un tema para afinarla.',
    publishedLosslessPrefix: 'Publicada —',
    publishedLosslessSuffix: 'fragmento(s) indexados (texto íntegro verificado).',
    publishedMismatch: 'Publicada, pero el texto indexado NO coincide exactamente con el escrito (revisar — posible mangling).',
    acknowledgeComparisonUnavailable: 'He revisado el convenio vigente por mi cuenta y confirmo que esta resolución no lo contradice.',
    acknowledgeReadPassages: 'He leído los pasajes y confirmo que esta resolución no se solapa con el convenio vigente.',
    publishing: 'Publicando…',
    publishWithConfirmation: 'Publicar con esta confirmación',
    publishAsKnowledgeButton: 'Publicar como conocimiento',
    markResolved: 'Marcar como resuelta',
    confirmScopeAriaLabel: 'Confirmar alcance',
    confirmScopeTitle: '¿Publicar e heredar el alcance del empleado?',
    confirmScopeBody:
      'La resolución se publicará como internal_hr_ruling heredando el convenio del empleado (territorio y sector incluidos) y pasará a responder a otras personas de ese alcance. No puede prevalecer sobre un convenio oficial vigente para el mismo alcance y tema (se bloqueará si lo hace).',
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
      'off_domain.router_off_domain': 'Fuera de alcance',
      'off_domain.admin_off_domain': 'Fuera de alcance (admin)',
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
      'low_confidence.period_unsupported': 'Periodo pasado no soportado',
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
      'quality_sample_wrong.wrong_scope': 'Alcance incorrecto',
      'quality_sample_wrong.wrong_figure': 'Cifra incorrecta',
      'quality_sample_wrong.stale_document': 'Documento desactualizado',
      'quality_sample_wrong.unclear': 'Respuesta poco clara',
      'quality_sample_wrong.other': 'Otro motivo',
      'estatuto_fallback_gap.expired_no_successor': 'Convenio vencido sin sucesor',
      'estatuto_fallback_gap.tagging_under_review': 'Etiquetado sin verificar',
      'estatuto_fallback_gap.scan_no_text': 'Escaneo sin texto',
      'estatuto_fallback_gap.not_yet_embedded': 'Indexado pendiente',
      // Sprint 13 (plan.md §D.12) — the five agent-engine reasons.
      'general_lane_blocked.question_prescreen': 'Pregunta con dato concreto',
      'general_lane_blocked.figure': 'Cifra en respuesta general',
      'general_lane_blocked.entitlement_language': 'Lenguaje de derecho concreto',
      'general_lane_blocked.shape': 'Borrador general que no cumple la forma',
      'general_lane_blocked.ungrounded': 'Respuesta sin fuente verificable',
      'profile_incomplete.professional_group': 'Falta grupo profesional',
      'profile_incomplete.job_category': 'Falta categoría',
      'profile_incomplete.seniority': 'Falta fecha de alta',
      'profile_incomplete.contract_type': 'Tipo de contrato no registrado',
      'profile_incomplete.asserted_differs': 'Dato afirmado distinto al del Directorio',
      'employee_requested_review.answer_reviewed': 'Revisión pedida por el empleado',
      'planner_escalated.off_domain': 'Derivado: fuera de alcance',
      'planner_escalated.unsafe': 'Derivado: no seguro de responder',
      'planner_escalated.unanswerable': 'Derivado: sin respuesta posible',
      'planner_escalated.needs_human_judgement': 'Derivado: necesita criterio humano',
      'planner_escalated.other': 'Derivado: otro motivo',
      'tool_budget_exhausted.rounds': 'Límite de rondas',
      'tool_budget_exhausted.tool_calls': 'Límite de búsquedas',
      'tool_budget_exhausted.clarifications': 'Límite de aclaraciones',
      'tool_budget_exhausted.wall_clock': 'Límite de tiempo',
      'tool_budget_exhausted.malformed': 'Llamada inválida repetida',
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
    heading: 'Dato de referencia', // already English live
    loadingText: 'Cargando…', // already English live (distinct from `common.loading`'s Spanish 'Cargando…', which is NOT what this file showed)
    typeBadge: 'dato', // glossary: "dato (de referencia)" → translate for en.ts only
    aiProposalBadge: 'Propuesta de IA', // already English live
    manualBadge: 'Manual', // already English live
    badgeVerified: 'verificado', // already English live
    badgeNeedsReview: 'pendiente de revisión', // already English live
    badgeRejected: 'rechazado', // already English live
    closeAriaLabel: 'Cerrar', // already English live
    readOnlyNoticePrefix: 'Solo lectura — no tienes el permiso', // already English live
    readOnlyNoticeSuffix: 'para editar.', // already English live
    aiProposalNoticeBold: 'Propuesta segmentada por IA — sin verificar.', // already English live
    aiProposalNoticeRest:
      'Contrasta el alcance con la línea de origen citada abajo antes de verificar. El agente solo propone; nunca se verifica a sí mismo.', // already English live
    confidencePrefix: 'Confianza:', // already English live
    versionDuplicateBold: 'Posible versión o duplicado', // already English live
    versionDuplicatePrefix: '— mismo alcance que un dato existente, con otro valor («', // already English live
    versionDuplicateSuffix: '»). Decide cuál es el válido y desde cuándo.', // already English live
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
    inertNoticeBold: 'Sin efecto hasta verificarlo', // already English live
    inertNoticeRest: 'este dato no se puede responder hasta que una persona lo verifique (una vez verificado, puede servirse tal cual como respuesta vigente).', // already English live
    sourceLineHeading: 'Línea de origen (comprueba el alcance)', // already English live
    valueHeading: 'Valor', // already English live
    rawValuesSummary: 'Original (raw_values)', // already English live
    scopeHeading: 'Alcance', // already English live
    groupLabel: 'Grupo', // already English live
    noJobCategoryFallback: '— (todo el convenio)', // already English live
    authorityLabel: 'Autoridad', // already English live
    authorityLockTitle: 'Un dato de referencia nunca puede estar por encima de un convenio (forzado en el esquema y en la validación).', // already English live
    sourceLabel: 'Fuente', // already English live
    sourceManual: 'manual', // already English live
    statusLabel: 'Status', // already English live
    verifiedByPrefix: 'por', // already English live
    noSourceDocLinked: 'Sin documento de origen enlazado', // already English live
    verifying: 'Verificando…', // already English live
    verifyProposal: 'Verificar propuesta', // already English live
    verifyFact: 'Verificar dato', // already English live
    cancelEdit: 'Cancelar edición', // already English live
    fixThenVerify: 'Corregir y verificar', // already English live
    editButton: 'Editar', // already English live
    rejecting: 'Rechazando…', // already English live
    rejectButton: 'Rechazar', // already English live
    resegmentTitle: 'Volver a ejecutar el agente de segmentación sobre la fuente (actualización idempotente)', // already English live
    resegmentButton: 'Re-segmentar fuente', // already English live
    provenanceHeading: 'Procedencia', // already English live
    adminHashPrefix: 'admin n.º ', // already English live
    validityStartLabel: 'Inicio de vigencia', // already English live
    validityEndLabel: 'Fin de vigencia', // already English live
    sourceLocatorLabel: 'Localizador de la fuente', // already English live
    sourceLocatorPlaceholder: 'p.3 §2 / sheet:smi26', // already English/technical live
    authorityLockedPrefix: 'La autoridad está fijada en', // already English live
    authorityLockedSuffix: '— no se puede subir.', // already English live
    saving: 'Guardando…', // already English live
    confirmScopeChangeAriaLabel: 'Confirmar cambio de alcance', // already English live
    scopeChangeTitle: 'Cambio de alcance', // already English live
    scopeChangeBody: 'Esto cambia la vigencia o el alcance del dato (a qué empleados respondería). Confirma para aplicar.', // already English live
    confirmChangeButton: 'Confirmar cambio', // already English live
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
      wrong_scope: 'Alcance incorrecto',
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
    loadingText: 'Cargando…', // already English live (distinct from `common.loading`'s Spanish 'Cargando…')
    colMonth: 'Mes',
    colQuestion: 'Pregunta',
    colStratum: 'Estrato',
    colTerritory: 'Territorio',
    colVerdict: 'Veredicto',
    colReviewer: 'Revisor',
    colCard: 'Tarjeta',
    viewAnswerSummary: 'Ver respuesta',
    stratumPathFallback: 'prosa', // already English live — a technical fallback token, not prose-about-prose
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
  // glossary: alcance (not ámbito) → "scope". See sprint-12a/glossary.md.
  guardrailsPage: {
    reasonLabels: {
      low_confidence: 'Baja confianza',
      salary_coverage_gap: 'Hueco en tablas salariales',
      off_domain: 'Fuera de alcance',
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
    blockedTopicsHeading: 'Temas bloqueados y fuera de alcance',
    blockedTopicsIntro1: 'Lista',
    blockedTopicsIntroBold: 'aditiva',
    blockedTopicsIntro2:
      'sobre la base fija: cada entrada añade una escalación, nunca quita una. Se compara como texto literal (sin acentos, por palabra completa) — no como expresión regular. Una pregunta bloqueada escala',
    blockedTopicsIntroBold2: 'antes',
    blockedTopicsIntro3: 'de llegar al proveedor.',
    noEntriesYet: 'Sin entradas todavía.',
    kindOffDomainBadge: 'Fuera de alcance',
    kindSensitiveTopicBadge: 'Tema sensible',
    disableButton: 'Desactivar',
    disabledLabel: 'desactivado',
    addPatternPlaceholder: 'palabra o frase',
    addButton: 'Añadir',
    offDomainHeading: 'Mensaje de «fuera de alcance»',
    offDomainIntro: 'Texto que se muestra al escalar por estar fuera de alcance. Solo afecta al texto; no cambia ninguna decisión.',
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
    generalLaneHeading: 'Lane de conocimiento general',
    generalLaneIntro: 'Permite que el asistente explique un concepto laboral en términos generales (nunca cifras ni derechos concretos) cuando el convenio no tiene el dato. Solo puedes restringirlo: no puede activarse aquí si está desactivado a nivel de despliegue.',
    generalLaneEnvOffNote: 'Desactivado a nivel de despliegue — este interruptor no tiene efecto hasta que se active ahí.',
    generalLaneToggleLabel: 'Activar el lane de conocimiento general',
    generalLaneEffectiveLabel: 'Valor efectivo:',
    generalLaneEffectiveOn: 'activado',
    generalLaneEffectiveOff: 'desactivado',
    generalLaneModelHeading: 'Conocimiento general del modelo (sin página oficial)',
    generalLaneModelIntro: 'Cuando ninguna página oficial del catálogo sirve, permite responder con el conocimiento general del modelo: sin cifras, sin derechos concretos, sin citas y con una frase final que remite al convenio o a RR. HH. Solo puedes restringirlo: no puede activarse aquí si está desactivado a nivel de despliegue.',
    generalLaneModelEnvOffNote: 'Desactivado a nivel de despliegue — este interruptor no tiene efecto hasta que se active ahí.',
    generalLaneModelLaneOffNote: 'El lane de conocimiento general está desactivado, así que esta opción no tiene efecto.',
    generalLaneModelToggleLabel: 'Permitir respuestas con conocimiento general del modelo',
    catalogueHeading: 'Páginas oficiales del lane',
    catalogueIntro: 'Páginas que el lane puede consultar para fundamentar una respuesta. Solo se admiten direcciones https de los dominios oficiales permitidos (la lista se fija en el despliegue, no aquí). Añadir una página cambia en qué puede apoyarse el lane, nunca lo que tiene permitido decir. No se borra nada: se desactiva.',
    catalogueDomainsLabel: 'Dominios permitidos:',
    catalogueBaselineTag: 'de serie',
    catalogueDisabledTag: 'desactivada',
    catalogueTopicsPrefix: 'Temas: ',
    catalogueEmpty: 'No hay páginas en el catálogo.',
    catalogueEnableButton: 'Activar',
    catalogueDisableButton: 'Desactivar',
    catalogueAddSubheading: 'Añadir una página',
    catalogueTitleLabel: 'Título',
    catalogueUrlLabel: 'Dirección (https)',
    catalogueUrlPlaceholder: 'https://www.sepe.es/…',
    catalogueTopicsLabel: 'Temas (separados por comas)',
    catalogueTopicsHelp: 'Con y sin tilde, porque la coincidencia con la pregunta distingue tildes. Ejemplo: excedencia, excedencias',
    catalogueAddButton: 'Añadir página',
    catalogueAddingButton: 'Añadiendo…',
    catalogueAddFailedError: 'No se pudo añadir la página.',
    catalogueUpdateFailedError: 'No se pudo actualizar la página.',
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
    convenioWideScopeNotice: 'alcance convenio — no se acota',
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
    alsoBindsSuffix: 'Vincúlalo allí también o su alcance quedará incompleto.',
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
    // Sprint 13, build step 8 (plan.md §E.15) — a THIRD, independent bucket
    // (see `HistoryController::index()`'s own validation comment).
    outcomeAskedOnlyOption: 'Solo con pregunta aclaratoria',
    askedBadge: 'Pregunta aclaratoria',
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
    heading: 'Nuevo dato de referencia', // already English live
    requiredFieldsError: 'Hacen falta un convenio y un valor.', // already English live
    convenioRequiredLabel: 'Convenio *', // already English live
    selectConvenioPlaceholder: 'Selecciona un convenio…', // already English live
    derivedScopePrefix: 'Alcance derivado:', // already English live
    derivedScopeSuffix: '(territorio y sector van con el convenio — no editables)', // already English live
    jobCategoryOptionalLabel: 'Categoría profesional (opcional)', // already English live
    convenioWideOption: 'Todo el convenio', // already English live
    topicOptionalLabel: 'Tema (opcional)', // already English live
    noTopicOption: 'Sin tema', // already English live
    valueRequiredLabel: 'Valor *', // already English live
    valuePlaceholder: 'periodo de prueba 90/75 días', // intentionally untranslated: a real convenio value example, not UI chrome
    originalTextOptionalLabel: 'Texto original (en bruto, opcional)', // already English live
    rawTextPlaceholder: 'Pega la redacción literal de la fuente (se guarda en raw_values)…', // already English live
    sourceDocumentOptionalLabel: 'Documento de origen (opcional)', // already English live
    noSourceLinkOption: 'Sin enlace a la fuente', // already English live
    sourceLocatorOptionalLabel: 'Localizador de la fuente (opcional)', // already English live
    authorityPrefix: 'Autoridad:', // already English live
    lockedSuffix: '— fijada.', // already English live
    authorityNeverOutrankNotice: 'Un dato de referencia nunca puede estar por encima de un convenio.', // already English live
    willLandPrefix: 'El dato quedará', // already English live
    willLandSuffix: '— verifícalo desde su ficha para que cuente.', // already English live
    creating: 'Creando…', // already English live
    createFactButton: 'Crear dato', // already English live
    cancelButton: 'Cancelar', // already English live
    readerHeading: 'Fuente de referencia', // already English live
    readerIntroPrefix: 'Lee un .docx/.xlsx que no sea salarial para introducir datos a mano. Etiquetarlo', // already English live
    readerIntroSuffix: 'lo mantiene fuera de la vía salarial.', // already English live
    uploadLabel: 'Subir una fuente nueva (.docx / .xlsx)', // already English live
    uploadingText: 'Subiendo y leyendo…', // already English live
    uploadedNote: 'Subido — selecciónalo abajo para leer el contenido.', // already English live
    openSourceLabel: 'Abrir una fuente', // already English live
    selectSourcePlaceholder: 'Selecciona una fuente de referencia…', // already English live
    loadingContentText: 'Cargando contenido…', // already English live
    noExtractableContent: '(sin contenido extraíble)', // already English live
    sectionPrefix: 'Sección', // already English live
    useAsLocatorTitle: 'Usar como localizador de la fuente', // already English live
    useLocatorButton: 'usar localizador', // already English live
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
    colEmail: 'Correo',
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
    supersedeSuccessMsg: 'Sucedido — se ha cerrado la vigencia del dato anterior. No se ha borrado ninguno.',
    coexistSuccessMsg: 'Marcados como coexistentes — los dos siguen pudiendo responder.',
    rejectSuccessMsg: 'Descartado como duplicado — ya no puede responder.',
    heading: 'Resolver versión',
    readOnlyPrefix: 'Solo lectura — necesitas',
    readOnlySuffix: 'para resolver una versión.',
    resolvedNotice: 'Este par ya está resuelto. El enlace se conserva como linaje de versiones; nada se ha borrado.',
    noticeIntro: 'Dos hechos del mismo alcance y tema con valores distintos. Decide si uno',
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
    uploadFolderLabel: 'Subir documento', // already English live
    convenioFilterPrefix: 'Convenio n.º ', // already English live
    removeConvenioFilterAriaLabel: 'Quitar filtro de convenio', // the one Spanish string in an otherwise-English toolbar — translated for en.ts, preserved verbatim here
    ingestingPrefix: 'Importando', // already English live
    ingestingSuffix: 'archivo(s)…', // already English live
    ingestedLabel: 'Importados', // already English live
    skippedLabel: 'omitidos', // already English live
    failedLabel: 'fallidos', // already English live
    ingestFailedPrefix: 'No se pudieron importar estos archivos:', // already English live
    documentWord: 'documento', // already English live
    documentsWordPlural: 'documentos', // already English live
    allStatusesOption: 'Todos los estados', // already English live
    autoProposedOption: 'Propuesta automática', // already English live
    underReviewOption: 'En revisión', // already English live
    verifiedOption: 'Verificado', // already English live
    conflictsOnlyLabel: 'Solo conflictos', // already English live
    titleHeader: 'Título', // already English live
    flagsHeader: 'Flags', // already English live
    conflictBadge: 'Conflicto', // already English live
    noTextBadge: 'Sin texto', // already English live
    nationalBadge: 'Nacional', // already English live
    noDocumentsMatchFilters: 'Ningún documento coincide con estos filtros.', // already English live
    noDocumentsYet: 'Aún no hay documentos — sube una carpeta de convenio para importarla.', // already English live
    prevButton: '‹ Ant.', // already English live
    nextButton: 'Sig. ›', // already English live
    pagePrefix: 'Página', // already English live
    pageOfConnector: 'de', // already English live
  },

  // AnalyticsPage.tsx — the Analítica screen (Sprint 8 step 7, ADR-0030):
  // KPI tiles, path/authority split charts, the escalations-by-fix table,
  // question clustering, and the unanswered ranking (25 matches, plan.md
  // §A.1). Mostly Spanish source text; `loadingText` is the one already-
  // English string (verbatim), and `fixLinkFallback` reuses
  // `escalationCard.fixLinkLabel`'s identical "Corregir" rather than
  // duplicating it.
  analyticsPage: {
    loadingText: 'Cargando…', // already English live
    periodPrefix: 'Periodo',
    periodNote: 'La tasa de resolución excluye «necesitan categoría» del denominador.',
    kpiDeflectionRateLabel: 'Tasa de resolución (deflection)',
    kpiAnsweredLabel: 'Respondidas',
    kpiEscalatedLabel: 'Escaladas',
    kpiNeedsCategoryLabel: 'Necesitan categoría',
    kpiNeedsCategorySub: 'excluido del denominador',
    // Sprint 13, build step 8 (plan.md §E.15) — the agent engine's own
    // `ask_employee` figure, same "excluded from the denominator" posture.
    kpiAskLabel: 'Pregunta aclaratoria',
    kpiAskSub: 'excluido del denominador',
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
    scoreLabel: 'puntuación',
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
      label: 'Sin respuesta posible',
      hint: 'Documento vigente con 0 fragmentos indexados (p. ej. un PDF escaneado, o aún en revisión) — no puede responder.',
    },
    expired_no_successor: {
      label: 'Sin sucesor vigente',
      hint: 'Solo queda prosa histórica para este alcance — no hay versión vigente desde la que responder (hueco de cobertura).',
    },
    suspected_mistag: {
      label: 'Posible error de etiquetado',
      hint: 'Etiquetado como prosa de convenio, pero el título o el nombre de archivo dice «tabla» — probable tabla salarial. Lo decide una persona (reetiquetar en la ficha).',
    },
    date_expired_active: {
      label: 'Fecha vencida (sigue vigente)',
      hint: 'El fin de vigencia ya pasó, pero el documento sigue activo — señal de obsolescencia, no un hueco. El alcance aún se puede responder.',
    },
    unscoped: {
      label: 'Sin alcance',
      hint: 'Un documento no nacional sin convenio no tiene alcance (el alcance va ligado al convenio).',
    },
    SCAN_NO_TEXT: {
      label: 'Escaneo, sin texto',
      hint: 'Hay documento(s) de prosa vigentes, pero con 0 fragmentos indexados (p. ej. un PDF escaneado) — no puede responder.',
    },
    UNDER_REVIEW_SCOPE: {
      label: 'Alcance en revisión',
      hint: 'Hay documento(s) de prosa, pero el etiquetado aún no está verificado — el alcance es provisional y todavía no se puede responder.',
    },
    EXPIRED_NO_SUCCESSOR: {
      label: 'Vencido, sin sucesor',
      hint: 'Solo hay prosa histórica o vencida en esta celda — no hay sucesor vigente desde el que responder.',
    },
    SALARY_PDF_NOT_IMPORTED: {
      label: 'PDF salarial no importado',
      hint: 'Existe un PDF salarial, pero aún no se ha convertido ni importado a la tabla salarial.',
    },
    FACT_NEEDS_REVIEW: {
      label: 'Dato pendiente de revisión',
      hint: 'Hay un dato de referencia propuesto, pero ninguna persona lo ha verificado todavía.',
    },
    NO_SALARY_SOURCE: {
      label: 'Sin fuente salarial',
      hint: 'No hay tabla salarial, ni tampoco PDF salarial — aún no hay nada que importar.',
    },
    coverage_gap_unclassified: {
      label: 'Hueco sin clasificar',
      hint: 'Esta celda no está cubierta y no encaja en un motivo conocido — hay que investigarlo a mano.',
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
      super_admin: 'Superadministrador',
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
    proposeForPrefix: 'Proponer vocabulario para', // already English live
    foldIntoPrefix: 'Incorporar a', // already English live
    foldAsAliasLabel: 'como alias', // already English live
    similarityPrefix: '(similitud', // already English live
    percentCloseParen: '%)', // already English live
    foldIntoExistingLabel: 'Incorporar a un valor existente', // already English live
    nothingCloseFoundHint: '(no se encontró nada lo bastante parecido)', // already English live
    createNewPrefix: 'Crear un nuevo', // already English live
    deliberateHint: '(deliberado)', // already English live
    levelLabel: 'Nivel', // already English live
    convenioBlockedNotice: 'Los convenios los crea la importación del registro, no este flujo. Incorpora la grafía a un convenio existente.', // already English live
    approveAsAliasButton: 'Aprobar como alias', // already English live
    proposeOnlyButton: 'Proponer (lo aprueba un super_admin)', // already English live
    approveAsNewValueButton: 'Aprobar como valor nuevo', // already English live
    foldedMsgPrefix: 'Se incorporó «', // already English live
    foldedMsgMid: '» a', // already English live
    foldedMsgSuffix: '.', // already English live
    createdNewMsgPrefix: 'Se creó un', // already English live
    createdNewMsgMid: '“', // already English live
    createdNewMsgSuffix: '”.', // already English live
    proposedMsgPrefix: 'Se propuso «', // already English live
    proposedMsgSuffix: '» — un super_admin lo aprobará.', // already English live
    foldedExistingMsg: 'Incorporado al valor existente.', // already English live
    createdNewValueMsg: 'Se creó el valor nuevo.', // already English live
    topicNoAliasNotice: 'Los temas no tienen mecanismo de alias: las variantes de grafía se resuelven en el código, no aquí.', // already English live
  },

  // CoveragePage.tsx — the Cobertura screen (Sprint 8, plan.md §5, ADR-0030):
  // graph/list toggle, export/refresh controls, and the two ranked-gap
  // sections + trend chart below the Hierarchy map (17 matches, §A.1).
  coveragePage: {
    viewGroupAriaLabel: 'Vista', // already English live
    graphButton: 'Gráfico', // already English live
    listButton: 'Lista', // already English live
    exportingButton: 'Exportando…',
    exportButton: '↓ Exportar (.md)',
    refreshButton: '↻ Actualizar',
    asOfPrefix: 'a fecha de',
    loadingText: 'Cargando…', // already English live
    fullGapHeadingPrefix: 'Convenios con brecha total',
    fullGapIntro: 'Ni prosa, ni salario, ni datos, ni resoluciones — ordenados por plantilla afectada.',
    personWord: 'persona',
    personsWordPlural: 'personas',
    viewLink: 'Ver',
    noFullGapConvenios: 'Ningún convenio con brecha total.',
    noRegistryHeadingPrefix: 'Alcances sin convenio de registro',
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
    loadingMapText: 'Cargando mapa…', // already English live
    noTopicsNotice: 'Aún no hay temas etiquetados. Puedes etiquetar temas a mano desde la ficha del documento.', // already English live
    nothingToShowNotice: 'Nada que mostrar para este criterio todavía.', // already English live
    factBadgeTitle: 'Dato de referencia estructurado', // already English live
    emptyChildren: '(vacío)', // already English live
    itemWord: 'elemento', // already English live
    itemsWordPlural: 'elementos', // already English live
  },

  // Pager.tsx — the shared pager control (Sprint 8, used by ReviewQueuePage
  // 4x and QualitySampleQueue once). Same "‹ Prev"/"Next ›"/"Page X of Y"
  // text as `documentsPage`'s own copy-pasted inline pager, kept as its own
  // namespace since this is a distinct, reused component (1 match, §A.1).
  pager: {
    prevButton: '‹ Ant.', // already English live
    pagePrefix: 'Página', // already English live
    pageOfConnector: 'de', // already English live
    nextButton: 'Sig. ›', // already English live
  },

  // charts.tsx — the shared chart primitives (KpiTile/BarChart/LineChart,
  // Sprint 8 §10, ADR-0030) used across CoveragePage/AnalyticsPage (4 matches).
  charts: {
    noDataText: 'Sin datos.',
    trendChartAriaLabel: 'gráfico de tendencia', // already English live
  },

  // ProtectedRoute.tsx — the route guard's loading state (1 match).
  protectedRoute: {
    loadingText: 'Cargando…', // already English live
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
    welcomeText: 'Pregúntame sobre tu convenio: jornada, vacaciones, permisos, festivos… Te respondo según tu alcance, citando las fuentes.',
    faqAriaLabel: 'Preguntas frecuentes',
    sendFailed: 'No se pudo enviar la pregunta. Inténtalo de nuevo.',
    myCategoryPrefix: 'Mi categoría: ',
    pickFailed: 'No se pudo enviar la selección. Inténtalo de nuevo.',
    thinking: 'Pensando…',
    inputPlaceholder: 'Escribe tu pregunta sobre convenio, jornada, vacaciones…',
    sendingButton: 'Enviando…',
    sendButton: 'Enviar',
    hrFallbackAuthor: 'Recursos Humanos',
    // Sprint 13, build step 8 (plan.md §D.13/§E.15) — the review button under
    // an answered turn, and the `ask` outcome's own badge.
    reviewButtonLabel: '¿Quieres que lo revise RR. HH.?',
    reviewSendingButton: 'Enviando…',
    reviewSentNote: 'RR. HH. revisará esta respuesta.',
    askBadge: 'Pregunta aclaratoria',
    generalLaneBadge: 'Información general',
    generalLaneBadgeModel: 'Información general · sin fuente verificada',
    generalLaneMoreInfo: 'Más información:',
  },

  // LoginPage.tsx — the email-OTP sign-in screen (shared by both shells,
  // pre-auth so before any locale switcher is reachable — entirely English
  // source text already, preserved verbatim throughout).
  login: {
    subtitle: 'Entra con un código de un solo uso enviado por correo.', // already English live
    emailRequestFailed: 'No pudimos enviar el código. Revisa el correo e inténtalo de nuevo.', // already English live
    codeVerifyFailed: 'Ese código no coincide. Pide otro e inténtalo de nuevo.', // already English live
    emailLabel: 'Correo', // already English live
    sendingButton: 'Enviando…', // already English live
    sendCodeButton: 'Enviar código', // already English live
    codeSentPrefix: 'Enviamos un código de 6 dígitos a', // already English live
    codeSentMailhogPrefix: '. In local dev it is visible in MailHog at', // already English live
    codeSentMailhogSuffix: '.', // already English live
    codeLabel: 'Código', // already English live
    verifyingButton: 'Verificando…', // already English live
    verifyAndSignInButton: 'Verificar y entrar', // already English live
    useDifferentEmailButton: 'Usar otro correo', // already English live
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
    scopeResolvedLabel: 'Alcance resuelto',
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
    scopePrefix: ' · alcance: ',
    validityPrefix: ' · validez: ',
    conflictPrefix: ' · CONFLICTO (',
    conflictFactMid: ': dato ',
    conflictVsConvenio: ' vs convenio ',
    conflictEscalateSuffix: ') → escala, no mezcla',
    convenioGoverns: ' · el convenio gobierna',
    // Slice 13d (ADR-0037): several verified facts answered together (or refused together).
    factSetPrefix: ' · datos ',
    factSetComplementary: ' (complementarios)',
    factSetOmitted: ' · omitidos: ',
    factSetConflictPrefix: ' · CONFLICTO datos ',
    factSetConflictSameQuantity: ' (misma magnitud) → escala, no mezcla',
    factSetConflictNoKeys: ' (sin magnitudes nombradas que los distingan) → escala, no mezcla',
    factSetConflictFlagged: ' (versiones pendientes de resolver) → escala, no mezcla',
    factSetSharedKeys: ' · magnitud común: ',
    compositionFactsOffered: ' · datos ofrecidos: ',
    compositionFactsCited: ' · citados: ',
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
    // Sprint 13, build step 8 (plan.md §D.12/§E.15) — the agent engine's own
    // section (`trace.agent`), absent entirely on a classic-engine turn.
    agentPlannerLabel: 'Planificador',
    agentRound0Label: 'Ronda 0 (atajo determinista)',
    agentPlannerRoundLabel: 'Ronda del planificador',
    agentNoCallsMeta: 'sin llamadas',
    agentToolCallLabel: 'Llamada a herramienta',
    agentToolDeniedLabel: 'Herramienta denegada',
    agentFinalizeLabel: 'Finalizar',
    agentPlannerEscalateLabel: 'Escalado por el planificador',
    // A `rule_verdict` step is recorded only when a rule objected (deny / rewrite / force_*): show WHICH rule and WHAT it did.
    agentRuleVerdictLabel: 'Regla',
    agentRuleNoObjectionsMeta: 'sin objeciones',
    agentRuleVerdictDeny: 'denegó la llamada',
    agentRuleVerdictRewrite: 'reescribió la llamada',
    agentRuleVerdictForceEscalate: 'forzó el escalado',
    agentRuleVerdictForceFinish: 'forzó el cierre con la respuesta',
    agentRuleVerdictForceAsk: 'forzó una pregunta',
    agentBudgetLabel: 'Presupuesto del agente',
    agentRoundsPrefix: 'rondas máx. ',
    agentToolCallsPrefix: 'llamadas máx. ',
    agentAsksPrefix: 'preguntas previas ',
    agentTerminationPrefix: ' · terminación: ',
    // Sprint 13b (plan.md §6.1) — the planner's question normalization: what the employee wrote, what the
    // planner proposed, and whether the validator let it through.
    agentNormalizationLabel: 'Normalización de la pregunta',
    agentRound1aLabel: 'Ronda 1a (ruta de dato verificado)',
    normVerdictAccepted: 'aceptada',
    normVerdictRejected: 'descartada',
    normVerdictDeclined: 'sin normalización útil',
    normVerdictAbsent: 'no propuesta',
    normShowDetailSummary: 'Ver la normalización',
    laneLabel: 'Lane de conocimiento general',
    laneBasisModel: 'conocimiento del modelo (sin página)',
    laneBasisWeb: 'página oficial',
    laneBasisUnknown: 'origen no registrado',
    laneWords: 'palabras',
    laneBlockedPostcheck: 'bloqueada por la comprobación posterior',
    laneBlockedShape: 'bloqueada por la forma (cita, longitud o cierre)',
    laneNotBlocked: 'sin bloqueo',
    laneSourcesPrefix: 'Fuentes: ',
    laneWebAttemptedPrefix: 'Se intentó una página: ',
    laneYes: 'sí',
    laneNo: 'no',
    laneFetchErrorPrefix: 'Error al leer: ',
    laneGroundingPrefix: 'Verificación contra la fuente: ',
    laneGroundingVerified: 'verificada',
    laneGroundingUnverified: 'no verificada',
    laneGroundingNotApplicable: 'no aplica (no hay fuente)',
    lanePostcheckPrefix: 'Comprobación posterior: ',
    lanePass: 'pasa',
    laneShapePrefix: 'Forma: ',
    laneDraftPrefix: 'Borrador: ',
    lanePromptPrefix: 'Prompt sha256: ',
    laneShowDetailSummary: 'Ver el detalle del lane',
    normLiteralPrefix: 'Pregunta original: ',
    normCanonicalPrefix: 'Forma normalizada: ',
    normTopicPrefix: 'Tema: ',
    normConfidencePrefix: 'Confianza: ',
    normTopicDropped: 'tema descartado por baja confianza',
    normVerdictPrefix: 'Veredicto: ',
    normRejectedByPrefix: 'Motivo: ',
    normRound1aRan: 'Ronda 1a: ejecutada',
    normRound1aSkippedPrefix: 'Ronda 1a: no ejecutada — ',
    normSkipToolUnavailable: 'herramienta no disponible',
    normSkipCompound: 'pregunta compuesta',
    normSkipFollowUp: 'no es el primer turno',
    normSkipNoVerifiedFact: 'sin dato verificado para el tema',
    normConsumerPrefix: 'Uso: ',
    normScoresLabel: 'puntuación literal → normalizada → unión',
    normRescuedSuffix: ' · rescate (la normalización desbloqueó la respuesta)',
    normNone: '—',
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
      scope: 'Alcance',
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
    lensAriaLabel: 'Criterio', // already English live
    lensTerritory: 'Territorio', // already English live
    lensSector: 'Sector', // already English live
    lensValidity: 'Válido', // already English live
    lensTopic: 'Tema', // already English live
    viewAriaLabel: 'Vista', // already English live
    viewGraph: 'Gráfico', // already English live
    viewList: 'Lista', // already English live
    newReferenceFactButton: '+ Insertar nuevo dato de referencia', // already English live
    coverageGapsTitle: 'Brechas de cobertura', // already English live
    coverageGapsNone: 'Ninguno detectado.', // already English live
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
      off_domain: 'Fuera de alcance',
      sensitive_topic: 'Tema sensible',
      explicit_request: 'Petición explícita',
      salary_coverage_gap: 'Hueco salarial',
      salary_not_in_chat: 'Salario no disponible',
      reference_fact_coverage_gap: 'Hueco en datos de referencia',
      estatuto_fallback_gap: 'Convenio vencido / sin texto vigente',
      conflict: 'Conflicto',
      quality_sample_wrong: 'Muestra de calidad incorrecta',
      // Sprint 13 (plan.md §D.12) — the five agent-engine reasons.
      general_lane_blocked: 'Información general bloqueada',
      profile_incomplete: 'Perfil incompleto',
      employee_requested_review: 'Revisión pedida por el empleado',
      planner_escalated: 'Derivado por el asistente',
      tool_budget_exhausted: 'Límite de pasos alcanzado',
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
