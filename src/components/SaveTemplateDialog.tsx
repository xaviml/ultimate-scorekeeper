import { useState } from 'react';
import { useT } from '../i18n/useT';
import { Modal } from './Modal';
import { inputClass, pillClass, primaryButton, secondaryButton } from './ui';

const normalize = (name: string) => name.trim().toLowerCase();

/**
 * Saves the current rules and statistics settings as a template — a new one, or
 * over one already saved. Teams, coin toss results, players and the followed team
 * are never part of it (see `extractTemplateSettings` in state/templates.ts).
 *
 * Two modes, because they are two different intentions. "Update existing" is the
 * common one — a saved template was picked, a field tweaked, and the change should
 * stick — so it opens on that whenever the template in use is a custom one, with
 * that template already chosen. "New template" names one. A new name that matches
 * a saved template (the store matches case-insensitively, see `saveTemplate`)
 * would overwrite it, so the dialog says so and the button reads "Replace" rather
 * than letting it happen silently.
 */
export function SaveTemplateDialog({
  savedNames,
  currentName,
  onClose,
  onSave,
}: {
  /** Custom templates already saved, in the order the picker lists them. */
  savedNames: string[];
  /** The custom template currently applied, or null for Grass/Beach. */
  currentName: string | null;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const { t } = useT();
  const canUpdate = savedNames.length > 0;
  const [mode, setMode] = useState<'new' | 'update'>(
    canUpdate && currentName !== null ? 'update' : 'new',
  );
  const [name, setName] = useState('');
  const [target, setTarget] = useState<string>(
    currentName !== null && savedNames.includes(currentName) ? currentName : (savedNames[0] ?? ''),
  );

  const clash = savedNames.find((n) => normalize(n) === normalize(name));
  const chosen = mode === 'update' ? target : name.trim();

  const save = () => {
    if (!chosen) return;
    onSave(mode === 'update' ? target : (clash ?? name.trim()));
  };

  return (
    <Modal title={t('saveTemplateTitle')} onClose={onClose} size="sm">
      <p className="text-xs text-chalk/50">{t('saveTemplateHint')}</p>

      {canUpdate && (
        <div className="flex gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'new'}
            className={pillClass(mode === 'new')}
            onClick={() => setMode('new')}
          >
            {t('saveTemplateModeNew')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'update'}
            className={pillClass(mode === 'update')}
            onClick={() => setMode('update')}
          >
            {t('saveTemplateModeUpdate')}
          </button>
        </div>
      )}

      {mode === 'new' ? (
        <>
          <input
            className={inputClass}
            value={name}
            autoFocus
            aria-label={t('saveTemplateNameLabel')}
            placeholder={t('saveTemplateNamePlaceholder')}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) save();
            }}
          />
          {clash && (
            <p className="text-xs text-signal">{t('saveTemplateReplaces', { name: clash })}</p>
          )}
        </>
      ) : (
        <div
          className="flex flex-col gap-2"
          role="radiogroup"
          aria-label={t('saveTemplateModeUpdate')}
        >
          {savedNames.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={target === n}
              className={`rounded-lg border px-3 py-2.5 text-left ${
                target === n
                  ? 'border-signal bg-signal/10 text-chalk'
                  : 'border-line bg-pitch text-chalk/80'
              }`}
              onClick={() => setTarget(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button className={secondaryButton} onClick={onClose}>
          {t('btnCancel')}
        </button>
        <button className={primaryButton} disabled={!chosen} onClick={save}>
          {mode === 'update'
            ? t('saveTemplateUpdateBtn')
            : clash
              ? t('saveTemplateReplaceBtn')
              : t('btnSave')}
        </button>
      </div>
    </Modal>
  );
}
