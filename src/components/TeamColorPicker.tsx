import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useT } from '../i18n/useT';
import { Modal } from './Modal';
import { inputClass, primaryButton } from './ui';

export function TeamColorPicker({
  label,
  color,
  onChange,
}: {
  label: string;
  color: string;
  onChange: (color: string) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        className="block h-[42px] w-14 rounded-lg border border-line"
        style={{ backgroundColor: color }}
        onClick={() => setOpen(true)}
      />
      {open && (
        <Modal title={label} onClose={() => setOpen(false)} size="xs">
          <div className="team-color-picker">
            <HexColorPicker color={color} onChange={onChange} />
          </div>
          <input
            className={`${inputClass} uppercase`}
            value={color}
            onChange={(e) => onChange(e.target.value)}
          />
          <button
            type="button"
            className={`w-full ${primaryButton}`}
            onClick={() => setOpen(false)}
          >
            {t('btnDone')}
          </button>
        </Modal>
      )}
    </>
  );
}
