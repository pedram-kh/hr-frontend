import { useCallback, useEffect, useState } from 'react';
import {
  approveConvenioGroup,
  bindGroupFacts,
  canEditKnowledge,
  getConvenioGroupTree,
  getGroupBindingDiff,
  listGroupConvenios,
  proposeConvenioGroups,
  rejectConvenioGroup,
  unbindGroupFact,
  updateConvenioGroup,
  type BindingDiff,
  type ConvenioGroupTree,
  type GroupConvenioRow,
  type GroupNode,
  type UnbindableFact,
} from '../../lib/api';
import { useAuth } from '../../auth/context';

// Sprint 7f (ADR-0028) — the Groups review tab.
//
// The AI proposes a convenio's group structure; a human approves it node by
// node. What this screen exists to make visible, in order of importance:
//
//   1. THE EXCERPT. A node is only checkable against the convenio line that
//      justifies it, so the excerpt sits on the node, not behind a click.
//   2. THE KEY. `code_normalized` is what Phase 3's matcher will compare, so it
//      is shown BEFORE approval rather than derived silently afterwards.
//   3. THE BINDING DIFF. Approving makes a node real; wiring facts to it is a
//      SECOND, explicit confirmation. The reviewer ticks the facts, and only
//      ticked facts are bound.
//   4. WHAT WON'T BIND. Labels the planner refuses ("Resto de grupos",
//      "Grupo 2" where G2 is split) are listed rather than quietly dropped, so
//      the reviewer knows there is manual work left.
//
// Fuchsia marks unverified AI, the same convention as every other queue here.
export function GroupsQueue() {
  const { identity } = useAuth();
  const canEdit = canEditKnowledge(identity);

  const [convenios, setConvenios] = useState<GroupConvenioRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [tree, setTree] = useState<ConvenioGroupTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConvenios = useCallback(() => {
    setLoading(true);
    listGroupConvenios()
      .then((r) => setConvenios(r.convenios))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const loadTree = useCallback((convenioId: number) => {
    getConvenioGroupTree(convenioId)
      .then(setTree)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => loadConvenios(), [loadConvenios]);
  useEffect(() => {
    if (selected !== null) loadTree(selected);
  }, [selected, loadTree]);

  const refresh = useCallback(() => {
    loadConvenios();
    if (selected !== null) loadTree(selected);
  }, [loadConvenios, loadTree, selected]);

  if (loading) return <p className="muted">Cargando…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="groups-queue two-pane">
      <div className="pane-list">
        <p className="muted small">
          Estructura de grupos por convenio. Los nodos propuestos por la IA son inertes: no los
          usa nadie hasta que se aprueban.
        </p>
        <table className="table compact">
          <thead>
            <tr>
              <th>Convenio</th>
              <th>Pendientes</th>
              <th>Aprobados</th>
              <th>Datos con grupo</th>
            </tr>
          </thead>
          <tbody>
            {convenios.map((c) => (
              <tr
                key={c.id}
                className={selected === c.id ? 'selected' : ''}
                onClick={() => setSelected(c.id)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  {c.name}
                  {c.territory ? <span className="muted small"> · {c.territory}</span> : null}
                </td>
                <td>{c.pending > 0 ? <span className="badge ai">{c.pending}</span> : '—'}</td>
                <td>{c.approved || '—'}</td>
                <td>{c.group_scoped_facts || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pane-detail">
        {selected === null ? (
          <p className="muted">Elige un convenio.</p>
        ) : tree === null ? (
          <p className="muted">Cargando estructura…</p>
        ) : (
          <ConvenioTree tree={tree} canEdit={canEdit} onChanged={refresh} />
        )}
      </div>
    </div>
  );
}

function ConvenioTree({
  tree,
  canEdit,
  onChanged,
}: {
  tree: ConvenioGroupTree;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const nodeCount = tree.tree.length + tree.tree.reduce((n, r) => n + r.children.length, 0);

  return (
    <div>
      <div className="detail-header">
        <h3>{tree.convenio.name}</h3>
        {canEdit && (
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              proposeConvenioGroups(tree.convenio.id)
                .then(() => window.setTimeout(onChanged, 1500))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? 'Encolando…' : 'Proponer estructura con IA'}
          </button>
        )}
      </div>

      {nodeCount === 0 && tree.orphans.length === 0 ? (
        <p className="muted">
          Este convenio no tiene ninguna estructura de grupos todavía. Sin ella, un dato con
          grupo no puede vincularse y la pregunta se deriva a una persona.
        </p>
      ) : (
        tree.tree.map((node) => (
          <NodeCard key={node.id} node={node} canEdit={canEdit} onChanged={onChanged} depth={0} />
        ))
      )}

      {tree.orphans.length > 0 && (
        <>
          <h4>Áreas sin grupo padre visible</h4>
          {tree.orphans.map((node) => (
            <NodeCard key={node.id} node={node} canEdit={canEdit} onChanged={onChanged} depth={0} />
          ))}
        </>
      )}

      {tree.unbindable_facts.length > 0 && (
        <div className="panel warn">
          <h4>Datos que no se vinculan solos ({tree.unbindable_facts.length})</h4>
          <p className="muted small">
            Estas etiquetas no se pueden resolver sin criterio humano. Se listan aquí en lugar de
            descartarse: mientras no se vinculen, esas preguntas se derivan. Si tú sí sabes a qué
            nodo pertenecen, elígelo — queda registrado como decisión tuya, no como lectura del
            analizador.
          </p>
          <table className="table compact">
            <thead>
              <tr>
                <th>Etiqueta</th>
                <th>Valor</th>
                <th>Motivo</th>
                <th>Vincular a</th>
              </tr>
            </thead>
            <tbody>
              {tree.unbindable_facts.map((f) => (
                <tr key={f.fact_id}>
                  <td>
                    <code>{f.group_label ?? '—'}</code>
                    <span className={`badge ${f.fact_status === 'verified' ? 'ok' : 'ai'}`}>
                      {f.fact_status}
                    </span>
                  </td>
                  <td className="small">{f.value}</td>
                  <td className="small muted">{f.reason}</td>
                  <td>
                    <ManualBindCell
                      fact={f}
                      nodes={tree.approved_nodes}
                      canEdit={canEdit}
                      onChanged={onChanged}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * The manual-binding control on the unbound list.
 *
 * A label the planner refuses is not necessarily unknowable — it is unknowable
 * to a parser. "Grupo 2 excepto área cinco" does mean `resto áreas`, and a
 * reviewer who has read the convenio can say so. This is where they say it,
 * and it is filed as their assertion, not as a reading.
 *
 * Convenio-wide facts are deliberately not offered: they already answer for
 * the whole workforce, and giving one a group would narrow it.
 */
function ManualBindCell({
  fact,
  nodes,
  canEdit,
  onChanged,
}: {
  fact: UnbindableFact;
  nodes: Array<{ id: number; path_label: string }>;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Still listed, because the planner still cannot read the label — but bound,
  // by someone who could. Saying so stops it reading as a standing verdict.
  if (fact.already_bound) {
    return (
      <span className="small">
        <span className="badge ok">vinculado a mano</span> {fact.bound_to.join(', ')}
      </span>
    );
  }
  if (!canEdit) return <span className="muted small">—</span>;
  if (fact.kind === 'convenio_wide') {
    return <span className="muted small">ámbito convenio — no se acota</span>;
  }
  if (nodes.length === 0) {
    return <span className="muted small">aprueba primero un nodo</span>;
  }

  return (
    <div className="stack-xs">
      <select value={target} onChange={(e) => setTarget(e.target.value)} disabled={busy}>
        <option value="">Elegir nodo…</option>
        {nodes.map((n) => (
          <option key={n.id} value={n.id}>
            {n.path_label}
          </option>
        ))}
      </select>
      <button
        disabled={busy || target === ''}
        onClick={() => {
          setBusy(true);
          setError(null);
          bindGroupFacts(Number(target), { fact_ids: [fact.fact_id], override: true })
            .then(onChanged)
            .catch((e: Error) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      >
        Vincular
      </button>
      {error !== null && <span className="error small">{error}</span>}
    </div>
  );
}

function NodeCard({
  node,
  canEdit,
  onChanged,
  depth,
}: {
  node: GroupNode;
  canEdit: boolean;
  onChanged: () => void;
  depth: number;
}) {
  const [diff, setDiff] = useState<BindingDiff | null>(null);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [tickedCategories, setTickedCategories] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(node.label);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = node.status === 'needs_review';

  const openDiff = () => {
    setError(null);
    getGroupBindingDiff(node.id)
      .then((d) => {
        setDiff(d);
        // Nothing is pre-ticked. The reviewer opts each fact IN; a pre-ticked
        // list would make "approve" bind a diff nobody read, which is the habit
        // this whole flow exists to break.
        setTicked(new Set());
      })
      .catch((e) => setError(String(e)));
  };

  const act = (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    fn()
      .then(() => {
        setDiff(null);
        onChanged();
      })
      .catch((e) => setError(String(e)))
      .finally(() => setBusy(false));
  };

  return (
    <div className={`panel node ${pending ? 'ai' : node.status}`} style={{ marginLeft: depth * 24 }}>
      <div className="node-head">
        <strong>{node.label}</strong>
        <code className="key" title="La clave que comparará el emparejador">
          {node.code_normalized}
        </code>
        <span className="muted small">({node.normalization_rule})</span>
        <span className={`badge ${pending ? 'ai' : node.status === 'approved' ? 'ok' : 'muted'}`}>
          {node.status}
        </span>
        <span className="muted small">{node.source}</span>
        {node.bound_fact_count > 0 && (
          <span className="badge ok">{node.bound_fact_count} dato(s) vinculados</span>
        )}
      </div>

      {node.source_excerpt ? (
        <blockquote className="excerpt">{node.source_excerpt}</blockquote>
      ) : (
        <p className="muted small">Sin cita del convenio.</p>
      )}

      {node.categories.length > 0 && (
        <details>
          <summary>Categorías propuestas ({node.categories.length})</summary>
          <ul className="small">
            {node.categories.map((c) => (
              <li key={c.membership_id}>
                {pending && canEdit && c.status === 'needs_review' && (
                  <input
                    type="checkbox"
                    checked={tickedCategories.has(c.job_category_id)}
                    onChange={(e) => {
                      const next = new Set(tickedCategories);
                      if (e.target.checked) next.add(c.job_category_id);
                      else next.delete(c.job_category_id);
                      setTickedCategories(next);
                    }}
                  />
                )}{' '}
                {c.name} <span className="badge">{c.status}</span>
                {c.group_code_evidence && (
                  <span className="muted"> · indicio: {c.group_code_evidence}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {node.would_bind_facts.length > 0 && (
        <details open={node.status === 'approved' && node.would_bind_facts.some((f) => !f.bound)}>
          <summary>Datos que apuntan a este nodo ({node.would_bind_facts.length})</summary>
          <ul className="small">
            {node.would_bind_facts.map((f) => (
              <li key={f.fact_id}>
                <code>{f.group_label}</code> → {f.value}{' '}
                <span className={`badge ${f.bound ? 'ok' : 'muted'}`}>
                  {f.bound ? 'vinculado' : 'sin vincular'}
                </span>
                {f.bound && canEdit && (
                  <button
                    className="link"
                    disabled={busy}
                    onClick={() => act(() => unbindGroupFact(node.id, f.fact_id))}
                  >
                    desvincular
                  </button>
                )}
                {/* Binding is a decision separate from approval: approving this
                    node with a fact unticked must not be the reviewer's only
                    chance at it. */}
                {!f.bound && canEdit && node.status === 'approved' && (
                  <button
                    className="link"
                    disabled={busy}
                    onClick={() => act(() => bindGroupFacts(node.id, { fact_ids: [f.fact_id] }))}
                  >
                    vincular
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && <p className="error small">{error}</p>}

      {canEdit && (
        <div className="node-actions">
          {pending && !editing && (
            <>
              <button disabled={busy} onClick={openDiff}>
                Revisar y aprobar…
              </button>
              <button disabled={busy} onClick={() => setEditing(true)}>
                Editar
              </button>
              <button disabled={busy} onClick={() => act(() => rejectConvenioGroup(node.id))}>
                Rechazar
              </button>
            </>
          )}
          {!pending && node.status === 'approved' && (
            <button disabled={busy} onClick={() => act(() => rejectConvenioGroup(node.id))}>
              Rechazar
            </button>
          )}
        </div>
      )}

      {editing && (
        <div className="edit-row">
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
          <span className="muted small">
            Escribe la etiqueta tal como la imprime el convenio; la clave se recalcula sola.
          </span>
          <button
            disabled={busy}
            onClick={() =>
              act(() => updateConvenioGroup(node.id, { label }).then(() => setEditing(false)))
            }
          >
            Guardar
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setLabel(node.label);
              setEditing(false);
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {diff && (
        <div className="panel diff">
          <h4>Qué vinculará esta aprobación</h4>
          <p className="muted small">{diff.note}</p>

          {diff.would_bind.length === 0 ? (
            <p className="muted">Ningún dato apunta a este nodo. Se puede aprobar igualmente.</p>
          ) : (
            <table className="table compact">
              <thead>
                <tr>
                  <th />
                  <th>Etiqueta</th>
                  <th>Valor</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {diff.would_bind.map((f) => (
                  <tr key={f.fact_id}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={f.already_bound}
                        checked={f.already_bound || ticked.has(f.fact_id)}
                        onChange={(e) => {
                          const next = new Set(ticked);
                          if (e.target.checked) next.add(f.fact_id);
                          else next.delete(f.fact_id);
                          setTicked(next);
                        }}
                      />
                    </td>
                    <td>
                      <code>{f.group_label}</code>
                      {f.also_binds_to_node_ids.length > 0 && (
                        <div className="muted small">
                          Este dato abarca también otro(s) nodo(s): {f.also_binds_to_node_ids.join(', ')}.
                          Vincúlalo allí también o su ámbito quedará incompleto.
                        </div>
                      )}
                    </td>
                    <td className="small">{f.value}</td>
                    <td className="small">
                      {f.validity_start ?? '—'} → {f.validity_end ?? 'abierta'}
                    </td>
                    <td>
                      <span className={`badge ${f.fact_status === 'verified' ? 'ok' : 'ai'}`}>
                        {f.fact_status}
                      </span>
                      {f.already_bound && <span className="badge ok">ya vinculado</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {diff.needs_manual_binding.length > 0 && (
            <>
              <h5>No se resuelven solos</h5>
              <ul className="small muted">
                {diff.needs_manual_binding.map((f) => (
                  <li key={f.fact_id}>
                    <code>{f.group_label}</code> — {f.reason}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="node-actions">
            <button
              disabled={busy}
              onClick={() =>
                act(() =>
                  approveConvenioGroup(node.id, {
                    confirmed_fact_ids: Array.from(ticked),
                    confirmed_category_ids: Array.from(tickedCategories),
                  }),
                )
              }
            >
              Aprobar nodo y vincular {ticked.size} dato(s)
            </button>
            <button disabled={busy} onClick={() => setDiff(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {node.children.map((child) => (
        <NodeCard key={child.id} node={child} canEdit={canEdit} onChanged={onChanged} depth={depth + 1} />
      ))}
    </div>
  );
}
