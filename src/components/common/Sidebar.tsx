import React from 'react';
import {
  Home,
  BookOpen,
  FileCheck2,
  PlusCircle,
  History,
  BarChart3,
  Database,
  GitCompare,
  Settings,
  Sparkles
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { getTranslation, Language } from '../../utils/translations';

interface SidebarProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  testCount: number;
  folderCount: number;
  language?: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  isMobileOpen,
  setIsMobileOpen,
  testCount,
  folderCount,
  language = 'en'
}) => {
  const t = getTranslation(language);

  const navItems = [
    { id: 'home' as NavigationTab, label: t.home, icon: Home, badge: null },
    { id: 'books' as NavigationTab, label: t.myBooks, icon: BookOpen, badge: folderCount },
    { id: 'tests' as NavigationTab, label: t.allTests, icon: FileCheck2, badge: testCount },
    { id: 'create' as NavigationTab, label: t.createTest, icon: PlusCircle, badge: 'TXT' },
    { id: 'history' as NavigationTab, label: t.testHistory, icon: History, badge: null },
    { id: 'performance' as NavigationTab, label: t.performance, icon: BarChart3, badge: null },
    { id: 'question-bank' as NavigationTab, label: t.questionBank, icon: Database, badge: null },
    { id: 'comparison' as NavigationTab, label: t.testCompare, icon: GitCompare, badge: null },
    { id: 'settings' as NavigationTab, label: t.settings, icon: Settings, badge: null },
  ];

  const handleItemClick = (tab: NavigationTab) => {
    onNavigate(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-50 md:z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {language === 'en' ? 'Navigation' : 'नेविगेशन (Navigation)'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-blue-200/70 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Educational Textbook Banner */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/30 border border-blue-100 dark:border-slate-700/60 text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300 mb-1">
              <Sparkles size={14} className="text-amber-500" />
              <span>Offline Ready</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              {language === 'en'
                ? 'Persistent local database: All tests and records are saved locally.'
                : 'स्थायी डेटाबेस: सभी टेस्ट और परिणाम आपके डिवाइस में सुरक्षित रहते हैं।'}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
