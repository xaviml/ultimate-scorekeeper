import { useT } from '../i18n/useT';
import { CheckField } from './CheckField';

/**
 * "This goal had no assist" — the one answer to "who assisted?" that isn't a
 * player. A Callahan is caught in the endzone off the opposition's throw, so
 * nobody on the scoring team threw it, and without saying so the report cannot
 * tell that apart from an assist the volunteer never got round to recording
 * (see `playerStatLines`, which counts the second and skips the first).
 *
 * Ticking it hides the assist picker rather than disabling it: the question has
 * been answered, and leaving a dead row of chips on screen invites a tap that
 * would do nothing. Clearing whatever was already picked is the caller's job,
 * since the reducer also does it (SET_GOAL_PLAYERS) and the two dialogs hold
 * their own draft state.
 */
export function CallahanToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useT();
  // The tick rather than the switch: this answers the question on screen, it is not
  // a setting left standing.
  return <CheckField label={t('callahanToggle')} checked={checked} onChange={onChange} />;
}
