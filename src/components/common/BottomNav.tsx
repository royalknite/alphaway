import React from 'react';
import { Home, BookOpen, Plus, History, Settings } from 'lucide-react';
import { NavigationTab } from '../../types';

interface BottomNavProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onNavigate }) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1 shadow-2xl transition-colors"
    >
      <div className="max-w-md mx-auto flex items-center justify-between relative h-16">
        {/* 1. HOME 🏠 (Left) */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            currentTab === 'home'
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Home size={22} className={currentTab === 'home' ? 'stroke-[2.4]' : 'stroke-2'} />
            {currentTab === 'home' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Home</span>
        </button>

        {/* 2. MY BOOKS 📚 (Left-Center) */}
        <button
          type="button"
          onClick={() => onNavigate('books')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            currentTab === 'books'
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <BookOpen size={22} className={currentTab === 'books' ? 'stroke-[2.4]' : 'stroke-2'} />
            {currentTab === 'books' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Books</span>
        </button>

        {/* 3. CREATE ➕ (CENTER - Elevated Prominent Button) */}
        <div className="flex-1 flex flex-col items-center justify-center relative -top-3">
          <button
            type="button"
            onClick={() => onNavigate('create')}
            className={`w-13 h-13 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 border-3 border-white dark:border-slate-900 ${
              currentTab === 'create'
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/50 scale-105 ring-2 ring-blue-400/40'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/30 hover:scale-105'
            }`}
            title="Create New Test via TXT"
            aria-label="Create New Test"
          >
            <Plus size={26} className="stroke-[2.8]" />
          </button>
          <span
            className={`text-[10px] mt-0.5 tracking-tight font-extrabold ${
              currentTab === 'create'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Create
          </span>
        </div>

        {/* 4. HISTORY 🕒 (Right-Center) */}
        <button
          type="button"
          onClick={() => onNavigate('history')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            currentTab === 'history'
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <History size={22} className={currentTab === 'history' ? 'stroke-[2.4]' : 'stroke-2'} />
            {currentTab === 'history' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">History</span>
        </button>

        {/* 5. SETTINGS ⚙️ (Right) */}
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            currentTab === 'settings'
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Settings size={22} className={currentTab === 'settings' ? 'stroke-[2.4]' : 'stroke-2'} />
            {currentTab === 'settings' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Settings</span>
        </button>
      </div>
    </nav>
  );
};
