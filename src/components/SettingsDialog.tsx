import { useState } from 'react';
import { haptic } from '../audio/haptics';
import { useT } from '../i18n/useT';
import {
  loadSoundEnabled,
  loadVibrationEnabled,
  saveSoundEnabled,
  saveVibrationEnabled,
} from '../state/uiPreferences';
import { CheckField } from './CheckField';
import { Modal } from './Modal';

/**
 * How this phone behaves, as opposed to how this game is played — which is why it
 * is a dialog off both header menus rather than a section of the setup screen, and
 * why nothing here is part of a game's config or a template. Each switch writes
 * straight through to storage, and the code that honours it reads storage at the
 * moment it would act, so a change takes effect on the very next whistle or tap.
 */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [vibration, setVibration] = useState(loadVibrationEnabled);
  const [sound, setSound] = useState(loadSoundEnabled);

  return (
    <Modal title={t('settingsTitle')} onClose={onClose} size="sm" showClose>
      <div className="flex flex-col gap-3">
        <CheckField
          variant="switch"
          label={t('settingsVibration')}
          hint={t('settingsVibrationHint')}
          checked={vibration}
          onChange={(on) => {
            setVibration(on);
            saveVibrationEnabled(on);
            // Switching it on is also the way to find out whether this phone can:
            // the tap that did it answers with the same pulse Turn gives.
            if (on) haptic('tap');
          }}
        />
        <CheckField
          variant="switch"
          label={t('settingsSound')}
          hint={t('settingsSoundHint')}
          checked={sound}
          onChange={(on) => {
            setSound(on);
            saveSoundEnabled(on);
          }}
        />
      </div>
    </Modal>
  );
}
