import JSZip from 'jszip';

export async function generateProjectZip(): Promise<Blob> {
  // 1. Try to fetch the complete pre-built repository ZIP containing all source files
  try {
    const response = await fetch('/alphaway-test-platform-complete.zip');
    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 5000) {
        return blob;
      }
    }
  } catch (err) {
    console.warn('Using in-memory zip generator fallback', err);
  }

  const zip = new JSZip();

  // 1. GitHub Actions Workflow for Building APK
  const workflowYml = `name: Build AlphaWay Android APK

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
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

    - name: Install Dependencies
      run: npm ci || npm install

    - name: Build Web Application
      run: npm run build

    - name: Add Capacitor Android Platform
      run: |
        npx cap add android || true
        npx cap sync android

    - name: Make Gradle Wrapper Executable
      run: |
        if [ -f "android/gradlew" ]; then
          chmod +x android/gradlew
        fi

    - name: Build Debug APK with Gradle
      working-directory: android
      run: ./gradlew assembleDebug --stacktrace

    - name: Upload Debug APK as Artifact
      uses: actions/upload-artifact@v4
      with:
        name: AlphaWay-Debug-APK
        path: android/app/build/outputs/apk/debug/app-debug.apk
        retention-days: 30
`;

  zip.file('.github/workflows/build-apk.yml', workflowYml);

  // 2. Capacitor Config
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

  // 3. Android Manifest
  const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.alphaway.testplatform">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_DOCUMENTS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths"></meta-data>
        </provider>
    </application>
</manifest>
`;
  zip.file('android/app/src/main/AndroidManifest.xml', androidManifest);

  // 4. Android Strings & Styles
  zip.file('android/app/src/main/res/values/strings.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">AlphaWay Test Platform</string>
    <string name="title_activity_main">AlphaWay</string>
    <string name="package_name">com.alphaway.testplatform</string>
    <string name="custom_url_scheme">alphaway</string>
</resources>
`);

  zip.file('android/app/src/main/res/values/styles.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Base application theme. -->
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">#2563eb</item>
        <item name="colorPrimaryDark">#1d4ed8</item>
        <item name="colorAccent">#3b82f6</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">#1e3a8a</item>
    </style>
</resources>
`);

  zip.file('android/app/src/main/res/xml/file_paths.xml', `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="my_images" path="." />
</paths>
`);

  // 5. Android build.gradle
  zip.file('android/app/build.gradle', `apply plugin: 'com.android.application'

android {
    namespace "com.alphaway.testplatform"
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.alphaway.testplatform"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.coordinatorlayout:coordinatorlayout:1.2.0'
    implementation 'androidx.core:core-splashscreen:1.0.1'
}
`);

  // 6. SVG App Icon Asset
  const appIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- Background Rounded Shield -->
  <rect width="512" height="512" rx="120" fill="url(#blueGrad)" />
  
  <!-- Outer Glow Ring -->
  <circle cx="256" cy="256" r="210" fill="none" stroke="#60a5fa" stroke-width="6" stroke-dasharray="16 12" opacity="0.4" />

  <!-- Open Book Symbol -->
  <g transform="translate(96, 120)" filter="url(#shadow)">
    <!-- Left Page -->
    <path d="M 160,210 C 100,180 30,195 10,205 L 10,65 C 30,55 100,40 160,70 Z" fill="#ffffff" />
    <path d="M 35,95 L 135,75 M 35,125 L 135,105 M 35,155 L 120,138" stroke="#cbd5e1" stroke-width="6" stroke-linecap="round" />

    <!-- Right Page -->
    <path d="M 160,210 C 220,180 290,195 310,205 L 310,65 C 290,55 220,40 160,70 Z" fill="#f8fafc" />
    <path d="M 185,75 L 285,95 M 185,105 L 285,125 M 185,138 L 270,155" stroke="#93c5fd" stroke-width="6" stroke-linecap="round" />

    <!-- Center Spine & Bookmark Ribbon -->
    <path d="M 158,68 L 158,220" stroke="#1d4ed8" stroke-width="8" stroke-linecap="round" />
    <path d="M 160,70 L 160,190 L 175,175 L 190,190 L 190,75 Z" fill="#f59e0b" />
  </g>

  <!-- AlphaWay Text & Badge -->
  <text x="256" y="420" font-family="Arial, sans-serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle" letter-spacing="4">ALPHAWAY</text>
  <text x="256" y="455" font-family="Arial, sans-serif" font-weight="600" font-size="18" fill="#93c5fd" text-anchor="middle" letter-spacing="3">TEST PLATFORM</text>
</svg>`;
  zip.file('android/app/src/main/res/drawable/app_icon.svg', appIconSvg);

  // 7. Comprehensive README in Hindi & English
  const readmeContent = `# AlphaWay Test Platform 📖
> Complete Digital Textbook & Professional Online Examination Application

AlphaWay एक संपूर्ण, आधुनिक और डिजिटल टेक्स्टबुक आधारित ऑनलाइन परीक्षा प्रणाली है। इसमें आप TXT फ़ाइलों से MCQ प्रश्न लोड कर सकते हैं, फोल्डर और सब-फोल्डर में व्यवस्थित कर सकते हैं, रियल ऑनलाइन परीक्षा दे सकते हैं, तथा सटीक अंक व व्याख्यात्मक विश्लेषण देख सकते हैं।

---

## 🌟 मुख्य विशेषताएँ (Key Features)

1. **Digital Textbook Library (माय बुक्स)**:
   - असीमित मुख्य फोल्डर और सब-फोल्डर (जैसे: Bihar Police > Daroga > Mock Tests)।
   - टेस्ट को स्थानांतरित (Move), कॉपी (Duplicate) और व्यवस्थित करने की पूरी सुविधा।
   - स्थायी डेटा संग्रहण (Local-first IndexedDB Database)।

2. **Smart TXT Question Parser**:
   - \`प्रश्न 1. ... A) ... B) ✅ ... Ex: ...\` प्रारूप को स्वतः पहचानना।
   - हिंदी (देवनागरी), अंग्रेजी, गणितीय समीकरण और प्रतीकों का संपूर्ण समर्थन।
   - गलत प्रारूप पर त्रुटि चेतावनी व सुधारने की सुविधा।

3. **Professional Examination Interface (TCS iON / NTA Standard)**:
   - लाइव टाइमर व काउंटडाउन।
   - 5 रंगीन प्रश्न पैलेट (हरा: उत्तर दिया, लाल: उत्तर नहीं दिया, बैंगनी: समीक्षा हेतु चिह्नित, स्लेटी: विज़िट नहीं किया)।
   - ऑटो-सेव: गलती से पेज रीलोड होने पर भी परीक्षा वहीं से शुरू होती है।

4. **Practice Mode (अभ्यास मोड)**:
   - उत्तर चुनते ही तुरंत सही/गलत का पता और विस्तृत व्याख्या।
   - गलत या छूटे प्रश्नों को दोबारा हल करने का विकल्प।

5. **सटीक अंक गणना (Accurate Marking)**:
   - \`Positive Marks = Correct × Marks per Question\`
   - \`Negative Marks = Incorrect × Negative Marking\`
   - \`Final Score = Positive − Negative\`

6. **Permanent History & Test Comparison**:
   - हर प्रयास का अलग रिकॉर्ड।
   - दो या अधिक प्रयासों की तुलना (स्कोर, सटीकता और समय का अंतर)।

7. **PDF & CSV Export**:
   - प्रश्न पत्र (Question Paper) और परिणाम स्कोरकार्ड सीधे A4 PDF के रूप में डाउनलोड करें।

---

## 🚀 GitHub Actions से Android APK कैसे बनाएं (Build APK via GitHub Actions)

यह प्रोजेक्ट GitHub Actions के लिए 100% तैयार है। बस निम्नलिखित 4 आसान कदम अपनाएं:

### चरण 1: GitHub पर नया रिपॉजिटरी बनाएं
1. [GitHub](https://github.com) पर जाएं और लॉगिन करें।
2. **"New Repository"** पर क्लिक करें।
3. नाम दें: \`alphaway-test-platform\` और **Create repository** पर क्लिक करें।

### चरण 2: कोड अपलोड करें
इस ZIP फ़ाइल को अनज़िप (Extract) करें और अपने GitHub रिपॉजिटरी में पुश करें:
\`\`\`bash
git init
git add .
git commit -m "Initial AlphaWay commit"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/alphaway-test-platform.git
git push -u origin main
\`\`\`

### चरण 3: स्वचालित APK निर्माण
1. GitHub पर अपने रिपॉजिटरी के **"Actions"** टैब पर जाएं।
2. आपको **"Build AlphaWay Android APK"** वर्कफ़्लो दिखेगा।
3. पुश करते ही यह वर्कफ़्लो अपने आप चलना शुरू हो जाएगा (या **"Run workflow"** पर क्लिक करें)।
4. 3 से 5 मिनट के भीतर यह Android SDK और Gradle चलाकर APK तैयार कर देगा।

### चरण 4: APK डाउनलोड करें
1. पूर्ण हुए वर्कफ़्लो रन पर क्लिक करें।
2. पृष्ठ के निचले भाग में **"Artifacts"** अनुभाग में जाएं।
3. **\`AlphaWay-Debug-APK\`** पर क्लिक करके सीधे अपने मोबाइल में इंस्टॉल करने योग्य APK डाउनलोड करें!

---

## 💻 स्थानीय विकास (Local Development)

\`\`\`bash
# 1. निर्भरताएँ इंस्टॉल करें
npm install

# 2. डेवलपमेंट सर्वर शुरू करें (Port 3000)
npm run dev

# 3. प्रोडक्शन बिल्ड बनाएं
npm run build
\`\`\`

---

## 📱 Capacitor से सीधे Android Studio में चलाएं (Local APK Build)

\`\`\`bash
npm run build
npx cap add android
npx cap sync
npx cap open android
\`\`\`
Android Studio खुलने के बाद **Build > Build Bundle(s) / APK(s) > Build APK(s)** पर क्लिक करें।

---
Developed for Students & Competitive Exam Aspirants • AlphaWay Test Platform
`;
  zip.file('README.md', readmeContent);

  // Generate the blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
}
