import React from 'react';
import { 
  BookOpen, 
  Moon, 
  Sun, 
  Menu, 
  X,
  Search,
  Smartphone,
  Languages
} from 'lucide-react';
import { AppSettings, NavigationTab } from '../../types';
import { getTranslation } from '../../utils/translations';

interface HeaderProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenZipModal: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalTests: number;
  totalFolders: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  settings,
  onUpdateSettings,
  onOpenZipModal,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  searchQuery,
  setSearchQuery,
  totalTests,
  totalFolders
}) => {
  const t = getTranslation(settings.language || 'en');

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    onUpdateSettings({ theme: nextTheme });
  };

  const toggleLanguage = () => {
    const nextLang = settings.language === 'en' ? 'hi' : 'en';
    onUpdateSettings({ language: nextLang });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left group"
          >
            {/* Open Book Logo Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <BookOpen size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                  Alpha<span className="text-blue-600 dark:text-blue-400">Way</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded uppercase tracking-wider">
                  PRO
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 -mt-0.5 hidden xs:block">
                Digital Textbook & Exam Platform
              </p>
            </div>
          </button>
        </div>

        {/* Global Search Bar (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-2">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={17} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-4 py-1.5 text-sm rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Language Switcher Button (Hindi / English) */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-xs"
            title="भाषा बदलें / Change Language"
          >
            <Languages size={15} className="text-blue-600 dark:text-blue-400" />
            <span className="font-hindi">{settings.language === 'en' ? 'EN' : 'हिंदी'}</span>
          </button>

          {/* Theme Toggle (Dark / Light Button) */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-xs"
            title={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {settings.theme === 'dark' ? (
              <>
                <Sun size={16} className="text-amber-400 animate-spin-slow" />
                <span className="hidden sm:inline text-[11px]">Light</span>
              </>
            ) : (
              <>
                <Moon size={16} className="text-indigo-600" />
                <span className="hidden sm:inline text-[11px]">Dark</span>
              </>
            )}
          </button>

          {/* Stats Badge (Desktop) */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-medium">
            <span>📚 {totalFolders}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>📝 {totalTests}</span>
          </div>

          {/* GitHub Actions & Android APK Export */}
          <button
            onClick={onOpenZipModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all shadow-blue-500/20 active:scale-95 shrink-0"
            title="Download GitHub APK ZIP project"
          >
            <Smartphone size={15} />
            <span className="hidden sm:inline">Build APK</span>
            <span className="sm:hidden">APK</span>
          </button>
        </div>
      </div>
    </header>
  );
};
