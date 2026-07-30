import { useState } from 'react';
import { useT } from '../i18n/useT';
import { Modal } from './Modal';
import { inputClass, primaryButton, secondaryButton } from './ui';

/**
 * Names and saves the current win-conditions/half-time/timeouts settings as a
 * reusable template. Teams, coin toss results, players and the stats mode
 * (statsMode/trackedTeam) are never part of it — see extractTemplateSettings in
 * state/templates.ts.
 */
export function SaveTemplateDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const { t } = useT();
  const [name, setName] = useState('');

  const save = () => {
    if (!name.trim()) return;
    onSave(name.trim());
  };

  return (
    <Modal title={t('saveTemplateTitle')} onClose={onClose} size="sm">
      <p className="text-xs text-chalk/50">{t('saveTemplateHint')}</p>

      <input
        className={inputClass}
        value={name}
        autoFocus
        placeholder={t('saveTemplateNamePlaceholder')}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && name.trim()) save();
        }}
      />

      <div className="grid grid-cols-2 gap-3">
        <button className={secondaryButton} onClick={onClose}>
          {t('btnCancel')}
        </button>
        <button className={primaryButton} disabled={!name.trim()} onClick={save}>
          {t('btnSave')}
        </button>
      </div>
    </Modal>
  );
}
