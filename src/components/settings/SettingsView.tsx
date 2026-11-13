import React, { useState } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Smartphone,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { AppSettings } from '../../types';
import { db } from '../../services/storage';
import { soundManager } from '../../utils/audio';
import { ConfirmModal } from '../common/ConfirmModal';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenZipModal: () => void;
  onDatabaseRestored: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenZipModal,
  onDatabaseRestored
}) => {
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Export Complete Backup
  const handleExportBackup = async () => {
    try {
      const json = await db.exportCompleteDatabase();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AlphaWay_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setBackupMessage('✅ बैकअप सफलतापूर्वक डाउनलोड हो गया!');
      setTimeout(() => setBackupMessage(null), 4000);
    } catch (e: any) {
      alert(`बैकअप निर्यात विफल: ${e.message}`);
    }
  };

  // Restore Backup
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        const res = await db.restoreDatabase(text);
        if (res.success) {
          alert(`✅ ${res.message}\nकुल लोड किए गए: ${res.count?.tests} टेस्ट, ${res.count?.folders} फोल्डर्स।`);
          onDatabaseRestored();
        } else {
          alert(`❌ ${res.message}`);
        }
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Reset Database
  const handleResetConfirm = async () => {
    localStorage.clear();
    indexedDB.deleteDatabase('AlphaWayPlatformDB');
    alert('डेटाबेस रीसेट हो गया है। पृष्ठ पुनः लोड हो रहा है...');
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="text-blue-600 dark:text-blue-400" size={26} />
          <span>Application Settings (सेटिंग्स एवं अनुकूलन)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          थीम, डिफ़ॉल्ट परीक्षा नियम, ध्वनि, बैकअप एवं रीस्टोर प्रबंधन।
        </p>
      </div>

      {backupMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={18} />
          <span>{backupMessage}</span>
        </div>
      )}

      {/* 1. Appearance / Theme */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          ऐप थीम (App Appearance & Theme)
        </h2>

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onUpdateSettings({ theme: 'light' })}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
              settings.theme === 'light'
                ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Sun size={24} className="text-amber-500" />
            <span className="text-xs font-bold">Light Mode</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ theme: 'dark' })}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
              settings.theme === 'dark'
                ? 'border-blue-600 bg-blue-950/40 text-blue-100 font-bold'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Moon size={24} className="text-indigo-400" />
            <span className="text-xs font-bold">Dark Mode</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ theme: 'system' })}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
              settings.theme === 'system'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Sparkles size={24} className="text-blue-500" />
            <span className="text-xs font-bold">System Default</span>
          </button>
        </div>
      </div>

      {/* 2. App Language Preference */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>{settings.language === 'en' ? 'App UI Language' : 'ऐप भाषा (App Language)'}</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {settings.language === 'en'
            ? 'Select interface language for menus, buttons and dashboards (Default: English):'
            : 'ऐप इंटरफेस, मेन्यू व बटन के लिए भाषा चुनें (डिफ़ॉल्ट: English):'}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onUpdateSettings({ language: 'en' })}
            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
              settings.language === 'en'
                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="text-left">
              <div className="font-extrabold text-sm">English (Default)</div>
              <div className="text-[11px] text-slate-400 font-normal">Complete English interface</div>
            </div>
            {settings.language === 'en' && <CheckCircle2 className="text-blue-600" size={18} />}
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ language: 'hi' })}
            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
              settings.language === 'hi'
                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="text-left">
              <div className="font-extrabold text-sm">हिंदी (Hindi)</div>
              <div className="text-[11px] text-slate-400 font-normal">देवनागरी व संपूर्ण इंटरफेस</div>
            </div>
            {settings.language === 'hi' && <CheckCircle2 className="text-blue-600" size={18} />}
          </button>
        </div>
      </div>

      {/* 3. Question Language Preference (Questions kis language me dena chahte hai) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>{settings.language === 'en' ? 'Default Question Language' : 'प्रश्नों की भाषा प्राथमिकता (Question Language)'}</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {settings.language === 'en'
            ? 'Choose which language you prefer for test questions. You can also switch between English and Hindi anytime on each question inside the exam:'
            : 'परीक्षा में प्रश्न किस भाषा में देखना चाहते हैं? (परीक्षा के दौरान भी किसी भी प्रश्न पर तुरंत भाषा बदल सकते हैं):'}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onUpdateSettings({ questionLanguage: 'en' })}
            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
              (settings.questionLanguage || 'en') === 'en'
                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="text-left">
              <div className="font-extrabold text-sm">English Questions</div>
              <div className="text-[11px] text-slate-400 font-normal">Questions in English</div>
            </div>
            {(settings.questionLanguage || 'en') === 'en' && <CheckCircle2 className="text-blue-600" size={18} />}
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ questionLanguage: 'hi' })}
            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
              settings.questionLanguage === 'hi'
                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="text-left">
              <div className="font-extrabold text-sm">हिंदी प्रश्न (Hindi)</div>
              <div className="text-[11px] text-slate-400 font-normal">प्रश्न हिंदी में देखें</div>
            </div>
            {settings.questionLanguage === 'hi' && <CheckCircle2 className="text-blue-600" size={18} />}
          </button>
        </div>
      </div>

      {/* 2. Test Preferences & Audio */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          डिफ़ॉल्ट परीक्षा नियम (Default Test Rules)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              डिफ़ॉल्ट समय (Default Duration in Minutes)
            </label>
            <input
              type="number"
              min={5}
              value={settings.defaultDurationMinutes}
              onChange={(e) =>
                onUpdateSettings({ defaultDurationMinutes: parseInt(e.target.value, 10) || 60 })
              }
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              डिफ़ॉल्ट निगेटिव मार्किंग (Negative Marking)
            </label>
            <select
              value={settings.defaultNegativeMarking}
              onChange={(e) =>
                onUpdateSettings({ defaultNegativeMarking: parseFloat(e.target.value) || 0 })
              }
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-medium"
            >
              <option value="0">कोई नहीं (0)</option>
              <option value="0.25">0.25 (1/4th)</option>
              <option value="0.33">0.33 (1/3rd)</option>
              <option value="0.50">0.50 (1/2)</option>
            </select>
          </div>
        </div>

        {/* Audio Toggle */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                ध्वनि प्रभाव (Sound Feedback)
              </div>
              <p className="text-[11px] text-slate-500">
                विकल्प चुनने और परीक्षा समाप्त होने पर ऑडियो संकेत
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => {
                const en = e.target.checked;
                onUpdateSettings({ soundEnabled: en });
                soundManager.setEnabled(en);
                if (en) soundManager.playClick();
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* AI provider and API keys for PDF question extraction */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-violet-200 dark:border-violet-900 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">AI API Settings (PDF व Image प्रश्न इम्पोर्ट)</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          GitHub Actions से बनी Android APK में Backend Server शामिल नहीं होता। PDF/Image से प्रश्न निकालने के लिए Gemini चुनें और अपनी Gemini API Key सेव करें। Backend URL केवल तभी भरें जब आपने अलग से सर्वर होस्ट किया हो।
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onUpdateSettings({ pdfAiProvider: 'gemini' })} className={`rounded-xl border-2 p-3 text-sm font-bold ${ (settings.pdfAiProvider || 'gemini') === 'gemini' ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-200' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>Gemini API</button>
          <button type="button" onClick={() => onUpdateSettings({ pdfAiProvider: 'openai' })} className={`rounded-xl border-2 p-3 text-sm font-bold ${ settings.pdfAiProvider === 'openai' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-200' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>ChatGPT / OpenAI API</button>
        </div>
        {(!settings.pdfAiProvider || settings.pdfAiProvider === 'gemini') ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Gemini API Key (Android APK व Web दोनों में प्राथमिकता)</label>
              {settings.geminiApiKey?.trim() && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  ✅ Key सेव है
                </span>
              )}
            </div>
            <input type="password" value={settings.geminiApiKey || ''} onChange={(e) => onUpdateSettings({ geminiApiKey: e.target.value })} placeholder="AIza..." autoComplete="off" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Google AI Studio से अपनी Gemini API Key बनाकर यहाँ पेस्ट करें। Backend URL खाली रहने पर APK सीधे इसी Key से Gemini API को कॉल करेगी। API Key को APK में स्थायी रूप से embed नहीं किया जाता।</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">OpenAI API Key</label>
              {settings.openaiApiKey?.trim() && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  ✅ Key सेव है
                </span>
              )}
            </div>
            <input type="password" value={settings.openaiApiKey || ''} onChange={(e) => onUpdateSettings({ openaiApiKey: e.target.value })} placeholder="sk-..." autoComplete="off" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">ChatGPT Plus/Free subscription से API access शामिल नहीं होता; OpenAI Platform पर अलग API key और billing setup चाहिए।</p>
          </div>
        )}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Backend Server URL (वैकल्पिक — यदि आपका खुद का Node सर्वर होस्ट है)</label>
          <input
            type="url"
            value={settings.backendServerUrl || ''}
            onChange={(e) => onUpdateSettings({ backendServerUrl: e.target.value })}
            placeholder="https://your-alphaway-server.onrender.com"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <p className="text-[11px] text-amber-600 dark:text-amber-400">सुरक्षा: API Key इसी डिवाइस में सेव होगी, लेकिन APK में पूरी तरह सुरक्षित नहीं रहती। अपनी key किसी के साथ साझा न करें।</p>
      </div>

      {/* 3. Database Backup & Restore */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-emerald-500" size={20} />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            स्थायी डेटाबेस बैकअप एवं रीस्टोर (Backup & Restore)
          </h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          सभी बुक्स, सब-फोल्डर, प्रश्न संकलन, टेस्ट एवं प्रयास इतिहास को JSON फ़ाइल में सुरक्षित करें ताकि फोन बदलने या कैश साफ होने पर भी आपका डेटा सुरक्षित रहे।
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm transition-colors"
          >
            <Download size={16} />
            <span>बैकअप डाउनलोड करें (Export JSON)</span>
          </button>

          <label className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold text-xs sm:text-sm hover:bg-blue-100 cursor-pointer transition-colors">
            <Upload size={16} />
            <span>बैकअप रीस्टोर करें (Import JSON)</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 4. Android APK & GitHub Actions */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/40 rounded-2xl p-6 border border-blue-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="text-blue-600 dark:text-blue-400" size={22} />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Android APK & GitHub Actions Build
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px] uppercase">
            GitHub Ready
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          पूर्ण प्रोजेक्ट का ZIP डाउनलोड करें जिसमें GitHub Actions वर्कफ़्लो (<code>.github/workflows/build-apk.yml</code>), Android Manifest, Capacitor कॉन्फ़िग और सभी एसेट्स शामिल हैं। GitHub पर अपलोड करते ही ऑटोमैटिकली Android APK तैयार हो जाएगा।
        </p>

        <button
          type="button"
          onClick={onOpenZipModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md"
        >
          <Download size={16} />
          <span>GitHub APK Build ZIP डाउनलोड करें</span>
        </button>
      </div>

      {/* 5. Reset / Danger Zone */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-rose-200 dark:border-rose-950/60 shadow-xs space-y-3">
        <h2 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle size={18} />
          <span>डेटा रीसेट (Reset & Clear Cache)</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          स्थानीय डेटाबेस को साफ़ करके डिफ़ॉल्ट स्थिति में लाएं। यह क्रिया वापस नहीं ली जा सकती।
        </p>
        <button
          type="button"
          onClick={() => setIsResetConfirmOpen(true)}
          className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors"
        >
          डेटाबेस रीसेट करें (Reset All Data)
        </button>
      </div>

      {/* 6. About AlphaWay */}
      <div className="text-center text-xs text-slate-400 space-y-1">
        <div className="font-bold text-slate-700 dark:text-slate-300">
          AlphaWay Test Platform • Version 1.0.0
        </div>
        <div>Offline-first Digital Textbook & Examination Ecosystem</div>
      </div>

      {/* Reset confirmation modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="डेटाबेस रीसेट करें (Reset Database)"
        message="क्या आप वास्तव में सभी फोल्डर, टेस्ट और इतिहास को हटाना चाहते हैं? कृपया पुष्टि करने से पहले बैकअप डाउनलोड कर लें।"
        confirmLabel="हाँ, रीसेट करें"
        isDanger={true}
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
