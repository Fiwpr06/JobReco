import { create } from 'zustand';

interface UserState {
  activeCvId: number | null;
  setActiveCvId: (id: number | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  activeCvId: null,
  setActiveCvId: (id) => set({ activeCvId: id }),
}));
