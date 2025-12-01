import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Collection, CollectionItem, Customer, CollectionSignature } from "../types/collection";

interface CollectionStore {
  collections: Collection[];
  customers: Customer[];

  // Collection actions
  addCollection: (collection: Omit<Collection, "id" | "createdAt" | "updatedAt" | "items">) => string;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  getCollection: (id: string) => Collection | undefined;

  // Item actions
  addItem: (collectionId: string, item: Omit<CollectionItem, "id" | "collectionId" | "createdAt" | "updatedAt">) => string;
  updateItem: (itemId: string, updates: Partial<CollectionItem>) => void;
  deleteItem: (itemId: string) => void;
  getItem: (itemId: string) => CollectionItem | undefined;

  // Customer actions
  addCustomer: (customer: Omit<Customer, "id">) => string;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Signature action
  signCollection: (collectionId: string, signature: CollectionSignature) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set, get) => ({
      collections: [],
      customers: [],

      addCollection: (collectionData) => {
        const id = `COL-${generateId()}`;
        const now = Date.now();
        const newCollection: Collection = {
          ...collectionData,
          id,
          items: [],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          collections: [...state.collections, newCollection],
        }));

        return id;
      },

      updateCollection: (id, updates) => {
        set((state) => ({
          collections: state.collections.map((col) =>
            col.id === id ? { ...col, ...updates, updatedAt: Date.now() } : col
          ),
        }));
      },

      deleteCollection: (id) => {
        set((state) => ({
          collections: state.collections.filter((col) => col.id !== id),
        }));
      },

      getCollection: (id) => {
        return get().collections.find((col) => col.id === id);
      },

      addItem: (collectionId, itemData) => {
        const id = `ITEM-${generateId()}`;
        const now = Date.now();
        const newItem: CollectionItem = {
          ...itemData,
          id,
          collectionId,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          collections: state.collections.map((col) =>
            col.id === collectionId
              ? { ...col, items: [...col.items, newItem], updatedAt: now }
              : col
          ),
        }));

        return id;
      },

      updateItem: (itemId, updates) => {
        set((state) => ({
          collections: state.collections.map((col) => ({
            ...col,
            items: col.items.map((item) =>
              item.id === itemId ? { ...item, ...updates, updatedAt: Date.now() } : item
            ),
            updatedAt: col.items.some((item) => item.id === itemId) ? Date.now() : col.updatedAt,
          })),
        }));
      },

      deleteItem: (itemId) => {
        set((state) => ({
          collections: state.collections.map((col) => ({
            ...col,
            items: col.items.filter((item) => item.id !== itemId),
            updatedAt: col.items.some((item) => item.id === itemId) ? Date.now() : col.updatedAt,
          })),
        }));
      },

      getItem: (itemId) => {
        const collections = get().collections;
        for (const collection of collections) {
          const item = collection.items.find((i) => i.id === itemId);
          if (item) return item;
        }
        return undefined;
      },

      addCustomer: (customerData) => {
        const id = `CUST-${generateId()}`;
        const newCustomer: Customer = { ...customerData, id };

        set((state) => ({
          customers: [...state.customers, newCustomer],
        }));

        return id;
      },

      updateCustomer: (id, updates) => {
        set((state) => ({
          customers: state.customers.map((cust) =>
            cust.id === id ? { ...cust, ...updates } : cust
          ),
        }));
      },

      deleteCustomer: (id) => {
        set((state) => ({
          customers: state.customers.filter((cust) => cust.id !== id),
        }));
      },

      signCollection: (collectionId, signature) => {
        set((state) => ({
          collections: state.collections.map((col) =>
            col.id === collectionId
              ? { ...col, signature, status: "signed" as const, updatedAt: Date.now() }
              : col
          ),
        }));
      },
    }),
    {
      name: "collection-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
