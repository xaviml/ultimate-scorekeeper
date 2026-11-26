import { useState } from 'react';
import { haptic } from '../audio/haptics';
import { useT, type Lang } from '../i18n/useT';
import {
  loadSoundEnabled,
  loadTheme,
  loadVibrationEnabled,
  saveSoundEnabled,
  saveTheme,
  saveVibrationEnabled,
  type ThemePref,
} from '../state/uiPreferences';
import { CheckField } from './CheckField';
import { Modal } from './Modal';
import { Segmented } from './Segmented';

const LANGUAGES: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'ca', label: 'Català' },
];

const THEMES: {
  value: ThemePref;
  key: 'settingsThemeSystem' | 'settingsThemeLight' | 'settingsThemeDark';
}[] = [
  { value: 'system', key: 'settingsThemeSystem' },
  { value: 'light', key: 'settingsThemeLight' },
  { value: 'dark', key: 'settingsThemeDark' },
];

/**
 * How this phone behaves, as opposed to how this game is played — which is why it
 * is a dialog off both header menus rather than a section of the setup screen, and
 * why nothing here is part of a game's config or a template. Each switch writes
 * straight through to storage, and the code that honours it reads storage at the
 * moment it would act, so a change takes effect on the very next whistle or tap.
 */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang } = useT();
  const [vibration, setVibration] = useState(loadVibrationEnabled);
  const [sound, setSound] = useState(loadSoundEnabled);
  const [theme, setTheme] = useState(loadTheme);

  return (
    <Modal title={t('settingsTitle')} onClose={onClose} size="sm" showClose>
      <div className="flex flex-col gap-4">
        {/* Each language names itself, so a phone set to the wrong one can still
            find its own. */}
        <Segmented
          label={t('language')}
          value={lang}
          options={LANGUAGES}
          onChange={(value) => setLang(value)}
        />
        <Segmented
          label={t('settingsTheme')}
          value={theme}
          options={THEMES.map(({ value, key }) => ({ value, label: t(key) }))}
          onChange={(value) => {
            setTheme(value);
            saveTheme(value);
          }}
        />
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
