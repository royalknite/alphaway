# AlphaWay Test Platform 📖
> Complete Digital Textbook & Professional Online Examination Application

AlphaWay एक संपूर्ण, आधुनिक और डिजिटल टेक्स्टबुक आधारित ऑनलाइन परीक्षा प्रणाली है।

---

## 🚀 GitHub Actions से 1-Click में Android APK कैसे बनाएं (Build APK via GitHub Actions)

यह रिपॉजिटरी GitHub Actions के लिए 100% कॉन्फिगर की गई है। कोई अतिरिक्त सेटअप नहीं चाहिए!

### चरण 1: GitHub पर नया रिपॉजिटरी बनाएं
1. [GitHub](https://github.com) पर जाएं और लॉगिन करें।
2. **"New Repository"** पर क्लिक करें।
3. नाम दें: `alphaway-test-platform` और **Create repository** पर क्लिक करें।

### चरण 2: इस ZIP का पूरा कोड GitHub पर पुश करें
इस ZIP को अनज़िप (Extract) करें और टर्मिनल / Git Bash में यह कमांड चलाएं:
```bash
git init
git add .
git commit -m "AlphaWay Test Platform v1.0 complete release"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/alphaway-test-platform.git
git push -u origin main
```

*(या GitHub वेबसाइट पर जाकर **Add file > Upload files** से सभी फाइलें ड्रैग & ड्रॉप कर सकते हैं)*

### चरण 3: GitHub Actions में स्वचालित APK निर्माण
1. GitHub पर अपने रिपॉजिटरी में **"Actions"** टैब पर क्लिक करें।
2. **"Build AlphaWay Android APK"** वर्कफ़्लो अपने आप चलना शुरू हो जाएगा।
3. 2 से 4 मिनट में यह पूरा बिल्ड पास हो जाएगा (Green Checkmark ✅)।

### चरण 4: APK डाउनलोड करें
1. पूर्ण हुए वर्कफ़्लो रन (Green Checkmark) पर क्लिक करें।
2. नीचे **"Artifacts"** में जाएं और **`AlphaWay-Android-Debug-APK`** पर क्लिक करके सीधे अपने मोबाइल में इंस्टॉल करने योग्य APK डाउनलोड करें!

---

## 💻 स्थानीय विकास (Local Run)
```bash
npm install
npm run dev
```
Server runs at http://localhost:3000
