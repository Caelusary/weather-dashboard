import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FIXED_NOW,
  FORECAST,
  GEO,
  WEATHER,
  forecastPayload,
  httpError,
  mockFetch,
  renderApp,
  weatherPayload,
} from './test/utils';

const TOKYO_TZ = 9 * 3600;

// The API names the nearest weather station, not the city: for Tokyo's coordinates it said
// "Horinouchi". Every test therefore gets that station name unless it overrides the route.
function mockApi(overrides = {}) {
  return mockFetch({
    [GEO]: [],
    [WEATHER]: () => weatherPayload({ name: 'Horinouchi', country: 'JP', timezone: TOKYO_TZ }),
    [FORECAST]: () => forecastPayload({ timezone: TOKYO_TZ }),
    ...overrides,
  });
}

const searchInput = () => screen.getByRole('combobox', { name: 'Enter a city name...' });

async function searchFor(user, text) {
  await user.type(searchInput(), `${text}{Enter}`);
}

const cityHeading = (name) => screen.findByRole('heading', { name });

beforeEach(() => {
  // Freeze the clock (only Date, so timers still run) so the forecast's "today" is stable.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXED_NOW);
  window.location.hash = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('first visit', () => {
  it('invites the user to search and loads no weather', () => {
    const { callsTo } = mockApi();

    renderApp();

    expect(screen.getByRole('heading', { name: 'Check the sky anywhere' })).toBeInTheDocument();
    expect(callsTo(WEATHER)).toHaveLength(0);
    expect(callsTo(FORECAST)).toHaveLength(0);
  });
});

describe('searching', () => {
  it('shows the weather card with temperature and five forecast days', async () => {
    mockApi();
    const { user } = renderApp();

    await searchFor(user, 'Tokyo');

    expect(await cityHeading('Tokyo, JP')).toBeInTheDocument();
    expect(screen.getByLabelText('22°C')).toBeInTheDocument();
    const forecast = await screen.findByRole('region', { name: '5-Day Forecast' });
    expect(within(forecast).getAllByRole('listitem')).toHaveLength(5);
  });

  it('labels each forecast day with a High and a Low', async () => {
    mockApi();
    const { user } = renderApp();

    await searchFor(user, 'Tokyo');

    const forecast = await screen.findByRole('region', { name: '5-Day Forecast' });
    for (const day of within(forecast).getAllByRole('listitem')) {
      expect(within(day).getByText('High')).toBeInTheDocument();
      expect(within(day).getByText('Low')).toBeInTheDocument();
    }
  });

  it('gives every detail its own explanation, one open at a time', async () => {
    mockApi();
    const { user } = renderApp();
    await searchFor(user, 'Tokyo');
    const details = await screen.findByRole('region', { name: 'Details' });

    expect(within(details).getAllByRole('button', { name: /^More about: / })).toHaveLength(8);

    await user.click(within(details).getByRole('button', { name: 'More about: Humidity' }));
    expect(screen.getByRole('dialog', { name: 'Humidity' })).toHaveTextContent(/water vapour/);

    await user.click(within(details).getByRole('button', { name: 'More about: Pressure' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Pressure' })).toHaveTextContent(/weight of the air/);
  });

  it('shows the city the user picked, not the API station name', async () => {
    mockApi();
    const { user } = renderApp();

    await searchFor(user, 'Tokyo');

    expect(await cityHeading('Tokyo, JP')).toBeInTheDocument();
    expect(screen.queryByText(/Horinouchi/)).not.toBeInTheDocument();
  });

  it('restores the last city after a reload', async () => {
    mockApi();
    const first = renderApp();
    await searchFor(first.user, 'Tokyo');
    await cityHeading('Tokyo, JP');
    first.unmount();

    renderApp();

    expect(await cityHeading('Tokyo, JP')).toBeInTheDocument();
    expect(searchInput()).toHaveValue('Tokyo');
  });
});

describe('units and language', () => {
  it('switches to Fahrenheit without making any further requests', async () => {
    const { calls } = mockApi();
    const { user } = renderApp();
    await searchFor(user, 'Tokyo');
    await cityHeading('Tokyo, JP');
    await screen.findByRole('region', { name: '5-Day Forecast' });
    const requestsBefore = calls.length;

    await user.click(screen.getByRole('radio', { name: '°F' }));

    expect(screen.getByLabelText('71°F')).toBeInTheDocument();
    expect(screen.queryByLabelText('22°C')).not.toBeInTheDocument();
    expect(calls).toHaveLength(requestsBefore);
  });

  it('translates the interface when the language changes to Spanish', async () => {
    mockApi();
    const { user } = renderApp();
    await searchFor(user, 'Tokyo');
    await cityHeading('Tokyo, JP');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Select language' }), 'es');

    expect(await screen.findByText('Humedad')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pronóstico de 5 Días' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Detalles' })).toBeInTheDocument();
  });
});

describe('failures', () => {
  it('shows an alert with a retry button that fetches again', async () => {
    let attempts = 0;
    const { callsTo } = mockApi({
      [WEATHER]: () => {
        attempts += 1;
        return attempts === 1
          ? httpError(500)
          : weatherPayload({ name: 'Horinouchi', country: 'JP', timezone: TOKYO_TZ });
      },
    });
    const { user } = renderApp();

    await searchFor(user, 'Tokyo');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong while fetching the weather data.',
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await cityHeading('Tokyo, JP')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(callsTo(WEATHER)).toHaveLength(2);
  });

  it('explains an invalid API key and offers no retry', async () => {
    mockApi({ [WEATHER]: () => httpError(401) });
    const { user } = renderApp();

    await searchFor(user, 'Tokyo');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid API key');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});

describe('history', () => {
  const entries = [
    { name: 'Tokyo', country: 'JP', state: '', lat: 35.6762, lon: 139.6503, timestamp: FIXED_NOW - 1000 },
    { name: 'Paris', country: 'FR', state: '', lat: 48.8566, lon: 2.3522, timestamp: FIXED_NOW - 2000 },
  ];

  function openHistoryWith(seed) {
    localStorage.setItem('searchHistory', JSON.stringify(seed));
    window.location.hash = '#/history';
    mockApi();
    return renderApp();
  }

  const historyItems = async () =>
    within(await screen.findByRole('region', { name: 'History' })).queryAllByRole('listitem');

  it('records a selected city in the History view', async () => {
    mockApi();
    const { user } = renderApp();
    await searchFor(user, 'Tokyo');
    await cityHeading('Tokyo, JP');

    // The nav renders twice (top tabs and bottom bar); either works.
    await user.click(screen.getAllByRole('link', { name: 'History' })[0]);

    const items = await historyItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Tokyo, JP');
  });

  it('deletes a single entry and keeps the rest', async () => {
    const { user } = openHistoryWith(entries);
    expect(await historyItems()).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Delete entry: Tokyo, JP' }));

    const items = await historyItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Paris, FR');
  });

  it('asks for confirmation inside the page before clearing, and Cancel keeps everything', async () => {
    const { user } = openHistoryWith(entries);
    await historyItems();

    await user.click(screen.getByRole('button', { name: 'Clear All' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Clear all search history? This cannot be undone.');
    expect(await historyItems()).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await historyItems()).toHaveLength(2);
  });

  it('clears all history once the confirmation is accepted', async () => {
    const { user } = openHistoryWith(entries);
    await historyItems();

    await user.click(screen.getByRole('button', { name: 'Clear All' }));
    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(await screen.findByText('No search history yet.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('searchHistory'))).toEqual([]);
  });
});
