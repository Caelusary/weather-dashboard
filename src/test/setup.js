import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no showModal() yet. This stand-in covers what the app relies on: open/close, the close
// event, and Escape closing the topmost modal, as browsers do.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const dialogs = document.querySelectorAll('dialog[open]');
    dialogs[dialogs.length - 1]?.close();
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
