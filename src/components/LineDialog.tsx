import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { canSetLine } from '../state/gameReducer';
import {
  expectedSplit,
  lineComposition,
  lineIssues,
  resolveSavedLine,
  savedLineFrom,
} from '../state/lines';
import { saveTeamLines } from '../state/rosterStorage';
import { uid } from '../state/uid';
import type { SavedLine, TeamId } from '../state/types';
import { LineComposition } from './LineComposition';
import { Modal } from './Modal';
import { PlayerMultiPicker } from './PlayerPicker';
import { PlayerRosterEditor } from './PlayerRosterEditor';
import { inputClass, pillClass, primaryButton, secondaryButton } from './ui';

/**
 * Register who is on the field — for the point in progress, or for the next one.
 *
 * Two modes, one dialog. Between points there is only the current line to set; once
 * the disc is live a segmented toggle appears, because both questions are live then:
 * a substitution has to go on the point being played, and the following line is what
 * the volunteer has time to enter while it runs. Two dialogs would mean choosing
 * before you know which you meant.
 *
 * The composition warning never blocks. An off-spec line takes a second, confirming
 * tap instead — visible enough that it can't be missed, cheap enough that the line
 * that actually took the field always gets recorded (see `lineIssues`). Cancel is a
 * true no-op, the same contract PlayerSelectDialog documents.
 */
export function LineDialog({ team, onClose }: { team: TeamId; onClose: () => void }) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();

  const canNext = canSetLine(state, { next: true }).ok;
  const [mode, setMode] = useState<'current' | 'next'>('current');
  const editingNext = mode === 'next' && canNext;

  const roster = state.config.players[team];
  /**
   * One draft per mode, so switching tabs is free.
   *
   * A single shared selection meant switching to "Next point" and back silently threw
   * away the substitution just picked — and since both questions are live at once
   * (which is the whole argument for one dialog rather than two doors), losing one to
   * look at the other defeats the point. `dirty` is what Save consults: an untouched
   * mode is not re-dispatched, so opening the dialog to glance at the next line can't
   * re-register the current one.
   */
  const [drafts, setDrafts] = useState<
    Record<
      'current' | 'next',
      { selected: string[]; lineName: string | null; from: string[] | null; dirty: boolean }
    >
  >(() => ({
    current: { selected: state.line, lineName: state.lineName, from: null, dirty: false },
    next: {
      selected: state.nextLine?.playerIds ?? [],
      lineName: state.nextLine?.name ?? null,
      from: null,
      dirty: false,
    },
  }));
  const key = editingNext ? 'next' : 'current';
  const draft = drafts[key];
  const selected = draft.selected;
  const lineName = draft.lineName;
  const patchDraft = (patch: Partial<(typeof drafts)['current']>) =>
    setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch, dirty: true } }));

  // Armed by the first tap on an off-spec save; the second tap commits. A nested
  // confirm dialog would put a second sheet over a bottom sheet, and this is one
  // decision, not a new question.
  const [armed, setArmed] = useState(false);
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [savedAs, setSavedAs] = useState<string | null>(null);

  const size = state.config.lineSize;
  // The ratio a mode's line is being picked for. Between points the next point's ratio
  // has already been computed and is the one that governs, so it wins over the point
  // just finished; mid-point the current one is all there is.
  const ratioFor = (which: 'current' | 'next') =>
    which === 'next' ? (state.nextRatio ?? state.ratio) : (state.ratio ?? state.nextRatio);
  const issuesFor = (which: 'current' | 'next') =>
    lineIssues(state.config, ratioFor(which), roster, drafts[which].selected);
  const composition = lineComposition(roster, selected);
  const expected = expectedSplit(state.config, ratioFor(key));
  const issues = issuesFor(key);

  const switchMode = (next: 'current' | 'next') => {
    setMode(next);
    setArmed(false);
  };

  /**
   * Adding or dropping one player.
   *
   * A predefined line is a **template** — a pool with no size or split of its own —
   * so trimming one down to the seven who actually took the field is the ordinary way
   * to use it, and it stays that line's point. What does end the claim is bringing in
   * somebody the template never held: the seven on the field were then not drawn from
   * it, and crediting the point to it would be a lie the report repeats all game.
   * `from` is the loaded template's members, and null means nothing was loaded this
   * visit — so any addition is an edit and the name goes, as it always did.
   */
  const toggle = (id: string) => {
    setArmed(false);
    const removing = selected.includes(id);
    const outside = !removing && !draft.from?.includes(id);
    patchDraft({
      ...(outside ? { lineName: null, from: null } : {}),
      selected: removing ? selected.filter((x) => x !== id) : [...selected, id],
    });
  };

  const loadSaved = (saved: SavedLine) => {
    setArmed(false);
    const members = resolveSavedLine(saved, roster);
    patchDraft({ selected: members, lineName: saved.name, from: members });
  };

  /** Every mode the volunteer actually touched — so one visit can answer both. */
  const dirtyModes = (['current', 'next'] as const).filter((m) => drafts[m].dirty);

  const commit = () => {
    for (const m of dirtyModes) {
      const d = drafts[m];
      dispatch(
        m === 'next'
          ? { type: 'SET_NEXT_LINE', playerIds: d.selected, lineName: d.lineName }
          : { type: 'SET_LINE', playerIds: d.selected, lineName: d.lineName },
      );
    }
    onClose();
  };

  const save = () => {
    // Any touched mode being off-spec arms the confirmation, not just the one on
    // screen: Save is about to commit both, so both have to have been agreed to.
    if (dirtyModes.some((m) => issuesFor(m).length > 0) && !armed) {
      setArmed(true);
      return;
    }
    commit();
  };

  const saveAsLine = () => {
    const name = draftName.trim();
    if (!name) return;
    const line = savedLineFrom(uid(), name, selected, roster);
    // Both halves: the config copy is what this dialog offers for the rest of the
    // game, the store is what the next game at this tournament inherits.
    const lines = [...state.config.lines.saved.filter((l) => l.name !== name), line];
    dispatch({ type: 'SET_SAVED_LINES', lines });
    saveTeamLines(state.config.teams[team].name, lines);
    // The selection *is* the template now, so trimming it further keeps the name.
    patchDraft({ lineName: name, from: selected });
    setNaming(false);
    setDraftName('');
    setSavedAs(name);
  };

  return (
    <Modal title={t('lineDialogTitle', { team: state.config.teams[team].name })} onClose={onClose}>
      {canNext && (
        <div className="grid grid-cols-2 gap-2">
          <button
            className={pillClass(!editingNext)}
            aria-pressed={!editingNext}
            onClick={() => switchMode('current')}
          >
            {t('lineModeCurrent')}
          </button>
          <button
            className={pillClass(editingNext)}
            aria-pressed={editingNext}
            // The count is the only feedback that a pre-registered line took: the
            // dialog closes on save and the dashboard has nowhere to show it, so
            // without this the volunteer has to reopen and switch tabs to check.
            aria-label={
              drafts.next.selected.length > 0
                ? t('lineNextPending', { count: drafts.next.selected.length })
                : undefined
            }
            onClick={() => switchMode('next')}
          >
            {t('lineModeNext')}
            {drafts.next.selected.length > 0 && (
              <span className="ml-1 font-clock">{drafts.next.selected.length}</span>
            )}
          </button>
        </div>
      )}

      {state.config.lines.saved.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-chalk/60">{t('lineSavedTitle')}</p>
          <div className="flex flex-wrap gap-2">
            {state.config.lines.saved.map((saved) => (
              <button
                key={saved.id}
                className={pillClass(lineName === saved.name)}
                aria-label={t('lineLoadSaved', { name: saved.name })}
                onClick={() => loadSaved(saved)}
              >
                {saved.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <LineComposition size={size} composition={composition} expected={expected} issues={issues} />

      {roster.length === 0 ? (
        <p className="text-sm text-chalk/50">{t('lineNoRoster')}</p>
      ) : (
        <PlayerMultiPicker
          players={roster}
          selected={selected}
          showGender={state.config.lines.genderCheck !== 'none'}
          // Grouped whatever `genderCheck` says: the markings are a fact about the
          // squad, and a volunteer picking a line reads them off the roster whether or
          // not this game is checking the split.
          groupByGender
          onToggle={toggle}
          onRemove={(id) => {
            // The reducer scrubs a removed player off the field itself, so both drafts
            // are all that is left to keep in step — and both, not just the active one,
            // since the other may well have had them picked too.
            dispatch({ type: 'REMOVE_PLAYER', team, id });
            setDrafts((d) => ({
              current: { ...d.current, selected: d.current.selected.filter((x) => x !== id) },
              next: { ...d.next, selected: d.next.selected.filter((x) => x !== id) },
            }));
          }}
        />
      )}

      <PlayerRosterEditor
        label={t('addPlayer')}
        players={[]}
        onAdd={(number, name) => dispatch({ type: 'ADD_PLAYER', team, number, name })}
      />

      {naming ? (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            className={inputClass}
            maxLength={20}
            autoFocus
            aria-label={t('lineSaveNamePrompt')}
            placeholder={t('lineSaveNamePlaceholder')}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveAsLine()}
          />
          <button className={secondaryButton + ' px-3'} onClick={saveAsLine}>
            {t('btnSave')}
          </button>
        </div>
      ) : (
        <button
          className="text-xs text-chalk/60 underline text-left"
          disabled={selected.length === 0}
          onClick={() => setNaming(true)}
        >
          {savedAs ? t('lineSavedConfirm', { name: savedAs }) : t('btnSaveLine')}
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button className={secondaryButton} onClick={onClose}>
          {t('btnCancel')}
        </button>
        <button
          className={armed ? `${primaryButton} animate-pulse` : primaryButton}
          // The commit button's state, exposed the way the possession rule exposes
          // data-possession: its label is one of three strings, and "Save this line"
          // above starts with the same word as one of them.
          data-line-save={armed ? 'armed' : issues.length > 0 ? 'warned' : 'ready'}
          onClick={save}
        >
          {issues.length === 0
            ? t('btnSave')
            : armed
              ? t('btnLineConfirmAnyway')
              : t('btnLineSaveAnyway')}
        </button>
      </div>
    </Modal>
  );
}
