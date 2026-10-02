import { create } from "zustand";

interface ThemeState {
  dark: boolean;
  init: () => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  dark: false,
  init: () => {
    const dark = localStorage.getItem("bedlink-theme") === "dark";
    document.documentElement.classList.toggle("dark", dark);
    set({ dark });
  },
  toggle: () => {
    const dark = !get().dark;
    localStorage.setItem("bedlink-theme", dark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", dark);
    set({ dark });
  },
}));
