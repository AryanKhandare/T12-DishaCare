import { useState, useEffect } from 'react';
import Hospital1View from './components/hospital 1/Hospital3DView';
import Hospital2View from './components/hospital 2/Hospital3DView';
import Hospital3View from './components/hospital 3/Hospital3DView';
import Hospital4View from './components/hospital 4/Hospital3DView';
import { Building2, Sun, Moon } from 'lucide-react';

export function App() {
  const [activeHospital, setActiveHospital] = useState<
    'hospital1' | 'hospital2' | 'hospital3' | 'hospital4'
  >('hospital1');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
    } selection:bg-sky-500 selection:text-white`}>
      {/* Hospital Switcher Header Bar & Dark Mode Control */}
      <div className="bg-slate-900 text-white py-2.5 px-4 sm:px-8 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono font-bold text-sm">
            <Building2 className="w-4.5 h-4.5 text-sky-400" />
            <span className="text-slate-300">BEDLINK FACILITY SWITCHER:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveHospital('hospital1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                activeHospital === 'hospital1'
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md ring-2 ring-sky-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Hospital 1 (Main Center)
            </button>
            <button
              onClick={() => setActiveHospital('hospital2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                activeHospital === 'hospital2'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-2 ring-purple-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Hospital 2 (Trauma Hub)
            </button>
            <button
              onClick={() => setActiveHospital('hospital3')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                activeHospital === 'hospital3'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Hospital 3 (L-Wing)
            </button>
            <button
              onClick={() => setActiveHospital('hospital4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                activeHospital === 'hospital4'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md ring-2 ring-cyan-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Hospital 4 (C-Wing Imaging & NICU)
            </button>

            {/* Dark Mode Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ml-1 ${
                isDarkMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Render Active Hospital Model View */}
      {activeHospital === 'hospital1' ? (
        <Hospital1View mode="nurse" />
      ) : activeHospital === 'hospital2' ? (
        <Hospital2View mode="nurse" />
      ) : activeHospital === 'hospital3' ? (
        <Hospital3View mode="nurse" />
      ) : (
        <Hospital4View mode="nurse" />
      )}
    </div>
  );
}

export default App;
