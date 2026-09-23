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
import { firstLine } from '../../lib/format';
import { factStatusLabel, groupNodeStatusLabel } from '../../lib/statusLabels';
import { useT } from '../../i18n/context';

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
// Sprint 7g Item 2 — `initialConvenioId` is the one-shot deep-link prop
// AdminShell reads out of `#view=review&tab=groups&convenio=<id>`
// (ADR-0029's fix_link scheme, e.g. `group_structure_not_approved`). It only
// sets the INITIAL selection (lazy useState initializer below); the effect
// that loads the tree for `selected` (further down) fires exactly the same as
// a manual click would.
export function GroupsQueue({ initialConvenioId = null }: { initialConvenioId?: number | null }) {
  const t = useT();
  const { identity } = useAuth();
  const canEdit = canEditKnowledge(identity);

  const [convenios, setConvenios] = useState<GroupConvenioRow[]>([]);
  const [selected, setSelected] = useState<number | null>(initialConvenioId);
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

  if (loading) return <p className="muted">{t.common.loading}</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="groups-queue two-pane">
      <div className="pane-list">
        <p className="muted small">
          {t.groupsQueue.introText}
        </p>
        <table className="table compact">
          <thead>
            <tr>
              <th>{t.common.convenio}</th>
              <th>{t.groupsQueue.colPending}</th>
              <th>{t.groupsQueue.colApproved}</th>
              <th>{t.groupsQueue.colFactsWithGroup}</th>
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
                <td>{c.pending > 0 ? <span className="badge ai">{c.pending}</span> : t.common.dash}</td>
                <td>{c.approved || t.common.dash}</td>
                <td>{c.group_scoped_facts || t.common.dash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pane-detail">
        {selected === null ? (
          <p className="muted">{t.groupsQueue.chooseConvenioPrompt}</p>
        ) : tree === null ? (
          <p className="muted">{t.groupsQueue.loadingStructure}</p>
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
  const t = useT();
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
          {busy ? t.groupsQueue.enqueueing : t.groupsQueue.proposeStructureButton}
        </button>
        )}
      </div>

      {nodeCount === 0 && tree.orphans.length === 0 ? (
        <p className="muted">
          {t.groupsQueue.noStructureYet}
        </p>
      ) : (
        tree.tree.map((node) => (
          <NodeCard key={node.id} node={node} canEdit={canEdit} onChanged={onChanged} depth={0} />
        ))
      )}

      {tree.orphans.length > 0 && (
        <>
          <h4>{t.groupsQueue.orphanAreasHeading}</h4>
          {tree.orphans.map((node) => (
            <NodeCard key={node.id} node={node} canEdit={canEdit} onChanged={onChanged} depth={0} />
          ))}
        </>
      )}

      {tree.unbindable_facts.length > 0 && (
        <div className="panel warn">
          <h4>{t.groupsQueue.unbindableHeading} ({tree.unbindable_facts.length})</h4>
          <p className="muted small">
            {t.groupsQueue.unbindableIntro}
          </p>
          <table className="table compact">
            <thead>
              <tr>
                {/* Sprint 7g Item 2 — id + source line inline, so a reviewer
                    can identify/sanity-check a fact without opening it,
                    same treatment as the Reference-facts queue. */}
                <th className="num">{t.groupsQueue.colId}</th>
                <th>{t.groupsQueue.colLabel}</th>
                <th>{t.groupsQueue.colValue}</th>
                <th>{t.groupsQueue.colSource}</th>
                <th>{t.groupsQueue.colReason}</th>
                <th>{t.groupsQueue.colBindTo}</th>
              </tr>
            </thead>
            <tbody>
              {tree.unbindable_facts.map((f) => (
                <tr key={f.fact_id}>
                  <td className="num muted">#{f.fact_id}</td>
                  <td>
                    <code>{f.group_label ?? t.common.dash}</code>
                    <span className={`badge ${f.fact_status === 'verified' ? 'ok' : 'ai'}`}>
                      {factStatusLabel(t, f.fact_status)}
                    </span>
                  </td>
                  <td className="small">{f.value}</td>
                  <td className="small muted" title={f.source_excerpt ?? undefined}>
                    {firstLine(f.source_excerpt) ?? t.common.dash}
                  </td>
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
  const t = useT();
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Still listed, because the planner still cannot read the label — but bound,
  // by someone who could. Saying so stops it reading as a standing verdict.
  if (fact.already_bound) {
    return (
      <span className="small">
        <span className="badge ok">{t.groupsQueue.boundManuallyBadge}</span> {fact.bound_to.join(', ')}
      </span>
    );
  }
  if (!canEdit) return <span className="muted small">{t.common.dash}</span>;
  if (fact.kind === 'convenio_wide') {
    return <span className="muted small">{t.groupsQueue.convenioWideScopeNotice}</span>;
  }
  if (nodes.length === 0) {
    return <span className="muted small">{t.groupsQueue.approveNodeFirstNotice}</span>;
  }

  return (
    <div className="stack-xs">
      <select value={target} onChange={(e) => setTarget(e.target.value)} disabled={busy}>
        <option value="">{t.groupsQueue.chooseNodePlaceholder}</option>
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
        {t.groupsQueue.bindButton}
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
  const t = useT();
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
        <code className="key" title={t.groupsQueue.matcherKeyTitle}>
          {node.code_normalized}
        </code>
        <span className="muted small">({node.normalization_rule})</span>
        <span className={`badge ${pending ? 'ai' : node.status === 'approved' ? 'ok' : 'muted'}`}>
          {groupNodeStatusLabel(t, node.status)}
        </span>
        <span className="muted small">{node.source}</span>
        {node.bound_fact_count > 0 && (
          <span className="badge ok">{node.bound_fact_count} {t.groupsQueue.boundFactsSuffix}</span>
        )}
      </div>

      {node.source_excerpt ? (
        <blockquote className="excerpt">{node.source_excerpt}</blockquote>
      ) : (
        <p className="muted small">{t.groupsQueue.noConvenioQuoteNotice}</p>
      )}

      {node.categories.length > 0 && (
        <details>
          <summary>{t.groupsQueue.proposedCategoriesHeading} ({node.categories.length})</summary>
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
                {c.name} <span className="badge">{groupNodeStatusLabel(t, c.status)}</span>
                {c.group_code_evidence && (
                  <span className="muted"> · {t.groupsQueue.evidencePrefix} {c.group_code_evidence}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {node.would_bind_facts.length > 0 && (
        <details open={node.status === 'approved' && node.would_bind_facts.some((f) => !f.bound)}>
          <summary>{t.groupsQueue.factsPointingHeading} ({node.would_bind_facts.length})</summary>
          <ul className="small">
            {node.would_bind_facts.map((f) => (
              <li key={f.fact_id}>
                {/* Sprint 7g Item 2 — id + source line inline. */}
                <span className="muted">#{f.fact_id}</span> <code>{f.group_label}</code> → {f.value}{' '}
                <span className={`badge ${f.bound ? 'ok' : 'muted'}`}>
                  {f.bound ? t.groupsQueue.boundLabel : t.groupsQueue.unboundLabel}
                </span>
                {f.source_excerpt && (
                  <div className="muted small" title={f.source_excerpt}>
                    {firstLine(f.source_excerpt)}
                  </div>
                )}
                {f.bound && canEdit && (
                  <button
                    className="link"
                    disabled={busy}
                    onClick={() => act(() => unbindGroupFact(node.id, f.fact_id))}
                  >
                    {t.groupsQueue.unbindButton}
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
                    {t.groupsQueue.bindLinkLabel}
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
                {t.groupsQueue.reviewAndApproveButton}
              </button>
              <button disabled={busy} onClick={() => setEditing(true)}>
                {t.groupsQueue.editButton}
              </button>
              <button disabled={busy} onClick={() => act(() => rejectConvenioGroup(node.id))}>
                {t.groupsQueue.rejectButton}
              </button>
            </>
          )}
          {!pending && node.status === 'approved' && (
            <button disabled={busy} onClick={() => act(() => rejectConvenioGroup(node.id))}>
              {t.groupsQueue.rejectButton}
            </button>
          )}
        </div>
      )}

      {editing && (
        <div className="edit-row">
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
          <span className="muted small">
            {t.groupsQueue.editLabelHint}
          </span>
          <button
            disabled={busy}
            onClick={() =>
              act(() => updateConvenioGroup(node.id, { label }).then(() => setEditing(false)))
            }
          >
            {t.common.save}
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setLabel(node.label);
              setEditing(false);
            }}
          >
            {t.common.cancel}
          </button>
        </div>
      )}

      {diff && (
        <div className="panel diff">
          <h4>{t.groupsQueue.diffHeading}</h4>
          <p className="muted small">{diff.note}</p>

          {diff.would_bind.length === 0 ? (
            <p className="muted">{t.groupsQueue.noFactsPointNotice}</p>
          ) : (
            <table className="table compact">
              <thead>
                <tr>
                  <th />
                  {/* Sprint 7g Item 2 — id + source line inline. */}
                  <th className="num">{t.groupsQueue.colId}</th>
                  <th>{t.groupsQueue.colLabel}</th>
                  <th>{t.groupsQueue.colValue}</th>
                  <th>{t.groupsQueue.colSource}</th>
                  <th>{t.groupsQueue.colValidity}</th>
                  <th>{t.groupsQueue.colStatus}</th>
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
                    <td className="num muted">#{f.fact_id}</td>
                    <td>
                      <code>{f.group_label}</code>
                      {f.also_binds_to_node_ids.length > 0 && (
                        <div className="muted small">
                          {t.groupsQueue.alsoBindsPrefix} {f.also_binds_to_node_ids.join(', ')}.
                          {' '}{t.groupsQueue.alsoBindsSuffix}
                        </div>
                      )}
                    </td>
                    <td className="small">{f.value}</td>
                    <td className="small muted" title={f.source_excerpt ?? undefined}>
                      {firstLine(f.source_excerpt) ?? t.common.dash}
                    </td>
                    <td className="small">
                      {f.validity_start ?? t.common.dash} → {f.validity_end ?? t.groupsQueue.openEndedFallback}
                    </td>
                    <td>
                      <span className={`badge ${f.fact_status === 'verified' ? 'ok' : 'ai'}`}>
                        {factStatusLabel(t, f.fact_status)}
                      </span>
                      {f.already_bound && <span className="badge ok">{t.groupsQueue.alreadyBoundBadge}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {diff.needs_manual_binding.length > 0 && (
            <>
              <h5>{t.groupsQueue.manualBindingNeededHeading}</h5>
              <ul className="small muted">
                {diff.needs_manual_binding.map((f) => (
                  <li key={f.fact_id}>
                    <span className="muted">#{f.fact_id}</span> <code>{f.group_label}</code> — {f.reason}
                    {f.source_excerpt && (
                      <div className="muted small" title={f.source_excerpt}>
                        {firstLine(f.source_excerpt)}
                      </div>
                    )}
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
              {t.groupsQueue.approveAndBindPrefix} {ticked.size} {t.groupsQueue.approveAndBindSuffix}
            </button>
            <button disabled={busy} onClick={() => setDiff(null)}>
              {t.common.cancel}
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
