import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';

interface SplashScreenProps {
  isDataReady: boolean;
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isDataReady, onFinish }) => {
  const [minDelayElapsed, setMinDelayElapsed] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Hold the splash animation for ~3.2s before starting the fade-out transition (~3.6s total)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinDelayElapsed(true);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!minDelayElapsed || !isDataReady || isExiting) return;
    setIsExiting(true);
    const fadeTimer = window.setTimeout(() => {
      onFinish();
    }, 400);
    return () => window.clearTimeout(fadeTimer);
  }, [minDelayElapsed, isDataReady, isExiting, onFinish]);

  return (
    <div
      role="status"
      aria-label="Alphaway Test Platform loading"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white overflow-hidden select-none transition-all duration-400 ease-out ${
        isExiting ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle atmospheric glow layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Centered Logo + App Name + Tagline */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full">
        {/* Centered Existing App Logo */}
        <div className="relative flex items-center justify-center mb-7">
          <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-2 border-blue-400/50 animate-splash-halo" />
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-2xl shadow-blue-600/40 ring-1 ring-white/25 animate-splash-logo">
            <BookOpen size={48} className="stroke-[2.2]" />
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white animate-splash-title">
          Alphaway Test Platform
        </h1>

        {/* Tagline */}
        <p className="mt-2.5 px-4 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-xs text-xs sm:text-sm font-semibold tracking-wide text-blue-100 animate-splash-tagline">
          Alphaway Test Platform
        </p>

        {/* Smooth animated loading bar */}
        <div className="mt-9 w-48 sm:w-56 h-1.5 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 animate-splash-progress" />
        </div>
      </div>
    </div>
  );
};
