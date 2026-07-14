/**
 * Typed in-app command bus.
 *
 * Replaces the previous fragile pattern of dispatching stringly-typed
 * `window` CustomEvents (e.g. 'trigger-bigbang', `edit-node-${id}`).
 * Commands are strongly typed, testable, and don't pollute the global window.
 */
export interface CommandMap {
  bigBang: void;
  clearCanvas: void;
  zoomFit: void;
  editNode: string; // payload: nodeId
}

type CommandArgs<T> = T extends void ? [] : [payload: T];
type CommandHandler<T> = T extends void ? () => void : (payload: T) => void;

class CommandBus {
  private listeners = new Map<keyof CommandMap, Set<(payload?: unknown) => void>>();

  on<K extends keyof CommandMap>(command: K, handler: CommandHandler<CommandMap[K]>): () => void {
    let set = this.listeners.get(command);
    if (!set) {
      set = new Set();
      this.listeners.set(command, set);
    }
    const wrapped = handler as (payload?: unknown) => void;
    set.add(wrapped);
    return () => {
      set!.delete(wrapped);
    };
  }

  emit<K extends keyof CommandMap>(command: K, ...args: CommandArgs<CommandMap[K]>): void {
    const set = this.listeners.get(command);
    if (!set) return;
    for (const handler of set) {
      handler(args[0]);
    }
  }
}

export const commandBus = new CommandBus();
