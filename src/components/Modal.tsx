import { useRef, type ReactNode } from 'react';
import { CrossIcon } from './icons';
import { useT } from '../i18n/useT';
import { sectionTitle } from './ui';

const WIDTHS = {
  xs: 'sm:max-w-xs',
  sm: 'sm:max-w-sm',
  lg: 'sm:max-w-lg',
} as const;

export function Modal({
  title,
  onClose,
  size = 'lg',
  showClose = false,
  headerAction,
  children,
}: {
  title?: string;
  onClose: () => void;
  size?: keyof typeof WIDTHS;
  /** Render an explicit ✕ in the header; backdrop dismissal works either way. */
  showClose?: boolean;
  /** Control rendered in the header, to the left of the ✕. */
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useT();
  // On touch devices the tap that opened this dialog emits a delayed compatibility
  // `click` (~300ms later) that lands on the backdrop the instant it mounts under
  // the finger, dismissing the dialog before it can be seen. Only dismiss when a
  // real press both begins and ends on the backdrop — the ghost click has no
  // matching pointerdown here, so it's ignored.
  //
  // Presses that start inside the panel also land here (the event bubbles) and set
  // this false, which is what makes a drag ending outside the panel safe too.
  const pressedBackdrop = useRef(false);

  // `!m-0`: a dialog is rendered where it is opened, so inside a screen laid out with
  // `space-y-*` it picks up that screen's top margin — and a fixed backdrop with a
  // margin starts that far down, leaving a pale band over the top of the page.
  return (
    <div
      className="fixed inset-0 !m-0 z-30 bg-scrim/40 flex items-end sm:items-center sm:justify-center"
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedBackdrop.current) onClose();
      }}
    >
      <div
        className={`bg-panel border border-line rounded-t-xl sm:rounded-lg w-full ${WIDTHS[size]} max-h-[85dvh] overflow-y-auto p-5 space-y-4`}
      >
        {(title || showClose || headerAction) && (
          <div className="flex justify-between items-center gap-2">
            <h2 className={sectionTitle}>{title}</h2>
            <div className="flex items-center gap-1 shrink-0">
              {headerAction}
              {showClose && (
                <button
                  className="text-chalk/70 -mr-1 p-1 active:scale-95"
                  onClick={onClose}
                  aria-label={t('close')}
                >
                  <CrossIcon size="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
