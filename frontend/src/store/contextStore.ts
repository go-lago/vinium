import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Context } from '@/types'

interface ContextState {
  contexts: Context[]
  activeContextId: string | null
  setContexts: (contexts: Context[]) => void
  setActiveContext: (id: string) => void
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      contexts: [],
      activeContextId: null,
      setContexts: (contexts) =>
        set((s) => ({
          contexts,
          activeContextId:
            s.activeContextId && contexts.some((c) => c.id === s.activeContextId)
              ? s.activeContextId
              : (contexts.find((c) => c.is_default)?.id ?? contexts[0]?.id ?? null),
        })),
      setActiveContext: (id) => set({ activeContextId: id }),
    }),
    { name: 'vinium-context' },
  ),
)
