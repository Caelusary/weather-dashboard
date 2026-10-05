import { Info } from '@phosphor-icons/react/dist/csr/Info';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../providers/settingsContext';

const GUTTER = 16;
const GAP = 8;
const HIDDEN = { position: 'fixed', top: 0, left: 0, visibility: 'hidden' };

/**
 * A small (i) button that opens an explanation next to it. Non-modal: Escape, a click outside or
 * scrolling the page closes it, and Escape returns focus to the button.
 *
 * The panel is portalled to <body> and positioned with fixed coordinates measured from the
 * button. Portalled because a frosted (backdrop-filter) ancestor turns "fixed" into "relative to
 * that ancestor". Fixed rather than an absolute child because an absolute panel that pokes past
 * the edge widens the page on phones, which then skews any measurement.
 *
 * It opens below, flips above when there is more room there, keeps a 16px gutter
 * from the screen edges, and caps its height to the space available.
 */
export default function InfoPopover({ title, children }) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(HIDDEN);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();

  function close({ refocus = false } = {}) {
    setOpen(false);
    setStyle(HIDDEN);
    if (refocus) buttonRef.current?.focus();
  }

  useLayoutEffect(() => {
    if (!open || !panelRef.current || !buttonRef.current) return;
    const button = buttonRef.current.getBoundingClientRect();
    const width = Math.min(352, window.innerWidth - GUTTER * 2);
    const natural = panelRef.current.scrollHeight;
    const below = window.innerHeight - button.bottom - GAP - GUTTER;
    const above = button.top - GAP - GUTTER;
    const up = natural > below && above > below;
    const left = Math.min(Math.max(button.left - GAP, GUTTER), window.innerWidth - width - GUTTER);

    setStyle({
      position: 'fixed',
      left,
      width,
      maxHeight: Math.max(160, up ? above : below),
      ...(up ? { bottom: window.innerHeight - button.top + GAP } : { top: button.bottom + GAP }),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) close();
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') close({ refocus: true });
    }
    // Fixed panels would drift away from their button as the page moves, so a page scroll or a
    // resize simply closes it. Scrolling inside the panel does not reach window, so it is safe.
    function onViewportChange() {
      close();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onViewportChange, { passive: true });
    window.addEventListener('resize', onViewportChange);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onViewportChange);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${t('infoButton')}: ${title}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : setOpen(true))}
        className={`pressable grid size-8 place-items-center rounded-full hover:bg-white/15 ${
          open ? 'bg-white/15 text-fg' : 'text-fg-muted'
        }`}
      >
        <Info size={18} weight="bold" aria-hidden />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={title}
            style={style}
            className="enter z-50 overflow-y-auto rounded-2xl border border-line bg-ink-900 p-5 text-left font-normal shadow-2xl [text-shadow:none]"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-semibold text-fg">{title}</h3>
              <button
                type="button"
                aria-label={t('cancel')}
                onClick={() => close({ refocus: true })}
                className="pressable -mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-white/10 hover:text-fg"
              >
                <X size={16} weight="bold" aria-hidden />
              </button>
            </div>
            <div className="mt-3 text-sm leading-relaxed text-fg-muted">{children}</div>
          </div>,
          document.body,
        )}
    </span>
  );
}
