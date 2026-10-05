import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GEO, geoHit, mockFetch, renderApp } from '../../test/utils';
import SearchBox from './SearchBox';

const london = geoHit({ name: 'London', country: 'GB', state: 'England' });
const londonCanada = geoHit({ name: 'London', country: 'CA', state: 'Ontario', lat: 42.98, lon: -81.25 });

function setup({ hits = [london, londonCanada], recent = [] } = {}) {
  const fetchMock = mockFetch({ [GEO]: hits });
  const onSelect = vi.fn();
  const view = renderApp(<SearchBox recent={recent} onSelect={onSelect} />);
  const input = screen.getByRole('combobox');
  return { ...fetchMock, ...view, input, onSelect };
}

// Typing is debounced by 300ms, so options appear via findBy (real timers, no fixed sleeps).
async function typeAndWaitForOptions(user, input, text = 'Lon') {
  await user.type(input, text);
  return screen.findAllByRole('option');
}

describe('SearchBox suggestions', () => {
  it('shows matching cities once the user types', async () => {
    const { user, input } = setup();

    const options = await typeAndWaitForOptions(user, input);

    expect(options.map((o) => o.textContent)).toEqual(['London, England, GB', 'London, Ontario, CA']);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('waits for a pause in typing and sends a single lookup', async () => {
    const { user, input, callsTo } = setup();

    await typeAndWaitForOptions(user, input, 'Lond');

    expect(callsTo(GEO)).toHaveLength(1);
    expect(callsTo(GEO)[0].params).toMatchObject({ q: 'Lond', limit: '8' });
  });

  it('marks cities the user searched before with a "Recent" badge and lists them first', async () => {
    const { user, input } = setup({
      hits: [
        geoHit({ name: 'Parma', country: 'IT', state: 'Emilia-Romagna', lat: 44.8, lon: 10.33 }),
        geoHit({ name: 'Paris', country: 'FR', state: 'Ile-de-France', lat: 48.85, lon: 2.35 }),
      ],
      recent: [{ name: 'Paris', country: 'FR', state: '', lat: 48.85, lon: 2.35 }],
    });

    const [first, second] = await typeAndWaitForOptions(user, input, 'Par');

    expect(first).toHaveTextContent('Paris');
    expect(within(first).getByText('Recent')).toBeInTheDocument();
    expect(second).toHaveTextContent('Parma');
    expect(within(second).queryByText('Recent')).not.toBeInTheDocument();
  });

  it('reports the picked city when an option is clicked', async () => {
    const { user, input, onSelect } = setup();
    const [, canada] = await typeAndWaitForOptions(user, input);

    await user.click(canada);

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'London', country: 'CA', state: 'Ontario', lat: 42.98, lon: -81.25 }),
    );
    expect(input).toHaveValue('London');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('SearchBox keyboard', () => {
  it('ArrowDown highlights the first option and announces it via aria-activedescendant', async () => {
    const { user, input } = setup();
    const [first, second] = await typeAndWaitForOptions(user, input);

    await user.keyboard('{ArrowDown}');

    expect(input).toHaveAttribute('aria-activedescendant', first.id);
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(second).toHaveAttribute('aria-selected', 'false');
  });

  it('ArrowDown past the last option wraps back to the first', async () => {
    const { user, input } = setup();
    const [first] = await typeAndWaitForOptions(user, input);

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');

    expect(input).toHaveAttribute('aria-activedescendant', first.id);
  });

  it('Enter picks the highlighted option', async () => {
    const { user, input, onSelect } = setup();
    await typeAndWaitForOptions(user, input);

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'London', country: 'CA' }));
  });

  it('Escape closes the suggestions without selecting anything', async () => {
    const { user, input, onSelect } = setup();
    await typeAndWaitForOptions(user, input);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('SearchBox submit', () => {
  it('shows an alert when submitting with nothing typed', async () => {
    const { user, onSelect, callsTo } = setup();

    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a city name.');
    expect(onSelect).not.toHaveBeenCalled();
    expect(callsTo(GEO)).toHaveLength(0);
  });

  it('selects a well-known city on submit without waiting for suggestions', async () => {
    const { user, input, onSelect } = setup({ hits: [] });

    await user.type(input, 'Tokyo{Enter}');

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tokyo', country: 'JP' }));
  });
});

describe('SearchBox regressions', () => {
  it('ArrowUp with nothing highlighted goes to the LAST option, as the ARIA combobox pattern expects', async () => {
    const { user, input } = setup();
    await typeAndWaitForOptions(user, input);

    await user.keyboard('{ArrowUp}');

    const options = screen.getAllByRole('option');
    expect(input).toHaveAttribute('aria-activedescendant', options[options.length - 1].id);
  });

  it('does not fire a suggestions lookup for text that was pre-filled rather than typed', async () => {
    const fetchMock = mockFetch({ [GEO]: [london] });
    renderApp(<SearchBox initialQuery="London" recent={[]} onSelect={vi.fn()} />);

    // Past the 300ms debounce window with real timers.
    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(fetchMock.callsTo(GEO)).toHaveLength(0);
  });
});

describe('SearchBox quick picks', () => {
  it('offers recent cities, then popular ones, when focused before typing, with no network call', async () => {
    const fetchMock = mockFetch({ [GEO]: [] });
    const onSelect = vi.fn();
    const recent = [{ name: 'Lisbon', country: 'PT', state: '', lat: 38.72, lon: -9.14 }];
    const { user } = renderApp(<SearchBox recent={recent} onSelect={onSelect} />);

    await user.click(screen.getByRole('combobox'));

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Lisbon, PT');
    expect(options[1]).toHaveTextContent('London, GB');
    await user.click(options[0]);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Lisbon' }));
    expect(fetchMock.callsTo(GEO)).toHaveLength(0);
  });
});
