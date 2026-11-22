import { useSyncExternalStore } from 'react';
import { loadPlayerSort, subscribePlayerSort, type PlayerSort } from '../state/uiPreferences';

/** The device's player order, re-rendering every picker the moment it changes. */
export function usePlayerSort(): PlayerSort {
  return useSyncExternalStore(subscribePlayerSort, loadPlayerSort, loadPlayerSort);
}
