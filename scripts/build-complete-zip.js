import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const rootDir = process.cwd();
const outputZipPath = path.join(rootDir, 'public', 'alphaway-test-platform-complete.zip');

console.log('Generating complete repository ZIP for AlphaWay Test Platform...');

const zip = new JSZip();

// Excluded files / folders
const excludedDirs = new Set(['node_modules', '.git', 'dist', '.cache', '.aistudio']);
const excludedFiles = new Set(['bun.lock', 'alphaway-test-platform-complete.zip']);

function addDirectoryToZip(dirPath, zipFolder) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      if (entry.name !== '.gitignore' && entry.name !== '.github' && entry.name !== '.env.example') {
        continue;
      }
    }

    if (entry.isDirectory()) {
      if (excludedDirs.has(entry.name)) continue;
      const subDirPath = path.join(dirPath, entry.name);
      const subZip = zipFolder.folder(entry.name);
      addDirectoryToZip(subDirPath, subZip);
    } else if (entry.isFile()) {
      if (excludedFiles.has(entry.name)) continue;
      if (entry.name.endsWith('.zip')) continue;

      const filePath = path.join(dirPath, entry.name);
      const fileData = fs.readFileSync(filePath);
      zipFolder.file(entry.name, fileData);
      console.log(`Added: ${path.relative(rootDir, filePath)}`);
    }
  }
}

// 1. Add all project source files
addDirectoryToZip(rootDir, zip);

// 2. Add / Ensure GitHub Actions Workflow for Building APK
const workflowYml = `name: Build AlphaWay Android APK

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    name: Build Android APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Java JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: gradle

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Node Dependencies
        run: |
          npm install --legacy-peer-deps
          npm install --no-save @capacitor/core@^6.0.0 @capacitor/cli@^6.0.0 @capacitor/android@^6.0.0

      - name: Build Web Application
        run: |
          npm run build

      - name: Add Capacitor Android Platform
        run: |
          if [ ! -d "android" ]; then
            npx cap add android
          fi
          npx cap sync android

      - name: Make Gradle Executable
        run: |
          if [ -f "android/gradlew" ]; then
            chmod +x android/gradlew
          fi

      - name: Build Debug APK with Gradle
        working-directory: android
        run: ./gradlew assembleDebug --stacktrace --no-daemon

      - name: Upload Debug APK as Artifact
        uses: actions/upload-artifact@v4
        with:
          name: AlphaWay-Android-Debug-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
          retention-days: 30
`;

zip.file('.github/workflows/build-apk.yml', workflowYml);

// 3. Add Capacitor Configuration
const capacitorConfig = `import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alphaway.testplatform',
  appName: 'AlphaWay',
  webDir: 'dist',
  bundledWebRuntime: false,
  backgroundColor: '#1e3a8a',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1e3a8a",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#ffffff"
    }
  }
};

export default config;
`;

zip.file('capacitor.config.ts', capacitorConfig);

// 4. Ensure .gitignore
const gitignoreContent = `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`;
zip.file('.gitignore', gitignoreContent);

// 5. Ensure Comprehensive README
const readmeContent = `# AlphaWay Test Platform 📖
> Complete Digital Textbook & Professional Online Examination Application

AlphaWay एक संपूर्ण, आधुनिक और डिजिटल टेक्स्टबुक आधारित ऑनलाइन परीक्षा प्रणाली है।

---

## 🚀 GitHub Actions से 1-Click में Android APK कैसे बनाएं (Build APK via GitHub Actions)

यह रिपॉजिटरी GitHub Actions के लिए 100% कॉन्फिगर की गई है। कोई अतिरिक्त सेटअप नहीं चाहिए!

### चरण 1: GitHub पर नया रिपॉजिटरी बनाएं
1. [GitHub](https://github.com) पर जाएं और लॉगिन करें।
2. **"New Repository"** पर क्लिक करें।
3. नाम दें: \`alphaway-test-platform\` और **Create repository** पर क्लिक करें।

### चरण 2: इस ZIP का पूरा कोड GitHub पर पुश करें
इस ZIP को अनज़िप (Extract) करें और टर्मिनल / Git Bash में यह कमांड चलाएं:
\`\`\`bash
git init
git add .
git commit -m "AlphaWay Test Platform v1.0 complete release"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/alphaway-test-platform.git
git push -u origin main
\`\`\`

*(या GitHub वेबसाइट पर जाकर **Add file > Upload files** से सभी फाइलें ड्रैग & ड्रॉप कर सकते हैं)*

### चरण 3: GitHub Actions में स्वचालित APK निर्माण
1. GitHub पर अपने रिपॉजिटरी में **"Actions"** टैब पर क्लिक करें।
2. **"Build AlphaWay Android APK"** वर्कफ़्लो अपने आप चलना शुरू हो जाएगा।
3. 2 से 4 मिनट में यह पूरा बिल्ड पास हो जाएगा (Green Checkmark ✅)।

### चरण 4: APK डाउनलोड करें
1. पूर्ण हुए वर्कफ़्लो रन (Green Checkmark) पर क्लिक करें।
2. नीचे **"Artifacts"** में जाएं और **\`AlphaWay-Android-Debug-APK\`** पर क्लिक करके सीधे अपने मोबाइल में इंस्टॉल करने योग्य APK डाउनलोड करें!

---

## 💻 स्थानीय विकास (Local Run)
\`\`\`bash
npm install
npm run dev
\`\`\`
Server runs at http://localhost:3000
`;
zip.file('README.md', readmeContent);

// Generate ZIP file
zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
  .pipe(fs.createWriteStream(outputZipPath))
  .on('finish', () => {
    const stats = fs.statSync(outputZipPath);
    console.log(`Successfully created complete repository ZIP!`);
    console.log(`Location: ${outputZipPath}`);
    console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
  });
