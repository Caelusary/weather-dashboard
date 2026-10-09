import { Info } from '@phosphor-icons/react/dist/csr/Info';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../providers/settingsContext';

// Comfortably longer than the 180ms exit animation in index.css.
const CLOSE_FALLBACK_MS = 400;

/**
 * A small (i) button that opens an explanation in a centred modal over a dimmed page.
 *
 * Built on the native <dialog> with showModal(), which provides the hard parts: it renders in the
 * top layer (above every stacking context), makes the rest of the page inert, keeps focus inside
 * and closes on Escape. It also closes on the ✕ or a click on the dimmed backdrop, and the page
 * behind stops scrolling while it is open. Focus returns to the (i) button afterwards.
 *
 * Opening and closing are animated (see .info-dialog in index.css). Closing first marks the dialog
 * with data-closing, waits for the exit animation, then really closes it.
 */
export default function InfoDialog({ title, Icon, children }) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return undefined;
    dialog.showModal();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
      if (dialog.open) dialog.close();
    };
  }, [open]);

  // ✕, backdrop and Escape all come through here so the exit animation always plays. Without
  // animations (reduced motion, or jsdom) the list is empty and it closes straight away. Animations
  // freeze in a hidden tab, so a timeout guarantees the close can never hang.
  function requestClose() {
    const dialog = dialogRef.current;
    if (!dialog?.open || dialog.dataset.closing != null) return;
    dialog.dataset.closing = '';
    const running = dialog.getAnimations?.({ subtree: true }) ?? [];
    Promise.race([
      Promise.allSettled(running.map((animation) => animation.finished)),
      new Promise((resolve) => setTimeout(resolve, CLOSE_FALLBACK_MS)),
    ]).then(() => dialog.close());
  }

  // The dialog's own close event is the single place state is reset.
  function handleClose() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${t('infoButton')}: ${title}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`pressable relative grid size-8 place-items-center rounded-full after:absolute after:-inset-1.5 after:content-[''] hover:bg-white/15 ${
          open ? 'bg-white/15 text-fg' : 'text-fg-muted'
        }`}
      >
        <Info size={18} weight="bold" aria-hidden />
      </button>

      {open &&
        createPortal(
          // The dialog box itself has no padding, so a click whose target is the <dialog> can only
          // have landed on the backdrop around the card.
          <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            onClose={handleClose}
            onCancel={(event) => {
              event.preventDefault();
              requestClose();
            }}
            onClick={(event) => event.target === event.currentTarget && requestClose()}
            className="info-dialog m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] overflow-visible border-0 bg-transparent p-0 text-fg"
          >
            <div className="info-card max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-line bg-ink-900 p-6 text-left shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <h2 id={titleId} className="flex items-center gap-2.5 text-lg font-semibold text-fg">
                  {Icon && <Icon size={22} weight="bold" aria-hidden className="shrink-0 text-accent" />}
                  {title}
                </h2>
                <button
                  type="button"
                  aria-label={t('close')}
                  onClick={requestClose}
                  className="pressable -mt-1.5 -mr-2.5 grid size-11 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-white/10 hover:text-fg"
                >
                  <X size={18} weight="bold" aria-hidden />
                </button>
              </div>
              <div className="mt-4 text-[0.95rem] leading-relaxed text-fg-muted">{children}</div>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
