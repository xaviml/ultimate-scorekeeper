import { useMemo, useRef, useState } from 'react';
import { useT } from '../i18n/useT';
import { applyImport, isTextRosterFile, parseRoster } from '../state/rosterImport';
import type { PlayerInfo } from '../state/types';
import { CheckField } from './CheckField';
import { Modal } from './Modal';
import { primaryButton, secondaryButton } from './ui';

/**
 * Paste a roster, or pick a plain text file containing one.
 *
 * The two doors meet immediately: a chosen file is read into the same box, so
 * the file's format is the box's format and what gets parsed is always what the
 * volunteer can see and correct. Nothing is applied until the preview below has
 * been read — imported lists come from spreadsheets nobody proofread, and the
 * preview is cheaper than fixing a roster mid-game.
 */
export function RosterImportDialog({
  teamLabel,
  existing,
  onApply,
  onClose,
}: {
  /** What to call the team in the heading — the typed name, or "Team A". */
  teamLabel: string;
  existing: PlayerInfo[];
  onApply: (players: PlayerInfo[]) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const [text, setText] = useState('');
  const [replace, setReplace] = useState(false);
  const [fileError, setFileError] = useState<'read' | 'type' | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const parse = useMemo(() => parseRoster(text), [text]);
  const result = useMemo(
    () => applyImport(existing, parse.players, replace),
    [existing, parse.players, replace],
  );

  // FileReader rather than `file.text()`: it predates the Blob method by years,
  // so it works on the old iOS Safari a borrowed tournament phone tends to be
  // running — and unlike the Blob method it exists in jsdom, so the file path is
  // testable rather than taken on trust.
  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!isTextRosterFile(file)) {
      setFileError('type');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ''));
      setFileError(null);
    };
    reader.onerror = () => setFileError('read');
    try {
      reader.readAsText(file);
    } catch {
      setFileError('read');
    }
  };

  return (
    <Modal title={t('rosterImportTitle', { team: teamLabel })} onClose={onClose} showClose>
      <p className="text-sm text-chalk/60">{t('rosterImportHint')}</p>

      <textarea
        className="w-full h-40 rounded-lg bg-pitch border border-line px-3 py-2 text-chalk text-sm font-mono focus:outline-none focus:border-signal"
        placeholder={t('rosterImportPlaceholder')}
        aria-label={t('rosterImportTextareaLabel')}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setFileError(null);
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          className={`${secondaryButton} px-4 text-sm`}
          onClick={() => fileInput.current?.click()}
        >
          {t('rosterImportFileBtn')}
        </button>
        <span className="text-xs text-chalk/50">{t('rosterImportFileHint')}</span>
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          accept=".txt,text/plain"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            // Clearing lets the same file be picked again after an edit.
            e.target.value = '';
          }}
        />
      </div>
      {fileError && (
        <p className="text-sm text-chalk/60">
          {t(fileError === 'type' ? 'rosterImportFileType' : 'rosterImportFileError')}
        </p>
      )}

      {text.trim() !== '' && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-chalk/60">
            {parse.players.length === 0
              ? t('rosterImportNone')
              : t('rosterImportFound', { count: parse.players.length })}
          </p>
          {parse.players.length > 0 && (
            <ul className="max-h-40 overflow-y-auto space-y-1" data-testid="roster-import-preview">
              {parse.players.map((p, i) => (
                <li
                  key={`${p.number}|${p.name}|${i}`}
                  className="flex items-center gap-2 rounded-lg bg-pitch border border-line px-3 py-1 text-sm"
                >
                  {p.number && <span className="font-board text-signal">#{p.number}</span>}
                  <span className={p.name ? '' : 'text-chalk/40 italic'}>
                    {p.name || t('rosterImportNoName')}
                  </span>
                  {/* The marking is shown so the preview can be checked against the
                      source — a line whose "MMP" was read as part of the name looks
                      wrong here, which is the whole point of previewing. */}
                  {p.gender && (
                    <span className="ml-auto text-[11px] font-board text-chalk/50">
                      {t(p.gender === 'male' ? 'genderMmp' : 'genderFmp')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {parse.skipped > 0 && (
            <p className="text-xs text-chalk/50">
              {t('rosterImportSkipped', { count: parse.skipped })}
            </p>
          )}
          {result.duplicates > 0 && (
            <p className="text-xs text-chalk/50">
              {t('rosterImportDuplicates', { count: result.duplicates })}
            </p>
          )}
        </div>
      )}

      {existing.length > 0 && (
        <CheckField
          label={t('rosterImportReplace', { count: existing.length })}
          checked={replace}
          onChange={setReplace}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className={secondaryButton} onClick={onClose}>
          {t('btnCancel')}
        </button>
        <button
          type="button"
          className={primaryButton}
          disabled={result.added === 0}
          onClick={() => {
            onApply(result.players);
            onClose();
          }}
        >
          {t('rosterImportApply', { count: result.added })}
        </button>
      </div>
    </Modal>
  );
}
