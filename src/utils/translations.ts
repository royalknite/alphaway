export type Language = 'hi' | 'en';

export const translations = {
  hi: {
    // Navigation
    home: 'होम (Home)',
    myBooks: 'माय बुक्स (My Books)',
    allTests: 'सभी टेस्ट (All Tests)',
    createTest: 'नया टेस्ट (Create Test)',
    testHistory: 'इतिहास (History)',
    performance: 'प्रदर्शन (Performance)',
    questionBank: 'प्रश्न बैंक (Question Bank)',
    testCompare: 'तुलना (Compare)',
    settings: 'सेटिंग्स (Settings)',

    // Header & Global
    searchPlaceholder: 'खोजें: टेस्ट का नाम, विषय या प्रश्न...',
    buildApkZip: 'Build APK / ZIP',
    booksBadge: 'बुक्स',
    testsBadge: 'टेस्ट',
    darkMode: 'डार्क मोड',
    lightMode: 'लाइट मोड',
    language: 'भाषा (Language)',
    hindi: 'हिंदी',
    english: 'English',

    // Exam Interface
    pauseTest: 'रोकें (Pause)',
    resumeTest: 'जारी रखें (Resume)',
    testPausedTitle: 'परीक्षा रुकी हुई है (Test Paused ⏸️)',
    testPausedDesc: 'टाइमर को रोक दिया गया है। परीक्षा की सत्यनिष्ठा बनाए रखने के लिए प्रश्न अस्थायी रूप से छिपा दिए गए हैं। पुनः शुरू करने के लिए नीचे दिए गए बटन पर क्लिक करें।',
    timeElapsed: 'बीता हुआ समय (Time Elapsed)',
    timeRemaining: 'शेष समय (Time Remaining)',
    sectionTitle: 'खंड: सामान्य अध्ययन व विषय',
    marksLabel: 'अंक',
    negativeLabel: 'ऋणात्मक',
    question: 'प्रश्न',
    of: 'का',
    underReview: 'समीक्षाधीन',
    selectOption: 'विकल्प चुनें (Select one option):',
    previous: 'पिछला (Previous)',
    clearResponse: 'उत्तर साफ़ करें (Clear)',
    markForReviewAndNext: 'समीक्षा हेतु चिह्नित करें (Review & Next)',
    saveAndNext: 'सहेजें और आगे बढ़ें (Save & Next)',
    submitTest: 'सबमिट करें (Submit)',
    questionPalette: 'प्रश्न पैलेट (Palette)',
    chooseQuestion: 'प्रश्न चुनें (Choose Question):',
    answered: 'उत्तर दिया',
    notAnswered: 'उत्तर नहीं दिया',
    markedReview: 'समीक्षा हेतु',
    ansAndReview: 'उत्तर व समीक्षा',
    notVisited: 'विज़िट नहीं किया',
    exitWithoutSubmit: 'बिना सबमिट किए बाहर निकलें',

    // Submission modal
    confirmSubmitTitle: 'परीक्षा सबमिट करने की पुष्टि',
    confirmSubmitDesc: 'सबमिट करने के बाद आप उत्तरों में बदलाव नहीं कर पाएंगे।',
    answeredCount: 'उत्तर दिए गए',
    remainingCount: 'अनुत्तरित',
    confirmFinish: 'हाँ, सबमिट करें',
    keepAnswering: 'परीक्षा जारी रखें',

    // Practice Mode
    practiceModeBadge: 'अभ्यास मोड (Practice Mode)',
    practiceSub: 'तुरंत उत्तर जांचें और विस्तृत व्याख्या पढ़ें',
    instantExplanation: 'तुरंत व्याख्या दिखाएं',
    finishPractice: 'अभ्यास समाप्त करें',
    answeredQuestions: 'हल किए प्रश्न',
    correctAnswerLabel: 'सही उत्तर',
    yourChoiceLabel: 'आपका चयन',
    explanationTitle: 'विस्तृत व्याख्या (Explanation)',
    retryIncorrect: 'गलत प्रश्न पुनः हल करें',
    retryUnanswered: 'छूटे प्रश्न हल करें',
    restartAll: 'शुरू से अभ्यास करें',

    // Question Language Switcher
    questionLanguage: 'प्रश्नों की भाषा (Question Language)',
    viewQuestionIn: 'भाषा में देखें (View In)',
    chooseQuestionLanguage: 'प्रश्नों की भाषा चुनें',
    questionLanguagePref: 'प्रश्नों की पसंदीदा भाषा',
    viewInEnglish: 'English',
    viewInHindi: 'हिंदी'
  },
  en: {
    // Navigation
    home: 'Home',
    myBooks: 'My Books',
    allTests: 'All Tests',
    createTest: 'Create Test',
    testHistory: 'History',
    performance: 'Performance',
    questionBank: 'Question Bank',
    testCompare: 'Compare Tests',
    settings: 'Settings',

    // Header & Global
    searchPlaceholder: 'Search tests, folders or questions...',
    buildApkZip: 'Build APK / ZIP',
    booksBadge: 'Books',
    testsBadge: 'Tests',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    language: 'App Language',
    hindi: 'हिंदी',
    english: 'English',

    // Exam Interface
    pauseTest: 'Pause',
    resumeTest: 'Resume Test',
    testPausedTitle: 'Examination Paused ⏸️',
    testPausedDesc: 'The timer has been paused. Questions are temporarily hidden to maintain exam integrity. Click resume when you are ready to continue.',
    timeElapsed: 'Time Elapsed',
    timeRemaining: 'Time Remaining',
    sectionTitle: 'Section: General Knowledge & Subject',
    marksLabel: 'Marks',
    negativeLabel: 'Negative',
    question: 'Question',
    of: 'of',
    underReview: 'Under Review',
    selectOption: 'Select one option:',
    previous: 'Previous',
    clearResponse: 'Clear Response',
    markForReviewAndNext: 'Mark for Review & Next',
    saveAndNext: 'Save & Next',
    submitTest: 'Submit Test',
    questionPalette: 'Question Palette',
    chooseQuestion: 'Choose a Question:',
    answered: 'Answered',
    notAnswered: 'Not Answered',
    markedReview: 'Marked Review',
    ansAndReview: 'Ans & Review',
    notVisited: 'Not Visited',
    exitWithoutSubmit: 'Exit Without Submitting',

    // Submission modal
    confirmSubmitTitle: 'Confirm Test Submission',
    confirmSubmitDesc: 'Are you sure you want to submit? You will not be able to modify your responses after submission.',
    answeredCount: 'Answered',
    remainingCount: 'Unanswered',
    confirmFinish: 'Yes, Submit Test',
    keepAnswering: 'Keep Answering',

    // Practice Mode
    practiceModeBadge: 'Practice Mode',
    practiceSub: 'Instant answer verification and in-depth explanations',
    instantExplanation: 'Show explanation instantly',
    finishPractice: 'Finish Practice',
    answeredQuestions: 'Answered Questions',
    correctAnswerLabel: 'Correct Answer',
    yourChoiceLabel: 'Your Choice',
    explanationTitle: 'Detailed Explanation',
    retryIncorrect: 'Retry Incorrect Questions',
    retryUnanswered: 'Retry Unanswered Questions',
    restartAll: 'Practice All Again',

    // Question Language Switcher
    questionLanguage: 'Question Language',
    viewQuestionIn: 'View in',
    chooseQuestionLanguage: 'Choose Question Language',
    questionLanguagePref: 'Question Language Preference',
    viewInEnglish: 'English',
    viewInHindi: 'हिंदी'
  }
};

export const getTranslation = (lang: Language) => translations[lang] || translations.en;
