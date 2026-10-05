import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/utils';
import InfoPopover from './InfoPopover';

function setup() {
  return renderApp(
    <div>
      <InfoPopover title="Reading the forecast">
        <p>Top number is the high.</p>
      </InfoPopover>
      <button type="button">Elsewhere</button>
    </div>,
  );
}

const trigger = () => screen.getByRole('button', { name: 'More about: Reading the forecast' });

describe('InfoPopover', () => {
  it('opens the explanation and reports its state to assistive tech', async () => {
    const { user } = setup();

    await user.click(trigger());

    expect(screen.getByRole('dialog', { name: 'Reading the forecast' })).toHaveTextContent(
      'Top number is the high.',
    );
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes on Escape and hands focus back to the button', async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('closes when the user clicks somewhere else', async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.click(screen.getByRole('button', { name: 'Elsewhere' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays open when clicking inside the panel', async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.click(screen.getByText('Top number is the high.'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
