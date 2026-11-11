import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  X,
  CheckCircle2,
  Github,
  Terminal,
  FileCode,
  Layers,
  ArrowRight,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { generateProjectZip } from '../../utils/zipGenerator';

interface AndroidExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidExportModal: React.FC<AndroidExportModalProps> = ({
  isOpen,
  onClose
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    setIsGenerating(true);
    setDownloadSuccess(false);
    try {
      // 1. Try direct fetch of pre-packaged complete repository ZIP
      let zipBlob: Blob | null = null;
      try {
        const resp = await fetch('/alphaway-test-platform-complete.zip');
        if (resp.ok) {
          const blob = await resp.blob();
          if (blob.size > 10000) {
            zipBlob = blob;
          }
        }
      } catch {
        // Fallback to generator
      }

      if (!zipBlob) {
        zipBlob = await generateProjectZip();
      }

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `alphaway-test-platform-github-apk.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadSuccess(true);
    } catch (err: any) {
      alert(`ZIP निर्माण त्रुटि: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCommands = () => {
    const text = `git init
git add .
git commit -m "AlphaWay Test Platform v1.0 complete release"
git branch -M main
git remote add origin https://github.com/<YOUR_USER>/alphaway-test-platform.git
git push -u origin main`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  GitHub Actions Android APK Package
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] uppercase">
                  Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                GitHub पर अपलोड करें और बिना Android Studio के सीधे APK प्राप्त करें।
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Big Download Button */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-blue-950/40 border border-blue-200 dark:border-slate-700 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs">
            <Sparkles size={13} className="text-amber-500" />
            <span>Complete Ready-to-Build Source Code Included</span>
          </div>

          <h4 className="font-bold text-slate-900 dark:text-white text-base">
            📦 संपूर्ण रिपॉजिटरी एवं GitHub Actions APK ZIP
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            इस ZIP में संपूर्ण प्रोजेक्ट की सभी 30+ सोर्स कोड फ़ाइलें (React + TypeScript, Tailwind CSS, सभी कंपोनेंट्स, TXT पार्सर, परीक्षा इंजन), <code>.github/workflows/build-apk.yml</code>, Capacitor और Android कॉन्फ़िग शामिल हैं।
          </p>

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleDownloadZip}
            className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 active:scale-95 transition-all inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            <Download size={18} />
            <span>{isGenerating ? 'ZIP फ़ाइल तैयार हो रही है...' : 'Download Complete Repo ZIP (~550 KB)'}</span>
          </button>

          {downloadSuccess && (
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 animate-fade-in pt-1">
              <CheckCircle2 size={16} />
              <span>पूरी रिपॉजिटरी ZIP डाउनलोड हो गई! अब नीचे दिए गए चरणों से GitHub Actions चलाएं।</span>
            </div>
          )}
        </div>

        {/* Step-by-Step Hindi / Hinglish Instructions */}
        <div className="space-y-4">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
            GitHub Actions से APK बनाने के आसान चरण (3 Easy Steps)
          </h4>

          <div className="space-y-3 text-xs sm:text-sm">
            {/* Step 1 */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </div>
              <div className="space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">
                  GitHub पर नया Repository बनाएं
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs">
                  GitHub.com पर जाएं, <strong>New Repository</strong> पर क्लिक करें और नाम दें <code>alphaway-test-platform</code> (Public या Private)।
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white">
                    ZIP अनज़िप करें और GitHub पर पुश करें
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCommands}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copied ? 'कॉपी हो गया! (Copied)' : 'कमांड कॉपी करें'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto mt-1 leading-relaxed">
{`git init
git add .
git commit -m "AlphaWay Test Platform v1.0 complete release"
git branch -M main
git remote add origin https://github.com/<YOUR_USER>/alphaway-test-platform.git
git push -u origin main`}
                </pre>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </div>
              <div className="space-y-1">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Actions टैब में 0 एरर के साथ ऑटोमैटिक APK तैयार</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">100% Automated</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                  जैसे ही आप कोड पुश करेंगे, GitHub Actions वर्कफ़्लो स्वतः चलना शुरू हो जाएगा। 2 से 3 मिनट में यह ग्रीन टिक (✅) के साथ पास हो जाएगा। वर्कफ़्लो रन पर क्लिक करके नीचे <strong>Artifacts</strong> में <strong>&quot;AlphaWay-Android-Debug-APK&quot;</strong> डाउनलोड करें और सीधे अपने Android फ़ोन में इंस्टॉल करें!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            बंद करें (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
