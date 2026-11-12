import { Question } from '../types';
import { normalizeHindiText } from './hindiNormalizer';

export interface ParseResult {
  questions: Question[];
  errors: { line: number; message: string; rawSnippet?: string }[];
  totalParsed: number;
  rawText: string;
}

export function parseQuestionsFromTxt(rawText: string, defaultSubject = 'General'): ParseResult {
  const lines = rawText.split(/\r?\n/);
  const questions: Question[] = [];
  const errors: { line: number; message: string; rawSnippet?: string }[] = [];

  let currentQuestionNumber = 0;
  let currentQuestionText = '';
  let currentOptions: string[] = [];
  let currentCorrectIndex = -1;
  let currentExplanation = '';
  let currentFigureType: any = undefined;
  let currentFigureData: any = undefined;
  let currentImageUrl: string | undefined = undefined;
  let currentOptionImages: (string | null)[] = [null, null, null, null];
  let questionStartLine = 1;
  let state: 'IDLE' | 'READING_QUESTION' | 'READING_OPTIONS' | 'READING_EXPLANATION' = 'IDLE';

  // Helper regex patterns
  // Matches: Q26., Q.26, Q 26, Question 26, Que 26, प्रश्न 26, प्र. 26, 26., 26), (26)
  const questionHeaderRegex = /^(?:(?:प्रश्न|प्र\.|प्र|question|que\.|que|q\.|q)\s*)?(\d+)[\.\:\)\-\s]+(.*)/i;
  // Explicit tag indicating a question line: Q26., Q.26, Q 26, प्रश्न 26, etc.
  const isExplicitQuestionTag = /^(?:(?:प्रश्न|प्र\.|प्र|question|que\.|que|q\.|q)\s*\d+[\.\:\)\-\s]|(?:प्रश्न|question|que)\b)/i;
  // Pure number dot: 1., 26., 1), 26)
  const isPureNumberDot = /^\(?\d+[\.\)]\s+/;

  // Single option match: A), (A), A., [A], A -, a), (a)
  const optionHeaderRegex = /^(?:\(?\s*([A-Da-d1-4])\s*[\)\.\-\]]|\b([A-Da-d])\s*[\)\.\-\]])\s*(.*)/;
  // Answer line: Ans: B, Answer: B, उत्तर: B, Ans - (B)
  const explicitAnswerRegex = /^(?:ans|answer|उत्तर|सही उत्तर)[\s\:\-\=]+(?:\(?\s*([A-Da-d1-4])\s*\)?|\✅|\✔)/i;
  // Explanation line: Ex:, Exp:, Explanation:, व्याख्या:, हल:, Note:
  const explanationRegex = /^(?:ex|exp|explanation|व्याख्या|हल|note)[\s\:\-\=]+(.*)/i;

  const commitCurrentQuestion = () => {
    if (state === 'IDLE' && !currentQuestionText) return;

    const trimmedText = normalizeHindiText(currentQuestionText.trim());
    if (!trimmedText) return;

    // Validate options
    if (currentOptions.length < 2) {
      errors.push({
        line: questionStartLine,
        message: `प्रश्न #${currentQuestionNumber || questions.length + 1} में कम से कम 2 विकल्प होने चाहिए। (Found ${currentOptions.length})`,
        rawSnippet: trimmedText.slice(0, 80)
      });
      return;
    }

    if (currentCorrectIndex < 0 || currentCorrectIndex >= currentOptions.length) {
      errors.push({
        line: questionStartLine,
        message: `प्रश्न #${currentQuestionNumber || questions.length + 1} में कोई सही उत्तर (✅ या Ans:) नहीं मिला।`,
        rawSnippet: trimmedText.slice(0, 80)
      });
      // Fallback: default to first option
      currentCorrectIndex = 0;
    }

    // Auto-detect table structure if question text contains box/row/column patterns (e.g. बारंबारता बंटन)
    let finalFigureType = currentFigureType;
    let finalFigureData = currentFigureData;

    if (!finalFigureType && (trimmedText.includes('बारंबारता') || trimmedText.includes('बंटन') || trimmedText.includes('सारणी') || trimmedText.includes('तालिका'))) {
      const textLines = trimmedText.split('\n');
      const tableLines = textLines.filter(l => l.includes('|') || /\b\d+\s+\d+\b/.test(l.trim()));
      if (tableLines.length >= 2) {
        const rows: string[][] = [];
        let headers: string[] = ['मान (x)', 'बारंबारता (f)'];
        for (const tl of tableLines) {
          if (tl.includes('मान') && tl.includes('बारंबारता')) {
            headers = tl.split(/[|\t,]/).map(s => s.trim()).filter(Boolean);
          } else {
            const parts = tl.includes('|')
              ? tl.split('|').map(s => s.trim()).filter(Boolean)
              : tl.trim().split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
              rows.push(parts);
            }
          }
        }
        if (rows.length >= 2) {
          finalFigureType = 'table';
          finalFigureData = {
            title: 'बारंबारता बंटन (Frequency Distribution)',
            headers,
            rows
          };
        }
      }
    }

    questions.push({
      id: `q_${Date.now()}_${questions.length + 1}_${Math.random().toString(36).substring(2, 7)}`,
      number: currentQuestionNumber || questions.length + 1,
      text: trimmedText,
      options: currentOptions.map(opt => normalizeHindiText(opt)),
      correctAnswerIndex: currentCorrectIndex,
      explanation: normalizeHindiText(currentExplanation.trim()),
      subject: defaultSubject,
      figureType: finalFigureType,
      figureData: finalFigureData,
      imageUrl: currentImageUrl,
      optionImages: currentOptionImages.some(Boolean) ? [...currentOptionImages] : undefined
    });

    currentFigureType = undefined;
    currentFigureData = undefined;
    currentImageUrl = undefined;
    currentOptionImages = [null, null, null, null];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    if (!trimmedLine) {
      // Empty line could be separator or line break inside explanation/question
      if (state === 'READING_EXPLANATION' && currentExplanation) {
        currentExplanation += '\n';
      }
      continue;
    }

    // Check if line matches a new Question Header
    const isExplicit = isExplicitQuestionTag.test(trimmedLine);
    const isNumDot = isPureNumberDot.test(trimmedLine);

    if (isExplicit || (isNumDot && state !== 'READING_QUESTION')) {
      // Save previous question if exists
      commitCurrentQuestion();

      // Reset for new question
      const qMatch = trimmedLine.match(questionHeaderRegex);
      const num = qMatch ? parseInt(qMatch[1], 10) : questions.length + 1;
      const text = qMatch ? qMatch[2] : trimmedLine;
      currentQuestionNumber = num;
      currentQuestionText = text;
      currentOptions = [];
      currentCorrectIndex = -1;
      currentExplanation = '';
      currentFigureType = undefined;
      currentFigureData = undefined;
      currentImageUrl = undefined;
      currentOptionImages = [null, null, null, null];
      questionStartLine = i + 1;
      state = 'READING_QUESTION';
      continue;
    }

    // Check if line is an Image Tag: [img: https://...] or [image: ...] or Image: ...
    const imgTagMatch = trimmedLine.match(/^\[(?:img|image|चित्र|photo)[\s\:\=]+(.*?)\]$/i) ||
                        trimmedLine.match(/^(?:image|चित्र|फोटो)[\s\:\=]+(.*)$/i);
    if (imgTagMatch && state !== 'IDLE') {
      currentImageUrl = imgTagMatch[1].trim();
      continue;
    }

    // Check if line is a Figure Tag: [figure: counting_triangles layers=3 horizontallines=1]
    const figureTagMatch = trimmedLine.match(/^\[(?:figure|आकृति|चित्र)[\s\:\=]+(.*?)\]$/i);
    if (figureTagMatch && state !== 'IDLE') {
      const figContent = figureTagMatch[1].trim();
      const firstSpace = figContent.indexOf(' ');
      const fType = firstSpace > 0 ? figContent.slice(0, firstSpace).trim() : figContent;
      const fParams = firstSpace > 0 ? figContent.slice(firstSpace).trim() : '';

      currentFigureType = fType;
      if (fParams.startsWith('{') && fParams.endsWith('}')) {
        try {
          currentFigureData = JSON.parse(fParams);
        } catch {
          currentFigureData = {};
        }
      } else if (fParams) {
        const dataObj: Record<string, any> = {};
        const kvMatches = fParams.matchAll(/([a-zA-Z0-9_]+)=(".*?"|'.*?'|[^\s]+)/g);
        for (const m of kvMatches) {
          const k = m[1];
          let v: any = m[2];
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          } else if (!isNaN(Number(v))) {
            v = Number(v);
          }
          dataObj[k] = v;
        }
        currentFigureData = dataObj;
      }
      continue;
    }

    // Check if line is Explanation
    const expMatch = trimmedLine.match(explanationRegex);
    if (expMatch && state !== 'IDLE') {
      state = 'READING_EXPLANATION';
      currentExplanation = expMatch[1] || '';
      continue;
    }

    // Check if line is explicit Answer (e.g. "Ans: B" or "उत्तर: C")
    const ansMatch = trimmedLine.match(explicitAnswerRegex);
    if (ansMatch && state !== 'IDLE') {
      const letter = (ansMatch[1] || '').toUpperCase();
      if (letter === 'A' || letter === '1') currentCorrectIndex = 0;
      else if (letter === 'B' || letter === '2') currentCorrectIndex = 1;
      else if (letter === 'C' || letter === '3') currentCorrectIndex = 2;
      else if (letter === 'D' || letter === '4') currentCorrectIndex = 3;
      continue;
    }

    // Check if line contains MULTIPLE inline options (e.g. "A) 10 B) 20 C) 30 ✅ D) 40")
    const inlineOptionsRegex = /(?:^|\s+)(?:\(?\s*([A-Da-d])\s*[\)\.\-\]]|\b([A-Da-d])\s*[\)\.\-\]])\s*([^\n\r]*?)(?=(?:\s+(?:\(?\s*[A-Da-d]\s*[\)\.\-\]]|\b[A-Da-d]\s*[\)\.\-\]])|$))/g;
    const inlineMatches = Array.from(trimmedLine.matchAll(inlineOptionsRegex));

    if (inlineMatches.length >= 2 && state !== 'IDLE') {
      state = 'READING_OPTIONS';
      inlineMatches.forEach((m) => {
        let optContent = (m[3] || '').trim();
        const hasTick = /[✅✔]|\*|\[ans\]|\(ans\)|\(correct\)/i.test(optContent);
        if (hasTick) {
          optContent = optContent.replace(/[✅✔]|\*|\[ans\]|\(ans\)|\(correct\)/gi, '').trim();
        }
        const optIdx = currentOptions.length;
        currentOptions.push(optContent);
        if (hasTick) currentCorrectIndex = optIdx;
      });
      continue;
    }

    // Check if line is a Single Option: A), B), C), D)
    const optMatch = trimmedLine.match(optionHeaderRegex);
    if (optMatch && state !== 'IDLE') {
      state = 'READING_OPTIONS';
      const optionChar = (optMatch[1] || optMatch[2] || '').toUpperCase();
      let optionContent = optMatch[3] ? optMatch[3].trim() : '';

      // Check if option contains tick mark or [ans] or (correct)
      const hasTick = /[✅✔]|\*|\[ans\]|\(ans\)|\(correct\)/i.test(optionContent);
      if (hasTick) {
        // Remove the tick symbol from option text
        optionContent = optionContent.replace(/[✅✔]|\*|\[ans\]|\(ans\)|\(correct\)/gi, '').trim();
      }

      const optIdx = currentOptions.length;

      // Check if option contains option image tag: [img: ...]
      const optImgMatch = optionContent.match(/\[(?:img|image|चित्र)[\s\:\=]+(.*?)\]/i);
      if (optImgMatch) {
        currentOptionImages[optIdx] = optImgMatch[1].trim();
        optionContent = optionContent.replace(/\[(?:img|image|चित्र)[\s\:\=]+(.*?)\]/i, '').trim();
      }

      currentOptions.push(optionContent);

      if (hasTick) {
        currentCorrectIndex = optIdx;
      } else if (currentCorrectIndex === -1) {
        // If option indicator is letter and we check if matches
        if (optionChar === 'A' && optIdx === 0 && hasTick) currentCorrectIndex = 0;
        if (optionChar === 'B' && optIdx === 1 && hasTick) currentCorrectIndex = 1;
        if (optionChar === 'C' && optIdx === 2 && hasTick) currentCorrectIndex = 2;
        if (optionChar === 'D' && optIdx === 3 && hasTick) currentCorrectIndex = 3;
      }
      continue;
    }

    // If we are reading explanation, append
    if (state === 'READING_EXPLANATION') {
      currentExplanation += ' ' + trimmedLine;
      continue;
    }

    // If we are reading question text, multiline question
    if (state === 'READING_QUESTION') {
      currentQuestionText += ' ' + trimmedLine;
      continue;
    }

    // If we are reading options and this is a multiline option
    if (state === 'READING_OPTIONS' && currentOptions.length > 0) {
      const lastIdx = currentOptions.length - 1;
      currentOptions[lastIdx] += ' ' + trimmedLine;
      continue;
    }
  }

  // Commit last question
  commitCurrentQuestion();

  return {
    questions,
    errors,
    totalParsed: questions.length,
    rawText
  };
}

export const SAMPLE_TEST_TXT_TIME_AND_WORK = `Q26. अंकित, बृजेश और चारू को ₹2209 में एक कार्य करने के लिए नियुक्त किया गया है। अंकित और बृजेश मिलकर कार्य का ³¹⁄₄₇ भाग पूरा करते हैं तथा बृजेश और चारू मिलकर कार्य का ²¹⁄₄₇ भाग पूरा करते हैं। अंकित को कितनी धनराशि का भुगतान किया जाना चाहिए?
A) ₹1692
B) ₹282
C) ₹1222 ✅
D) ₹1316
Ex: अंकित का कार्य भाग = 1 − ²¹⁄₄₇ = ²⁶⁄₄₇। भुगतान = 2209 × ²⁶⁄₄₇ = ₹1222।

Q27. दो पाइप X और Y क्रमशः 5⅓ घंटे और 24 घंटे में एक टंकी को पानी से भर सकते हैं और एक तीसरा पाइप Z इसे 8 घंटे में खाली कर सकता है। यदि पाइप X और Y को क्रमशः 11:30 a.m. पर और 12:30 p.m. पर खोला जाए, जबकि पाइप Z को 1:30 p.m. पर खोला जाए, तो टंकी किस समय भर जाएगी?
A) 6:56 p.m.
B) 7:06 p.m. ✅
C) 6:36 p.m.
D) 6:46 p.m.
Ex: X की दर = ³⁄₁₆, Y की दर = ¹⁄₂₄ तथा Z की दर = −⅛। प्रारंभिक कार्य के बाद शेष भाग को तीनों पाइपों की संयुक्त दर से पूरा करने में 5 घंटे 36 मिनट लगेंगे। अतः समय 7:06 p.m. होगा।

Q28. पाइप A और B एक टंकी को 12 घंटे में भर सकते हैं, पाइप B और C उसी टंकी को 14 घंटे में भर सकते हैं तथा पाइप C और A उसी टंकी को 15 घंटे में भर सकते हैं। तीनों को एक साथ 6 घंटे के लिए खोल दिया जाता है, उसके बाद पाइप B और C को बंद कर दिया जाता है तथा पाइप A अकेला खुला रहता है। पाइप A द्वारा टंकी के शेष भाग को भरने में लिया गया समय ज्ञात कीजिए।
A) 9 ⁵⁄₁₃ घंटे
B) 6 ³⁄₅ घंटे
C) 7 ⁴⁄₉ घंटे
D) 8 ⁶⁄₁₁ घंटे ✅
Ex: A की कार्यक्षमता = ¹¹⁄₂₈₀। तीनों द्वारा 6 घंटे में किया गया कार्य = 93⁄140। शेष कार्य = 47⁄140। अतः A द्वारा लिया गया समय = 94⁄11 = 8 ⁶⁄₁₁ घंटे।

Q29. दो इनलेट पाइप A और B एक कुंड को क्रमशः 20 घंटे और 15 घंटे में भर सकते हैं। आउटलेट के रूप में कार्य करने वाला एक तीसरा पाइप C, पूर्ण रूप से भरे कुंड को 30 घंटे में खाली कर सकता है। तीनों पाइपों को खाली कुंड में एक साथ खोल दिया जाता है। 4 घंटे बाद, पाइप B बंद कर दिया जाता है। उसके 2 घंटे बाद, पाइप A को भी बंद कर दिया जाता है, जबकि पाइप C कुंड खाली होने तक अकेले ही चालू रहता है। वह अवधि ज्ञात कीजिए जब तक पाइप C अकेले चालू रहता है।
A) 10 घंटे
B) 11 घंटे ✅
C) 13 घंटे
D) 12 घंटे
Ex: PDF में विकल्प B) 11 घंटे चिह्नित है। लेकिन दिए गए आंकड़ों से गणना करने पर 19 घंटे प्राप्त होते हैं। प्रश्न या विकल्पों में स्रोतगत त्रुटि है।

Q30. तीन नल X, Y तथा Z, एक टंकी को क्रमशः 15 मिनट, 12 मिनट और 20 मिनट में भर सकते हैं। यदि Y को सदैव खुला रखा जाता है जबकि X और Z को, X से शुरू करते हुए एकांतर रूप से एक-एक घंटे के लिए खोला जाता है, तो टंकी भरने में लगने वाला समय ज्ञात कीजिए।
A) 7 घंटे ✅
B) 8 घंटे
C) 6 घंटे
D) 5 घंटे
Ex: PDF में विकल्प A) 7 घंटे चिह्नित है। प्रश्न में मिनट और एक-एक घंटे के अंतराल दिए गए हैं, जिनसे चिह्नित उत्तर का गणितीय मिलान नहीं होता।

Q31. एक स्मार्ट जल टंकी प्रणाली में दो स्वचालित पाइप हैं। पाइप U1 टंकी को 5 घंटे में भर सकती है और पाइप V1 टंकी को 10 घंटे में खाली कर सकती है। पाइप U1 को अकेले 2 घंटे तक प्रचालित किया जाता है, उसके बाद V1 को भी सक्रिय कर दिया जाता है। कुल 5 घंटे के बाद टंकी का कितना भाग भर जाएगा?
A) ⁷⁄₁₀ ✅
B) ³⁄₅
C) ²⁄₅
D) ¹⁄₂
Ex: पहले 2 घंटे में भरा भाग = 2⁄5। अगले 3 घंटे में संयुक्त दर = 1⁄10। कुल भरा भाग = 2⁄5 + 3⁄10 = 7⁄10।

Q32. A और B किसी कार्य को क्रमशः 12 दिन और 18 दिन में पूरा कर सकते हैं। वे 4 दिन तक एकसाथ कार्य करते हैं, जिसके बाद A कार्य छोड़ देता है। B अकेले 6 दिन तक कार्य जारी रखता है और फिर C, B के साथ शामिल हो जाता है। यदि C अकेले संपूर्ण कार्य को 9 दिन में पूरा कर सकता है, तो कार्य को पूरा करने में लगा कुल समय (दिन में) ज्ञात कीजिए।
A) 10 ⁵⁄₃ दिन
B) 11 ²⁄₃ दिन
C) 9 ²⁄₃ दिन
D) 10 ²⁄₃ दिन ✅
Ex: पहले 4 दिन में A और B का कार्य = 5⁄9। अगले 6 दिन में B का कार्य = 1⁄3। शेष कार्य = 1⁄9। B और C मिलकर इसे 2⁄3 दिन में पूरा करेंगे। कुल समय = 10 ²⁄₃ दिन।

Q33. राम किसी कार्य को x दिन में पूरा कर सकता है। मोहन, राम से दोगुना तेजी से कार्य करता है। राघव की दक्षता मोहन से 50% अधिक है। यदि राम, मोहन और राघव एकसाथ उस कार्य को 4 दिनों में पूरा करते हैं, तो x का मान ज्ञात कीजिए।
A) 26
B) 28
C) 22
D) 24 ✅
Ex: राम, मोहन और राघव की दक्षता का अनुपात 1 : 2 : 3 है। कुल दक्षता = 6 इकाई। 4 दिनों में कार्य = 24 इकाई। अतः x = 24 दिन।

Q34. A, B और C किसी प्रोजेक्ट को अकेले क्रमशः 12 दिन, 18 दिन, 24 दिन में पूरा कर सकते हैं। यदि वे सभी मिलकर 4 दिनों तक काम करते हैं, तो प्रोजेक्ट का कितना भाग अधूरा रह जाएगा?
A) ¹³⁄₁₈
B) ¹⁄₁₈
C) ¹¹⁄₁₈
D) ⁵⁄₁₈ ✅
Ex: संयुक्त कार्यक्षमता = 1⁄12 + 1⁄18 + 1⁄24 = 13⁄72। 4 दिनों में कार्य = 13⁄18। शेष कार्य = 1 − 13⁄18 = 5⁄18।

Q35. पाइप M किसी टैंक को 6 घंटे में भर सकता है और पाइप N उसी टैंक को 12 घंटे में भर सकता है। यदि दोनों पाइपों को एक साथ खोल दिया जाए, तो 3.5 घंटे में टैंक का कितना भाग भर जाएगा?
A) ⅙
B) ⅛
C) ¾
D) ⅞ ✅
Ex: संयुक्त दर = 1⁄6 + 1⁄12 = 1⁄4। 3.5 घंटे में भरा भाग = 7⁄2 × 1⁄4 = 7⁄8।

Q36. एक टंकी में दो प्रवेश पाइप, A और B, तथा एक निकास पाइप, C लगे हुए हैं। पाइप A अकेले, टंकी को 12 घंटे में पूर्णतः भर सकता है, जबकि पाइप B अकेले, टंकी को 18 घंटे में पूर्णतः भर सकता है। इसके विपरीत, पाइप C पूर्णतः भरी हुई टंकी को 36 घंटे में खाली कर सकता है। प्रारंभ में, तीनों पाइप एकसाथ खोले जाते हैं और उन्हें एकसाथ प्रचालित होने दिया जाता है। 4 घंटे तक प्रचालन के पश्चात, निकास पाइप C को बंद कर दिया जाता है, जबकि प्रवेश पाइप A और B कार्य करना जारी रखते हैं। टंकी को पूर्णतः भरने में लगने वाला अतिरिक्त समय (घंटे में) ज्ञात कीजिए।
A) 4 ✅
B) 5
C) 6
D) 3
Ex: तीनों की संयुक्त दर = 1⁄12 + 1⁄18 − 1⁄36 = 1⁄9। 4 घंटे में 4⁄9 टंकी भरेगी। शेष 5⁄9 भाग को A और B मिलकर 4 घंटे में भरेंगे।

Q37. समान दक्षता वाले दो व्यक्ति एक साथ काम करते हुए किसी कार्य को 6 घंटे में पूरा कर सकते हैं। उसी कार्य को पूरा करने में एक व्यक्ति को अकेले कितना समय लगेगा?
A) 6 घंटे
B) 9 घंटे
C) 3 घंटे
D) 12 घंटे ✅
Ex: दो व्यक्तियों का संयुक्त समय 6 घंटे है। एक व्यक्ति का समय = 6 × 2 = 12 घंटे।

Q38. पाइप P किसी टैंक को 10 घंटे में भर सकता है और पाइप Q उसे 20 घंटे में भर सकता है। यदि दोनों पाइपों को एक साथ 5 घंटे के लिए खोल दिया जाए, तो टैंक का कितना भाग अभी भी खाली रहेगा?
A) ⅕
B) ½
C) ⅓
D) ¼ ✅
Ex: संयुक्त दर = 1⁄10 + 1⁄20 = 3⁄20। 5 घंटे में भरा भाग = 3⁄4। खाली भाग = 1⁄4।

Q39. A किसी कार्य को 12 दिन में पूरा कर सकता है तथा B उसी कार्य को 18 दिन में पूरा कर सकता है। वे दोनों एकसाथ कार्य करना आरंभ करते हैं। 4 दिन पश्चात, A कार्य करना छोड़ देता है। शेष कार्य को B कितने अतिरिक्त दिनों में पूरा करेगा?
A) 6
B) 4
C) 8 ✅
D) 9
Ex: संयुक्त दर = 1⁄12 + 1⁄18 = 5⁄36। 4 दिनों में कार्य = 5⁄9। शेष कार्य = 4⁄9। B द्वारा लिया गया समय = 4⁄9 × 18 = 8 दिन।

Q40. एक टंकी में दो प्रवेश पाइप- C और D, तथा एक निकास पाइप E है। C टंकी को 10 घंटे में भरती है, D टंकी को 15 घंटे में भरती है, और E टंकी को 30 घंटे में खाली करती है। यदि सभी पाइपों को एक साथ खोल दिया जाए, तो टंकी को पूर्ण रूप से भरने में कितना समय लगेगा?
A) 7.5 घंटे ✅
B) 9.5 घंटे
C) 8.5 घंटे
D) 5.5 घंटे
Ex: संयुक्त दर = 1⁄10 + 1⁄15 − 1⁄30 = 2⁄15। समय = 15⁄2 = 7.5 घंटे।

Q41. एक समान दक्षता वाले 6 मजदूर का समूह किसी कार्य को 9 दिनों में पूरा कर सकता है। यदि उनमें से केवल 3 मजदूर मिलकर काम करें तो समान कार्य को पूरा करने में कितने दिन लगेंगे?
A) 27 दिन
B) 15 दिन
C) 12 दिन
D) 18 दिन ✅
Ex: मजदूरों की संख्या आधी होने पर समय दोगुना होगा। अतः 9 × 2 = 18 दिन।

Q42. पाइप C एक टैंक को 10 घंटे में भर सकता है और पाइप D उसे 15 घंटे में भर सकता है। यदि दोनों पाइप एक साथ खोल दिए जाएं, तो टैंक को भरने में उन्हें कितना समय (घंटों में) लगेगा?
A) 8
B) 6 ✅
C) 5
D) 10
Ex: संयुक्त दर = 1⁄10 + 1⁄15 = 1⁄6। अतः टंकी 6 घंटे में भरेगी।

Q43. पाइप A, किसी टंकी को 24 घंटे में भर सकता है तथा पाइप B उसी टंकी को 36 घंटे में भर सकता है। यदि दोनों पाइप एक साथ खोल दिए जाते हैं, तो टंकी को भरने में कितना समय लगेगा?
A) 14 घंटे
B) 16.4 घंटे
C) 16 घंटे
D) 14.4 घंटे ✅
Ex: संयुक्त दर = 1⁄24 + 1⁄36 = 5⁄72। समय = 72⁄5 = 14.4 घंटे।

Q44. तीन दोस्त - अर्जुन, कबीर, और नेहा एक बाड़ को क्रमशः 12 घंटे, 6 घंटे, और 4 घंटे में पेंट कर सकते हैं। यदि वे साथ मिलकर काम करें, तो उन्हें बाड़ पेंट करने में कितना समय लगेगा?
A) 4 घंटे
B) 3 घंटे
C) 1 घंटा
D) 2 घंटे ✅
Ex: संयुक्त दर = 1⁄12 + 1⁄6 + 1⁄4 = 1⁄2। अतः समय = 2 घंटे।

Q45. दो पाइप, पाइप A और पाइप B, एक टैंक को क्रमशः 8 घंटे और 12 घंटे में भर सकते हैं। यदि दोनों पाइपों को एक साथ खोल दिया जाए, तो टैंक कितने घंटे में भर जाएगा?
A) 5.5 घंटे
B) 6.4 घंटे
C) 4.8 घंटे ✅
D) 10.6 घंटे
Ex: संयुक्त दर = 1⁄8 + 1⁄12 = 5⁄24। समय = 24⁄5 = 4.8 घंटे।`;

export const SAMPLE_TEST_TXT_BIHAR_DAROGA = `प्रश्न 1. भारत की राजधानी क्या है?
A) मुंबई
B) नई दिल्ली ✅
C) कोलकाता
D) चेन्नई
Ex: नई दिल्ली 1911 में भारत की राजधानी घोषित हुई तथा 1931 में इसका उद्घाटन हुआ।

प्रश्न 2. भारतीय संविधान की प्रस्तावना में "धर्मनिरपेक्ष" और "समाजवादी" शब्द किस संशोधन द्वारा जोड़े गए?
A) 42वां संविधान संशोधन (1976) ✅
B) 44वां संविधान संशोधन (1978)
C) 73वां संविधान संशोधन (1992)
D) 86वां संविधान संशोधन (2002)
Ex: 42वें संविधान संशोधन 1976 द्वारा प्रस्तावना में समाजवादी, धर्मनिरपेक्ष और अखंडता शब्द जोड़े गए। इसे 'लघु संविधान' भी कहा जाता है।

प्रश्न 3. बिहार में 1857 के विद्रोह का नेतृत्व किसने किया था?
A) अमर सिंह
B) बाबू कुंवर सिंह ✅
C) नाना साहेब
D) पीर अली
Ex: जगदीशपुर (आरा) के 80 वर्षीय जमींदार बाबू कुंवर सिंह ने 1857 के स्वतंत्रता संग्राम में बिहार का अद्वितीय नेतृत्व किया।

प्रश्न 4. रक्त का थक्का (Blood Clotting) जमने में कौन-सा विटामिन सहायक होता है?
A) विटामिन A
B) विटामिन C
C) विटामिन K ✅
D) विटामिन D
Ex: विटामिन K (Phylloquinone) प्रोथ्रोम्बिन के निर्माण में मदद करता है जो रक्त का थक्का जमाने के लिए आवश्यक है।

प्रश्न 5. यदि किसी समकोण त्रिभुज का आधार 6 सेमी तथा लम्ब 8 सेमी है, तो उसका कर्ण (Hypotenuse) क्या होगा?
A) 14 सेमी
B) 10 सेमी ✅
C) 12 सेमी
D) 9 सेमी
Ex: पाइथागोरस प्रमेय: c = √(a² + b²) = √(6² + 8²) = √(36 + 64) = √100 = 10 सेमी।`;

export const SAMPLE_TEST_TXT_RAILWAY = `प्रश्न 1. कार्य (Work) का SI मात्रक क्या है?
A) न्यूटन
B) वाट
C) जूल ✅
D) पास्कल
Ex: कार्य बराबर बल × विस्थापन होता है। कार्य और ऊर्जा दोनों का SI मात्रक जूल (Joule) है।

प्रश्न 2. प्रकाश वर्ष (Light Year) किसकी इकाई है?
A) समय की
B) खगोलीय दूरी की ✅
C) प्रकाश की तीव्रता की
D) चाल की
Ex: 1 प्रकाश वर्ष = 9.46 × 10¹⁵ मीटर। यह निर्वात में प्रकाश द्वारा एक वर्ष में तय की गई दूरी है।

प्रश्न 3. मानव शरीर की सबसे बड़ी ग्रंथि (Gland) कौन-सी है?
A) अग्न्याशय (Pancreas)
B) यकृत (Liver) ✅
C) थायरॉयड
D) पिट्यूटरी ग्रंथि
Ex: यकृत (Liver) मानव शरीर की सबसे बड़ी ग्रंथि है, जिसका वजन लगभग 1.5 से 2 किलोग्राम होता है।

प्रश्न 4. न्यूटन के किस नियम को 'जड़त्व का नियम' (Law of Inertia) भी कहा जाता है?
A) प्रथम नियम ✅
B) द्वितीय नियम
C) तृतीय नियम
D) गुरुत्वाकर्षण नियम
Ex: न्यूटन का गति का पहला नियम बताता है कि कोई वस्तु तब तक अपनी विराम या गति अवस्था में रहती है जब तक उस पर बाह्य बल न लगाया जाए।

प्रश्न 5. धोने के सोडे (Washing Soda) का रासायनिक सूत्र क्या है?
A) NaHCO₃
B) Na₂CO₃·10H₂O ✅
C) Ca(OH)₂
D) CuSO₄·5H₂O
Ex: सोडियम कार्बोनेट डेकाहाइड्रेट (Na₂CO₃·10H₂O) को वाशिंग सोडा कहा जाता है।`;

export const SAMPLE_TEST_TXT_SSC_CGL = `Question 1. Who was the founder of the Maurya Empire?
A) Ashoka
B) Chandragupta Maurya ✅
C) Bindusara
D) Harsha
Ex: Chandragupta Maurya founded the Maurya Empire in 322 BCE with the strategic guidance of Chanakya (Kautilya).

Question 2. Which Article of the Indian Constitution guarantees the 'Right to Equality'?
A) Article 14-18 ✅
B) Article 19-22
C) Article 25-28
D) Article 32
Ex: Articles 14 to 18 of Part III of the Constitution guarantee Right to Equality before law and equal protection of laws.

Question 3. What is the currency of Japan?
A) Yuan
B) Won
C) Yen ✅
D) Ringgit
Ex: The Yen (¥) is the official currency of Japan, introduced under the Meiji government in 1871.

Question 4. Which is the highest mountain peak in India?
A) Mount Everest
B) K2 (Godwin-Austen)
C) Kangchenjunga ✅
D) Nanda Devi
Ex: Kangchenjunga (8,586 m) situated on the Sikkim-Nepal border is the highest peak in undisputed Indian territory.

Question 5. The speed of sound is maximum in which medium?
A) Air
B) Vacuum
C) Water
D) Steel (Solids) ✅
Ex: Sound travels fastest in solids (around 5960 m/s in steel) because particles are closely packed, and cannot travel in vacuum.`;

export const SAMPLE_TEST_TXT_NON_VERBAL_REASONING = `प्रश्न 1. दी गई आकृति में कुल कितने त्रिभुज (Triangles) हैं?
[figure: counting_triangles layers=3 horizontalLines=1]
A) 12
B) 16
C) 18
D) 24 ✅
Ex: शीर्ष से 4 आधार विभाजन (1+2+3+4 = 10) बनते हैं। 1 क्षैतिज रेखा होने से कुल 2 स्तर हैं। 10 × 2 = 20 + 4 अतिरिक्त त्रिभुज = 24 कुल त्रिभुज।

प्रश्न 2. दी गई आकृति में जब दर्पण को दाईं ओर MN रेखा पर रखा जाए, तो सही दर्पण प्रतिबिम्ब (Mirror Image) क्या होगा?
[figure: mirror_image text="REASONING" mirrorLine="MN"]
A) GNINOSAER
B) ƎЯAƧOИIИᎮ
C) ᎮИIИOƧAƎЯ ✅
D) REASONING
Ex: दर्पण प्रतिबिम्ब में बायाँ भाग दायाँ और दायाँ भाग बायाँ हो जाता है। अंतिम अक्षर 'G' सबसे पहले उल्टे रूप में दिखाई देगा।

प्रश्न 3. एक पासे (Dice) की दी गई स्थिति में फलक 3 के विपरीत फलक (Opposite Face) पर कौन सा अंक होगा?
[figure: dice top=5 front=3 right=1 oppositePair="3-4"]
A) 2
B) 4 ✅
C) 6
D) 1
Ex: मानक पासे या आसन्न फलकों (5, 3, 1) के विश्लेषण से फलक 3 का विपरीत फलक 4 प्राप्त होता है।

प्रश्न 4. निम्नलिखित में से कौन सा वेन आरेख (Venn Diagram) 'महिलाएं', 'डॉक्टर' और 'माताएं' के बीच सर्वोत्तम संबंध दर्शाता है?
[figure: venn c1="महिलाएं" c2="माताएं" c3="डॉक्टर" type="intersecting"]
A) सभी माताएं महिलाएं हैं तथा कुछ माताएं व महिलाएं डॉक्टर हैं ✅
B) तीनों का कोई परस्पर संबंध नहीं है
C) सभी डॉक्टर महिलाएं हैं
D) सभी महिलाएं डॉक्टर हैं
Ex: सभी माताएं अनिवार्य रूप से महिलाएं होती हैं (पूर्ण समावेशन), जबकि कुछ महिलाएं और कुछ माताएं डॉक्टर हो सकती हैं (आंशिक समावेशन)।

प्रश्न 5. शब्द 'ALPHAWAY' का सही जल प्रतिबिम्ब (Water Image) क्या होगा?
[figure: water_image text="ALPHAWAY"]
A) ∀ΓԀH∀M∀⅄ ✅
B) ALPHAWAY
C) YAWAPHLA
D) ⅄∀M∀HԀΓ∀
Ex: जल प्रतिबिम्ब में ऊपर का भाग नीचे और नीचे का भाग ऊपर उलट जाता है, जबकि बायाँ-दायाँ क्रम अपरिवर्तित रहता है।

प्रश्न 6. दी गई आकृति में कुल त्रिभुजों की संख्या ज्ञात कीजिए।
[figure: counting_triangles layers=4 horizontalLines=0]
A) 10
B) 15 ✅
C) 18
D) 20
Ex: आधार पर 5 भाग (1 + 2 + 3 + 4 + 5 = 15 त्रिभुज) बनते हैं।

प्रश्न 7. नीचे दी गई आकृति श्रृंखला (Pattern Series) में अगला क्रम क्या होगा?
[figure: pattern_series shape="arrow" rotations="0,45,90,135"]
A) तीर 180° नीचे की ओर इंगित करेगा ✅
B) तीर 0° दाईं ओर इंगित करेगा
C) तीर 90° ऊपर की ओर इंगित करेगा
D) तीर 270° बाईं ओर इंगित करेगा
Ex: आकृति प्रत्येक चरण में दक्षिणावर्त (Clockwise) 45° घूम रही है। 135° + 45° = 180° (सीधा नीचे)।

प्रश्न 8. एक पासे में शीर्ष फलक पर 6 है, सामने 2 और दाईं ओर 4 है। फलक 6 के विपरीत कौन सा अंक होगा?
[figure: dice top=6 front=2 right=4 oppositePair="6-1"]
A) 1 ✅
B) 3
C) 5
D) 2
Ex: मानक पासे में विपरीत फलकों का योग 7 होता है (6 + 1 = 7)। अतः 6 का विपरीत 1 होगा।

प्रश्न 9. एक वृत्ताकार कागज को दो बार मोड़कर एक छेद (पंच) किया गया है। खोलने पर कैसा दिखेगा?
[figure: paper_folding folds=2 punch="circle"]
A) केंद्र के चारों ओर 4 छेद दिखेंगे ✅
B) केवल 2 छेद दिखेंगे
C) केवल 1 छेद दिखेगा
D) 8 छेद दिखेंगे
Ex: 2 बार मोड़ने पर कागज 4 परतों में बंट जाता है। एक छेद करने पर खोलने पर 4 सममित छेद दिखाई देंगे।

प्रश्न 10. संख्या '8492' का दर्पण रेखा MN पर सही प्रतिबिम्ब क्या होगा?
[figure: mirror_image text="8492" mirrorLine="MN"]
A) 2948
B) S९A8 ✅
C) 8492
D) 8A९S
Ex: दर्पण प्रतिबिम्ब में अंकों का क्रम उल्टा (2 से शुरू होकर 8 पर समाप्त) और प्रत्येक अंक पार्श्विक रूप से उल्टा हो जाता है।`;

