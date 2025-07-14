/* Copyright 2024 Marimo. All rights reserved. */

import type { CellActions } from "@/core/cells/cells";
import type { CellId } from "@/core/cells/ids";

interface VimBinding {
  keys: string; // e.g. "g g" or "shift-g"
  execute: (context: { cellId: CellId; actions: CellActions }) => void;
}

const keySequenceTracker = new WeakMap<
  EventTarget,
  {
    sequence: string;
    timestamp: number;
    timeout: number;
  }
>();

const SEQUENCE_TIMEOUT = 500;

function keyEventToString(evt: KeyboardEvent): string {
  const key = evt.key.toLowerCase();
  if (evt.ctrlKey || evt.metaKey || evt.altKey) {
    return "";
  }
  return evt.shiftKey ? `shift-${key}` : key;
}

const vimBindings: VimBinding[] = [
  {
    keys: "j",
    execute: ({ cellId, actions }) =>
      actions.focusCell({ cellId, before: false }),
  },
  {
    keys: "k",
    execute: ({ cellId, actions }) =>
      actions.focusCell({ cellId, before: true }),
  },
  {
    keys: "g g",
    execute: ({ actions }) => actions.focusTopCell(),
  },
  {
    keys: "shift-g",
    execute: ({ actions }) => actions.focusBottomCell(),
  },
];

export function handleVimKeybinding(
  evt: KeyboardEvent,
  context: { cellId: CellId; actions: CellActions },
): boolean {
  const target = evt.target;

  if (!target) {
    return false;
  }

  const keyStr = keyEventToString(evt);
  if (!keyStr) {
    return false;
  }

  const now = Date.now();
  const tracker = keySequenceTracker.get(target);

  let currentSequence = keyStr;
  if (tracker && now - tracker.timestamp < SEQUENCE_TIMEOUT) {
    currentSequence = `${tracker.sequence} ${keyStr}`;
    clearTimeout(tracker.timeout);
  }

  for (const binding of vimBindings) {
    if (binding.keys === currentSequence) {
      binding.execute(context);
      keySequenceTracker.delete(target);
      return true;
    }
  }

  const couldStartSequence = vimBindings.some((binding) =>
    binding.keys.startsWith(`${currentSequence} `),
  );

  if (couldStartSequence) {
    const timeout = window.setTimeout(() => {
      keySequenceTracker.delete(target);
    }, SEQUENCE_TIMEOUT);

    keySequenceTracker.set(target, {
      sequence: currentSequence,
      timestamp: now,
      timeout,
    });
    return true;
  }

  // not a vim command
  keySequenceTracker.delete(target);
  return false;
}
