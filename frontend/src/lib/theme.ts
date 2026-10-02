import { create } from "zustand";

interface ThemeState {
  dark: boolean;
  init: () => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set) => ({
  dark: false,
  init: () => {
    localStorage.removeItem("bedlink-theme");
    document.documentElement.classList.remove("dark");
    set({ dark: false });
  },
  toggle: () => {
    document.documentElement.classList.remove("dark");
    set({ dark: false });
  },
}));
