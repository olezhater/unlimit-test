/**
 * states.details.noteRule — notes are the account holder's own text, edited in
 * session state only and never persisted: an edit lasts until the page
 * reloads. The fixture's `note` is the starting value. Editing a note changes
 * no other field.
 *
 * A tiny external store, so the details panel and search (search.scope
 * includes the note) read the same value and re-render when it changes.
 */
import { useSyncExternalStore } from 'react';
import type { Fixture } from '../spec/spec.ts';

const edits = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;

export function noteOf(tx: Fixture): string {
  return edits.get(tx.id) ?? tx.note ?? '';
}

export function setNote(id: string, text: string): void {
  edits.set(id, text);
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A number that changes whenever any note is edited. */
export function useNotesVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}
