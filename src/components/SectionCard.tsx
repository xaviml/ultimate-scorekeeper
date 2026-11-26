import { specSection, specTitle } from './ui';

/**
 * A titled card on a full screen, with the setup screen's heading: a glyph in the
 * accent before an uppercase title, and an optional control in the right-hand
 * corner. The setup screen's own `Section` adds folding and an on/off switch on top
 * of the same look; this is the plain form the report is built from.
 */
export function SectionCard({
  title,
  icon,
  action,
  children,
  className = '',
  ...rest
}: {
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`${specSection} ${className}`} {...rest}>
      {title && (
        <div className="flex items-center justify-between gap-3 min-h-8">
          <h2 className={`${specTitle} flex items-center gap-2 min-w-0`}>
            {icon && (
              <span aria-hidden="true" className="shrink-0">
                {icon}
              </span>
            )}
            <span className="truncate">{title}</span>
          </h2>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
