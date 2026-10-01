// @vitest-environment jsdom
//
// Sprint 12b item 5 — the one-line layout is CSS (jsdom applies no stylesheet,
// so the width behaviour is verified in a real browser at CP-1). What IS
// testable here, and what must not regress: the filters now live INSIDE the
// toolbar row, the reading/keyboard order is primary → toggle → clear → filters
// → total, the toggle still hides them, and every control keeps its label.
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { FilterToolbar } from './FilterToolbar';

afterEach(cleanup);

function mount(filters: object = {}, onClear: () => void = () => {}, inlineWhenWide = false) {
  return render(
    <LocaleProvider>
      <FilterToolbar
        inlineWhenWide={inlineWhenWide}
        primary={<input className="input" aria-label="Buscar texto" />}
        filters={filters}
        onClear={onClear}
        total={<span data-testid="total">12 resultados</span>}
      >
        <select className="select" aria-label="Convenio"><option value="">todos</option></select>
        <select className="select" aria-label="Territorio"><option value="">todos</option></select>
        <input className="input" type="date" aria-label="Desde" />
        <input className="input" type="date" aria-label="Hasta" />
      </FilterToolbar>
    </LocaleProvider>,
  );
}

describe('FilterToolbar (Sprint 12b item 5)', () => {
  it('puts the filters inside the toolbar row, wrapped in .filter-toolbar-filters', () => {
    mount();
    const row = document.querySelector('.filter-toolbar-row')!;
    const wrap = row.querySelector('.filter-toolbar-filters');
    expect(wrap).not.toBeNull();
    expect(wrap!.querySelectorAll('select, input')).toHaveLength(4);
    // …and nothing renders as a second sibling row any more.
    expect(document.querySelector('.filter-toolbar > .filter-toolbar-filters')).toBeNull();
  });

  it('keeps reading/keyboard order: primary → toggle → clear → filters → total', () => {
    mount({ convenio_id: 4 });
    const row = document.querySelector('.filter-toolbar-row')!;
    const order = Array.from(row.children).map((el) => {
      if (el.matches('input.input')) return 'primary';
      if (el.matches('.filter-toolbar-toggle')) return 'toggle';
      if (el.matches('.filter-toolbar-filters')) return 'filters';
      if (el.getAttribute('data-testid') === 'total') return 'total';
      return el.textContent;
    });
    expect(order).toEqual(['primary', 'toggle', 'Limpiar filtros', 'filters', 'total']);
  });

  it('the toggle still hides and shows the filters, and the badge counts active ones', () => {
    mount({ convenio_id: 4, from: '2026-01-01', empty: '' });
    const toggle = screen.getByRole('button', { name: /Filtros/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('.filter-toolbar-badge')).toHaveTextContent('2');
    expect(screen.getByLabelText('Convenio')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Convenio')).not.toBeInTheDocument();
    // The always-visible parts stay.
    expect(screen.getByLabelText('Buscar texto')).toBeInTheDocument();
    expect(screen.getByTestId('total')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByLabelText('Convenio')).toBeInTheDocument();
  });

  it('every control keeps its accessible name', () => {
    mount();
    for (const name of ['Buscar texto', 'Convenio', 'Territorio', 'Desde', 'Hasta']) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });

  it('Limpiar filtros appears only with an active filter and calls onClear', () => {
    const onClear = vi.fn();
    mount({}, onClear);
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();
    cleanup();
    mount({ convenio_id: 4 }, onClear);
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('a screen with no filter controls renders no toggle and no filters wrapper (e.g. Review\'s other tabs)', () => {
    render(
      <LocaleProvider>
        <FilterToolbar total={<span>3 elementos</span>} />
      </LocaleProvider>,
    );
    expect(document.querySelector('.filter-toolbar-toggle')).toBeNull();
    expect(document.querySelector('.filter-toolbar-filters')).toBeNull();
  });

  it('inlineWhenWide (Historial): collapsed filters stay mounted but flagged, so CSS can show them when wide', () => {
    mount({}, () => {}, true);
    const toggle = screen.getByRole('button', { name: /Filtros/ });
    const wrap = document.querySelector('.filter-toolbar-filters')!;
    expect(document.querySelector('.filter-toolbar')).toHaveClass('filter-toolbar--inline');
    expect(wrap).not.toHaveClass('is-collapsed');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('.filter-toolbar-filters')).toHaveClass('is-collapsed');
    expect(screen.getByLabelText('Convenio')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(document.querySelector('.filter-toolbar-filters')).not.toHaveClass('is-collapsed');
  });

  it('without inlineWhenWide nothing changes: no modifier class, collapsed filters unmount', () => {
    mount();
    expect(document.querySelector('.filter-toolbar')).not.toHaveClass('filter-toolbar--inline');
  });
});
