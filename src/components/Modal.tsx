import { useRef, type ReactNode } from 'react';
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

  return (
    <div
      className="fixed inset-0 z-30 bg-black/70 flex items-end sm:items-center sm:justify-center"
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedBackdrop.current) onClose();
      }}
    >
      <div
        className={`bg-panel border border-line rounded-t-2xl sm:rounded-2xl w-full ${WIDTHS[size]} max-h-[85dvh] overflow-y-auto p-5 space-y-4`}
      >
        {(title || showClose || headerAction) && (
          <div className="flex justify-between items-center gap-2">
            <h2 className={sectionTitle}>{title}</h2>
            <div className="flex items-center gap-1 shrink-0">
              {headerAction}
              {showClose && (
                <button className="text-chalk/60 px-2" onClick={onClose} aria-label={t('close')}>
                  ✕
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
