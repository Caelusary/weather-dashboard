import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/utils';
import InfoDialog from './InfoDialog';

function setup() {
  return renderApp(
    <InfoDialog title="Reading the forecast">
      <p>Top number is the high.</p>
    </InfoDialog>,
  );
}

const trigger = () => screen.getByRole('button', { name: 'More about: Reading the forecast' });
const dialog = () => screen.queryByRole('dialog', { name: 'Reading the forecast' });

describe('InfoDialog', () => {
  it('opens a named dialog with the explanation', async () => {
    const { user } = setup();

    await user.click(trigger());

    expect(dialog()).toHaveTextContent('Top number is the high.');
  });

  it('closes on Escape and hands focus back to the button', async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.keyboard('{Escape}');

    expect(dialog()).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('closes from the close button', async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(dialog()).not.toBeInTheDocument();
  });

  it('closes on a click on the dimmed backdrop but not inside the card', async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.click(screen.getByText('Top number is the high.'));
    expect(dialog()).toBeInTheDocument();

    await user.click(dialog());
    expect(dialog()).not.toBeInTheDocument();
  });

  it('locks page scrolling only while open', async () => {
    const { user } = setup();
    await user.click(trigger());
    expect(document.documentElement.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(document.documentElement.style.overflow).toBe('');
  });
});
