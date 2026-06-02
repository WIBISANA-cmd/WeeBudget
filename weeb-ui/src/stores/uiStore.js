import { create } from 'zustand';

export const useUiStore = create((set) => ({
  isSidebarOpen: false,
  theme: 'dark', // futuristic dark theme as default
  activeModal: null,
  
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  
  setTheme: (theme) => set({ theme }),
  
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
}));
