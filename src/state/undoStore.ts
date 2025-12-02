import { create } from "zustand";
import type { CollectionItem } from "../types/collection";

interface UndoAction {
  type: "delete_item";
  timestamp: number;
  data: {
    item: CollectionItem;
    collectionId: string;
  };
}

interface UndoStore {
  undoStack: UndoAction[];
  addUndoAction: (action: UndoAction) => void;
  getLastUndo: () => UndoAction | null;
  removeLastUndo: () => void;
  clearUndoStack: () => void;
}

export const useUndoStore = create<UndoStore>((set, get) => ({
  undoStack: [],

  addUndoAction: (action) => {
    set((state) => ({
      undoStack: [...state.undoStack, action].slice(-10), // Keep last 10 actions
    }));

    // Auto-clear undo after 30 seconds
    setTimeout(() => {
      const currentStack = get().undoStack;
      const actionIndex = currentStack.findIndex((a) => a.timestamp === action.timestamp);
      if (actionIndex !== -1) {
        set((state) => ({
          undoStack: state.undoStack.filter((a) => a.timestamp !== action.timestamp),
        }));
      }
    }, 30000);
  },

  getLastUndo: () => {
    const stack = get().undoStack;
    return stack.length > 0 ? stack[stack.length - 1] : null;
  },

  removeLastUndo: () => {
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
    }));
  },

  clearUndoStack: () => {
    set({ undoStack: [] });
  },
}));
