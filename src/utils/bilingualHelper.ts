import { Question } from '../types';
import { normalizeHindiText } from './hindiNormalizer';

export interface TranslatedContent {
  text: string;
  options: string[];
  explanation: string;
}

// 1. Curated professional English translations for all 20 questions in the Time & Work exam
const TIME_AND_WORK_TRANSLATIONS: Record<number, { text: string; options: string[]; explanation: string }> = {
  26: {
    text: 'Ankit, Brijesh, and Charu were employed to do a work for ₹2209. Ankit and Brijesh together complete ³¹⁄₄₇ of the work, and Brijesh and Charu together complete ²¹⁄₄₇ of the work. What amount should be paid to Ankit?',
    options: ['₹1692', '₹282', '₹1222', '₹1316'],
    explanation: "Ankit's share of work = 1 − ²¹⁄₄₇ = ²⁶⁄₄₇. Payment to Ankit = 2209 × ²⁶⁄₄₇ = ₹1222."
  },
  27: {
    text: 'Two pipes X and Y can fill a tank with water in 5⅓ hours and 24 hours respectively, and a third pipe Z can empty it in 8 hours. If pipe X and Y are opened at 11:30 a.m. and 12:30 p.m. respectively, while pipe Z is opened at 1:30 p.m., at what time will the tank be full?',
    options: ['6:56 p.m.', '7:06 p.m.', '6:36 p.m.', '6:46 p.m.'],
    explanation: 'Rate of X = ³⁄₁₆, Y = ¹⁄₂₄, and Z = −⅛. After the initial staggered hours, the remaining capacity filled by all three pipes together takes 5 hours 36 minutes. Hence, the tank fills at 7:06 p.m.'
  },
  28: {
    text: 'Pipes A and B can fill a tank in 12 hours, pipes B and C can fill the same tank in 14 hours, and pipes C and A can fill it in 15 hours. All three are opened together for 6 hours, after which pipes B and C are closed and pipe A alone remains open. Find the time taken by pipe A to fill the remaining part of the tank.',
    options: ['9 ⁵⁄₁₃ hours', '6 ³⁄₅ hours', '7 ⁴⁄₉ hours', '8 ⁶⁄₁₁ hours'],
    explanation: "A's efficiency = ¹¹⁄₂₈₀. Work done by all three in 6 hours = 93⁄140. Remaining work = 47⁄140. Time taken by A alone = 94⁄11 = 8 ⁶⁄₁₁ hours."
  },
  29: {
    text: 'Two inlet pipes A and B can fill a cistern in 20 hours and 15 hours respectively. A third pipe C, acting as an outlet, can empty the completely filled cistern in 30 hours. All three pipes are opened together in an empty cistern. After 4 hours, pipe B is closed. After 2 more hours, pipe A is also closed, while pipe C alone continues until the cistern is empty. Find the duration for which pipe C remains active alone.',
    options: ['10 hours', '11 hours', '13 hours', '12 hours'],
    explanation: 'Calculated according to the active inflow and outflow intervals. Option B (11 hours) is the designated answer.'
  },
  30: {
    text: 'Three taps X, Y, and Z can fill a tank in 15 minutes, 12 minutes, and 20 minutes respectively. If Y is kept open continuously while X and Z are opened alternately for 1 hour each starting with X, find the time required to fill the tank.',
    options: ['7 hours', '8 hours', '6 hours', '5 hours'],
    explanation: 'Alternating cycle filling problem with Y continuous. Total duration required is 7 hours.'
  },
  31: {
    text: 'In a smart water tank system, there are two automatic pipes. Pipe U1 can fill the tank in 5 hours and pipe V1 can empty the tank in 10 hours. Pipe U1 is operated alone for 2 hours, after which V1 is also activated. After a total of 5 hours, what fraction of the tank will be filled?',
    options: ['⁷⁄₁₀', '³⁄₅', '²⁄₅', '¹⁄₂'],
    explanation: 'Part filled in the first 2 hours = 2⁄5. Next 3 hours combined rate = 1⁄10. Total filled part = 2⁄5 + 3⁄10 = 7⁄10.'
  },
  32: {
    text: 'A and B can complete a work in 12 days and 18 days respectively. They work together for 4 days, after which A leaves the work. B continues working alone for 6 days and then C joins B. If C alone can complete the entire work in 9 days, find the total time (in days) taken to complete the work.',
    options: ['10 ⁵⁄₃ days', '11 ²⁄₃ days', '9 ²⁄₃ days', '10 ²⁄₃ days'],
    explanation: 'Work done by A & B in 4 days = 5⁄9. Work done by B in next 6 days = 1⁄3. Remaining work = 1⁄9. Time taken by B & C together = 2⁄3 day. Total time = 4 + 6 + 2⁄3 = 10 ²⁄₃ days.'
  },
  33: {
    text: 'Ram can complete a work in x days. Mohan works twice as fast as Ram. Raghav is 50% more efficient than Mohan. If Ram, Mohan, and Raghav together complete the work in 4 days, find the value of x.',
    options: ['26', '28', '22', '24'],
    explanation: 'Ratio of efficiencies Ram : Mohan : Raghav = 1 : 2 : 3. Total efficiency = 6 units/day. Total work = 6 × 4 = 24 units. Therefore, x = 24 days.'
  },
  34: {
    text: 'A, B, and C can complete a project individually in 12 days, 18 days, and 24 days respectively. If all of them work together for 4 days, what fraction of the project will remain incomplete?',
    options: ['¹³⁄₁₈', '¹⁄₁₈', '¹¹⁄₁₈', '⁵⁄₁₈'],
    explanation: 'Combined efficiency = 1⁄12 + 1⁄18 + 1⁄24 = 13⁄72. Work completed in 4 days = 13⁄18. Incomplete fraction = 1 − 13⁄18 = 5⁄18.'
  },
  35: {
    text: 'Pipe M can fill a tank in 6 hours and pipe N can fill the same tank in 12 hours. If both pipes are opened together, what fraction of the tank will be filled in 3.5 hours?',
    options: ['⅙', '⅛', '¾', '⅞'],
    explanation: 'Combined rate = 1⁄6 + 1⁄12 = 1⁄4 per hour. In 3.5 hours = 3.5 × 1⁄4 = 7⁄8.'
  },
  36: {
    text: 'A tank is fitted with two inlet pipes, A and B, and one outlet pipe, C. Pipe A alone can completely fill the tank in 12 hours, while pipe B alone can completely fill the tank in 18 hours. In contrast, pipe C can empty the full tank in 36 hours. Initially, all three pipes are opened together and operated simultaneously. After 4 hours of operation, outlet pipe C is closed, while inlet pipes A and B continue working. Find the additional time (in hours) required to completely fill the tank.',
    options: ['4', '5', '6', '3'],
    explanation: 'Combined rate of all three = 1⁄12 + 1⁄18 − 1⁄36 = 1⁄9. In 4 hours, 4⁄9 of tank is filled. Remaining = 5⁄9. Combined rate of A and B = 1⁄12 + 1⁄18 = 5⁄36. Additional time = (5⁄9) / (5⁄36) = 4 hours.'
  },
  37: {
    text: 'Two persons of equal efficiency working together can complete a work in 6 hours. How much time will one person take alone to complete the same work?',
    options: ['6 hours', '9 hours', '3 hours', '12 hours'],
    explanation: 'Two persons take 6 hours. One person working alone will take 6 × 2 = 12 hours.'
  },
  38: {
    text: 'Pipe P can fill a tank in 10 hours and pipe Q can fill it in 20 hours. If both pipes are opened together for 5 hours, what fraction of the tank will still remain empty?',
    options: ['⅕', '½', '⅓', '¼'],
    explanation: 'Combined rate = 1⁄10 + 1⁄20 = 3⁄20. Part filled in 5 hours = 5 × (3⁄20) = 3⁄4. Empty fraction = 1 − 3⁄4 = 1⁄4.'
  },
  39: {
    text: 'A can complete a work in 12 days and B can complete the same work in 18 days. Both start working together. After 4 days, A leaves the work. In how many additional days will B complete the remaining work?',
    options: ['6', '4', '8', '9'],
    explanation: 'Combined rate = 1⁄12 + 1⁄18 = 5⁄36. Work done in 4 days = 4 × (5⁄36) = 5⁄9. Remaining work = 4⁄9. Additional days taken by B = (4⁄9) × 18 = 8 days.'
  },
  40: {
    text: 'A tank has two inlet pipes, C and D, and one outlet pipe E. Pipe C fills the tank in 10 hours, D fills the tank in 15 hours, and E empties the tank in 30 hours. If all pipes are opened together, how much time will it take to completely fill the tank?',
    options: ['7.5 hours', '9.5 hours', '8.5 hours', '5.5 hours'],
    explanation: 'Combined rate = 1⁄10 + 1⁄15 − 1⁄30 = (3 + 2 − 1)⁄30 = 4⁄30 = 2⁄15. Time = 15⁄2 = 7.5 hours.'
  },
  41: {
    text: 'A group of 6 workers of equal efficiency can complete a work in 9 days. If only 3 workers work together, how many days will it take to complete the same work?',
    options: ['27 days', '15 days', '12 days', '18 days'],
    explanation: 'Using M1 × D1 = M2 × D2: 6 × 9 = 3 × D2 => D2 = 54⁄3 = 18 days.'
  },
  42: {
    text: 'Pipe C can fill a tank in 10 hours and pipe D can fill it in 15 hours. If both pipes are opened together, how much time (in hours) will they take to fill the tank?',
    options: ['8', '6', '5', '10'],
    explanation: 'Combined rate = 1⁄10 + 1⁄15 = 5⁄30 = 1⁄6. Hence, time taken = 6 hours.'
  },
  43: {
    text: 'Pipe A can fill a tank in 24 hours and pipe B can fill the same tank in 36 hours. If both pipes are opened together, how much time will it take to fill the tank?',
    options: ['14 hours', '16.4 hours', '16 hours', '14.4 hours'],
    explanation: 'Combined rate = 1⁄24 + 1⁄36 = (3 + 2)⁄72 = 5⁄72. Time = 72⁄5 = 14.4 hours.'
  },
  44: {
    text: 'Three friends - Arjun, Kabir, and Neha can paint a fence in 12 hours, 6 hours, and 4 hours respectively. If they work together, how much time will they take to paint the fence?',
    options: ['4 hours', '3 hours', '1 hour', '2 hours'],
    explanation: 'Combined rate = 1⁄12 + 1⁄6 + 1⁄4 = (1 + 2 + 3)⁄12 = 6⁄12 = 1⁄2. Time = 2 hours.'
  },
  45: {
    text: 'Two pipes, Pipe A and Pipe B, can fill a tank in 8 hours and 12 hours respectively. If both pipes are opened together, in how many hours will the tank be full?',
    options: ['5.5 hours', '6.4 hours', '4.8 hours', '10.6 hours'],
    explanation: 'Combined rate = 1⁄8 + 1⁄12 = (3 + 2)⁄24 = 5⁄24. Time = 24⁄5 = 4.8 hours.'
  }
};

// Key phrases to match question content independently of question numbering
const SIGNATURE_MAP: { match: RegExp; qNumber: number }[] = [
  { match: /अंकित.*बृजेश.*चारू|₹2209/i, qNumber: 26 },
  { match: /5⅓\s*घंटे.*24\s*घंटे|11:30\s*a\.m\./i, qNumber: 27 },
  { match: /12\s*घंटे में भर सकते हैं.*14\s*घंटे.*15\s*घंटे/i, qNumber: 28 },
  { match: /दो इनलेट पाइप A और B.*20 घंटे और 15 घंटे/i, qNumber: 29 },
  { match: /तीन नल X, Y तथा Z.*15 मिनट.*12 मिनट/i, qNumber: 30 },
  { match: /स्मार्ट जल टंकी प्रणाली|U1.*V1/i, qNumber: 31 },
  { match: /12 दिन और 18 दिन.*A कार्य छोड़ देता है.*B अकेले 6 दिन/i, qNumber: 32 },
  { match: /राम किसी कार्य को x दिन.*राघव की दक्षता/i, qNumber: 33 },
  { match: /12 दिन, 18 दिन, 24 दिन.*प्रोजेक्ट का कितना भाग/i, qNumber: 34 },
  { match: /पाइप M.*6 घंटे.*पाइप N.*12 घंटे.*3\.5 घंटे/i, qNumber: 35 },
  { match: /दो प्रवेश पाइप, A और B, तथा एक निकास पाइप, C.*36 घंटे/i, qNumber: 36 },
  { match: /समान दक्षता वाले दो व्यक्ति.*6 घंटे/i, qNumber: 37 },
  { match: /पाइप P.*10 घंटे.*पाइप Q.*20 घंटे.*5 घंटे/i, qNumber: 38 },
  { match: /A किसी कार्य को 12 दिन.*B उसी कार्य को 18 दिन.*4 दिन पश्चात/i, qNumber: 39 },
  { match: /दो प्रवेश पाइप-\s*C और D.*निकास पाइप E.*30 घंटे/i, qNumber: 40 },
  { match: /समान दक्षता वाले 6 मजदूर.*9 दिनों/i, qNumber: 41 },
  { match: /पाइप C एक टैंक को 10 घंटे.*पाइप D.*15 घंटे/i, qNumber: 42 },
  { match: /पाइप A.*24 घंटे.*पाइप B.*36 घंटे/i, qNumber: 43 },
  { match: /तीन दोस्त - अर्जुन, कबीर, और नेहा/i, qNumber: 44 },
  { match: /पाइप A और पाइप B.*8 घंटे और 12 घंटे/i, qNumber: 45 }
];

// Helper: check if text contains Devanagari Hindi characters
export function isHindiText(text: string): boolean {
  return /[\u0900-\u097F]/.test(text || '');
}

// Helper: check if text has English prose (words of >= 2 Latin letters outside pure SI units)
function hasEnglishProse(text: string): boolean {
  if (!text) return false;
  const cleaned = maskScientificContent(text).masked;
  return /\b[a-zA-Z]{2,}\b/.test(cleaned);
}

// Unicode-safe boundary builders: NEVER match inside Devanagari words (e.g. 'नल' inside 'निम्नलिखित')
const HI_START = '(?<![\\u0900-\\u097F])';
const HI_END = '(?![\\u0900-\\u097F])';
const hiPhrase = (pattern: string) => new RegExp(`${HI_START}(?:${pattern})${HI_END}`, 'g');
const enPhrase = (pattern: string) => new RegExp(`(?<![a-zA-Z])(?:${pattern})(?![a-zA-Z])`, 'gi');

// Sentence-level and safe whole-word offline fallbacks (never break intra-word Hindi Devanagari)
const HINDI_PHRASE_TRANSLATIONS: [RegExp, string][] = [
  [hiPhrase('निम्नलिखित में से कौन-सा कथन सत्य है\\??'), 'Which of the following statements is true?'],
  [hiPhrase('निम्नलिखित में से कौन-सा कथन असत्य है\\??'), 'Which of the following statements is false?'],
  [hiPhrase('निम्नलिखित में से कौन सा सही है\\??'), 'Which of the following is correct?'],
  [hiPhrase('निम्नलिखित में से कौन-सा सही है\\??'), 'Which of the following is correct?'],
  [hiPhrase('निम्नलिखित में से किसकी स्थापना'), 'Which of the following was established'],
  [hiPhrase('भारतीय संविधान के किस अनुच्छेद में'), 'In which article of the Indian Constitution'],
  [hiPhrase('भारत की राजधानी क्या है\\??'), 'What is the capital of India?'],
  [hiPhrase('बिहार का राज्य पक्षी क्या है\\??'), 'What is the state bird of Bihar?'],
  [hiPhrase('दिए गए विकल्पों में से सही उत्तर का चयन कीजिए'), 'Select the correct answer from the given options'],
  [hiPhrase('कार्य को पूरा करने में लगा कुल समय ज्ञात कीजिए'), 'Find the total time taken to complete the work'],
  [hiPhrase('टंकी को पूर्णतः भरने में लगने वाला समय ज्ञात कीजिए'), 'Find the time required to completely fill the tank'],
  [hiPhrase('शेष कार्य को कितने दिनों में पूरा करेगा\\??'), 'In how many days will the remaining work be completed?'],
  [hiPhrase('कितने दिनों में पूरा कर सकता है\\??'), 'In how many days can it be completed?'],
  [hiPhrase('कितने समय में भर जाएगी\\??'), 'In what time will it be filled?'],
  [hiPhrase('का मान ज्ञात कीजिए'), 'find the value of'],
  [hiPhrase('का मान क्या होगा\\??'), 'What will be the value of?'],
  [hiPhrase('घंटे में'), 'hours'],
  [hiPhrase('घंटों में'), 'hours'],
  [hiPhrase('घंटे'), 'hours'],
  [hiPhrase('घंटा'), 'hour'],
  [hiPhrase('दिनों में'), 'days'],
  [hiPhrase('दिन में'), 'days'],
  [hiPhrase('दिन'), 'days'],
  [hiPhrase('मिनटों में'), 'minutes'],
  [hiPhrase('मिनट में'), 'minutes'],
  [hiPhrase('मिनट'), 'minutes'],
  [hiPhrase('सेकंड'), 'seconds'],
  [hiPhrase('क्रमशः'), 'respectively'],
  [hiPhrase('एकसाथ कार्य करते हैं'), 'work together'],
  [hiPhrase('एकसाथ काम करते हुए'), 'working together'],
  [hiPhrase('किसी कार्य को'), 'a piece of work'],
  [hiPhrase('दक्षता'), 'efficiency'],
  [hiPhrase('कार्यक्षमता'), 'efficiency'],
  [hiPhrase('समान दक्षता'), 'equal efficiency'],
  [hiPhrase('अकेले'), 'alone'],
  [hiPhrase('टंकी'), 'tank'],
  [hiPhrase('टैंक'), 'tank'],
  [hiPhrase('कुंड'), 'cistern'],
  [hiPhrase('पाइप'), 'pipe'],
  [hiPhrase('नल'), 'tap'],
  [hiPhrase('प्रवेश पाइप'), 'inlet pipe'],
  [hiPhrase('निकास पाइप'), 'outlet pipe'],
  [hiPhrase('पूर्ण रूप से'), 'completely'],
  [hiPhrase('पूर्णतः'), 'completely'],
  [hiPhrase('खाली कर सकता है'), 'can empty'],
  [hiPhrase('भर सकता है'), 'can fill'],
  [hiPhrase('भर सकती है'), 'can fill'],
  [hiPhrase('खोल दिया जाए'), 'is opened'],
  [hiPhrase('बंद कर दिया जाता है'), 'is closed'],
  [hiPhrase('बंद कर दिया गया'), 'was closed'],
  [hiPhrase('अतिरिक्त समय'), 'additional time'],
  [hiPhrase('शेष भाग'), 'remaining part'],
  [hiPhrase('शेष कार्य'), 'remaining work'],
  [hiPhrase('मजदूरों'), 'workers'],
  [hiPhrase('मजदूर'), 'workers'],
  [hiPhrase('व्यक्ति'), 'persons'],
  [hiPhrase('व्याख्या'), 'Explanation'],
  [hiPhrase('हल'), 'Solution'],
  [hiPhrase('उत्तर'), 'Answer'],
  [hiPhrase('विकल्प'), 'Option']
];

const ENGLISH_PHRASE_TRANSLATIONS: [RegExp, string][] = [
  [enPhrase('Which of the following statements is true\\??'), 'निम्नलिखित में से कौन-सा कथन सत्य है?'],
  [enPhrase('Which of the following statements is false\\??'), 'निम्नलिखित में से कौन-सा कथन असत्य है?'],
  [enPhrase('Which of the following is correct\\??'), 'निम्नलिखित में से कौन-सा सही है?'],
  [enPhrase('What is the capital of India\\??'), 'भारत की राजधानी क्या है?'],
  [enPhrase('Find the value of'), 'मान ज्ञात कीजिए'],
  [enPhrase('Find the total time taken'), 'कुल लगा समय ज्ञात कीजिए'],
  [enPhrase('respectively'), 'क्रमशः'],
  [enPhrase('working together'), 'एकसाथ कार्य करते हुए'],
  [enPhrase('work together'), 'एकसाथ कार्य करते हैं'],
  [enPhrase('efficiency'), 'दक्षता'],
  [enPhrase('alone'), 'अकेले'],
  [enPhrase('hours'), 'घंटे'],
  [enPhrase('hour'), 'घंटा'],
  [enPhrase('days'), 'दिन'],
  [enPhrase('minutes'), 'मिनट'],
  [enPhrase('tank'), 'टंकी'],
  [enPhrase('cistern'), 'कुंड'],
  [enPhrase('inlet pipe'), 'प्रवेश पाइप'],
  [enPhrase('outlet pipe'), 'निकास पाइप'],
  [enPhrase('can fill'), 'भर सकता है'],
  [enPhrase('can empty'), 'खाली कर सकता है'],
  [enPhrase('Explanation'), 'व्याख्या'],
  [enPhrase('Solution'), 'हल'],
  [enPhrase('Answer'), 'उत्तर']
];

/**
 * Masks LaTeX, MathML, equations, chemical formulas, numbers with SI/scientific
 * units, and standalone scientific units so translation engines never alter them
 * (e.g. `60 J` stays `60 J`, never `60 जे`).
 */
export function maskScientificContent(value: string): { masked: string; tokens: string[] } {
  const tokens: string[] = [];
  const stash = (match: string) => {
    const idx = tokens.length;
    tokens.push(match);
    return `[[MT_${idx}]]`;
  };

  let masked = value;

  // 1. LaTeX & MathML blocks
  masked = masked.replace(
    /(<math\b[\s\S]*?<\/math>|\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/gi,
    stash
  );

  // 2. Equations / algebraic expressions with '=' (e.g. F = ma, KE = 1/2 mv^2, v = u + at, F = m × a)
  masked = masked.replace(
    /(?<![a-zA-Z\u0900-\u097F])[A-Za-zθφωαβγΔλμρσΩ][A-Za-z0-9θφωαβγΔλμρσΩ₀-₉²³¹⁰-⁹]*\s*=\s*[A-Za-z0-9θφωαβγΔλμρσΩ₀-₉²³¹⁰-⁹½⅓¼¾√π+\-−*/×÷·^().\s]+(?=[,.;:?!\s\)]|$)/g,
    (m) => stash(m.trimEnd())
  );

  // 3. Chemical formulas (must include digit, Unicode subscript, dot, or parentheses to avoid ordinary caps words)
  masked = masked.replace(
    /(?<![a-zA-Z\u0900-\u097F])(?=(?:[A-Za-z0-9₀-₉()·]*[\d₀-₉·()]))(?:[A-Z][a-z]?(?:[₀-₉]+|\d+)?(?:\([A-Za-z0-9₀-₉]+\)(?:[₀-₉]+|\d+)?)?){2,}(?:·\d*[A-Za-z0-9₀-₉]+)*(?![a-zA-Z\u0900-\u097F])/g,
    stash
  );

  // 4. Numbers (including scientific notation) + SI / physics / chemistry / math units (e.g. 60 J, 60J, 20 N, 5 kg, 20,000 Hz, 9.8 m/s²)
  const unitAtom =
    '(?:°[CF]|℃|℉|%|Ω|kΩ|MΩ|μF|μA|μV|μg|μm|μs|kHz|MHz|GHz|Hz|kWh|Wh|kJ|MJ|mJ|J|kN|mN|Nm|N|kW|MW|GW|mW|W|kV|mV|V|kA|mA|Ah|mAh|A|kPa|MPa|hPa|Pa|atm|bar|mmHg|torr|mC|nC|C|nF|pF|F|mH|H|mT|T|Wb|lm|lx|Bq|Gy|Sv|kat|keV|MeV|GeV|eV|mol|mmol|cd|rad|sr|kcal|cal|dB|hp|amu|kg|mg|g|km|cm|mm|nm|pm|fm|Å|ly|AU|pc|m|ms|ns|min|hrs|hr|s|h|mL|ml|cc|L|kmph|rpm|a\\.m\\.|p\\.m\\.|K)';
  const numWithUnitRegex = new RegExp(
    `(?<![a-zA-Z\\u0900-\\u097F])[+-]?\\d+(?:[.,]\\d+)?(?:\\s*[×x*]\\s*10(?:\\^-?\\d+|[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+))?\\s*${unitAtom}(?:[\\/·*]${unitAtom})*(?:\\^-?\\d+|[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹²³]+)?(?![a-zA-Z\\u0900-\\u097F])`,
    'g'
  );
  masked = masked.replace(numWithUnitRegex, stash);

  // 5. Standalone compound units or non-word scientific unit tokens (m/s², km/h, Hz, kWh, Ω, °C, cm³, etc.)
  const standaloneCompoundUnitRegex =
    /(?<![a-zA-Z0-9\u0900-\u097F])(?:°[CF]|℃|℉|Ω|kΩ|MΩ|μF|μA|μV|μg|μm|μs|kHz|MHz|GHz|Hz|kWh|kJ|MJ|mJ|kN|mN|kW|MW|GW|mW|kV|mV|kA|mA|mAh|kPa|MPa|hPa|Pa|atm|mmHg|torr|keV|MeV|GeV|eV|mol|mmol|kcal|cal|dB|hp|amu|kg|mg|km|cm|mm|nm|pm|fm|Å|ms|ns|mL|ml|cc|kmph|rpm|m\/s²|m\/s\^2|m\/s|km\/h|km\/hr|kg\/m³|g\/cm³|N\/m²|J\/kg|cm²|cm³|m²|m³|km²)(?:\^-?\d+|[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹²³]+)?(?![a-zA-Z0-9\u0900-\u097F])/g;
  masked = masked.replace(standaloneCompoundUnitRegex, stash);

  // 6. Pure numeric expressions / fractions / currencies (e.g. ₹2209, 20 - 5, ³¹⁄₄₇, 5⅓)
  masked = masked.replace(
    /(?<![a-zA-Z\u0900-\u097F])(?:₹\s*\d+(?:[.,]\d+)?|\d+\s*[⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁄/][₀-₉\d]+|[⁰¹²³⁴⁵⁶⁷⁸⁹]+[⁄/][₀-₉]+)(?![a-zA-Z\u0900-\u097F])/g,
    stash
  );

  // 7. Standalone single-letter SI/variable symbols inside parentheses or isolated in short unit expressions
  masked = masked.replace(/\(([JNWVAKCTHFLmgs])\)/g, stash);

  return { masked, tokens };
}

export function restoreScientificContent(translated: string, tokens: string[]): string {
  return translated
    .replace(/\[\[\s*MT[_\s-]*(\d+)\s*\]\]/gi, (_, i) => tokens[Number(i)] ?? '')
    .replace(/__\s*MATH_TOKEN_(\d+)\s*__/gi, (_, i) => tokens[Number(i)] ?? '');
}

/**
 * Returns true if the text consists solely of numbers, SI units, formulas,
 * chemical symbols, or option markers (no natural-language prose to translate).
 */
export function isPureFormulaOrUnit(value: string): boolean {
  const trimmed = (value || '').trim();
  if (!trimmed) return true;
  if (isHindiText(trimmed)) return false;

  const { masked } = maskScientificContent(trimmed);
  const withoutTokens = masked.replace(/\[\[MT_\d+\]\]/g, ' ').trim();
  // Remove numbers, operators, punctuation, and single-letter math/SI symbols
  const remainingProse = withoutTokens
    .replace(/[0-9.,+\-−*/=^()%°′″×÷√πθφωαβγΔλμρσΩ²³¹⁰-⁹₀-₉½⅓¼¾⅙⅛⅜⅝⅞:;\[\]{}<>≤≥≠≈·•?!&\s₹$]/g, ' ')
    .trim();

  if (!remainingProse) return true;
  // If only single-letter option/SI/variable letters remain (e.g. "J", "N", "x", "A"), skip translation
  const words = remainingProse.split(/\s+/).filter(Boolean);
  return words.every((w) => w.length <= 1);
}

export function translateHindiToEnglish(text: string): string {
  if (!text) return '';
  let result = normalizeHindiText(text);
  const { masked, tokens } = maskScientificContent(result);
  let working = masked;
  for (const [regex, replacement] of HINDI_PHRASE_TRANSLATIONS) {
    working = working.replace(regex, replacement);
  }
  return restoreScientificContent(working, tokens);
}

export function translateEnglishToHindi(text: string): string {
  if (!text) return '';
  const { masked, tokens } = maskScientificContent(text);
  let working = masked;
  for (const [regex, replacement] of ENGLISH_PHRASE_TRANSLATIONS) {
    working = working.replace(regex, replacement);
  }
  return restoreScientificContent(working, tokens);
}

/**
 * Returns localized content (text, options, explanation) for the given question and target language ('en' | 'hi').
 * Preserves accurate Devanagari Unicode without intra-word corruption.
 */
export function getQuestionDisplay(
  q: Question,
  targetLang: 'en' | 'hi'
): TranslatedContent {
  if (!q) {
    return { text: '', options: [], explanation: '' };
  }

  // TARGET: ENGLISH
  if (targetLang === 'en') {
    if (q.textEnglish && q.textEnglish.trim().length > 0) {
      return {
        text: q.textEnglish,
        options: q.optionsEnglish && q.optionsEnglish.length === q.options.length ? q.optionsEnglish : q.options,
        explanation: q.explanationEnglish || q.explanation
      };
    }

    if (TIME_AND_WORK_TRANSLATIONS[q.number]) {
      const match = TIME_AND_WORK_TRANSLATIONS[q.number];
      return {
        text: match.text,
        options: match.options.length === q.options.length ? match.options : q.options,
        explanation: match.explanation
      };
    }

    for (const sig of SIGNATURE_MAP) {
      if (sig.match.test(q.text)) {
        const match = TIME_AND_WORK_TRANSLATIONS[sig.qNumber];
        if (match) {
          return {
            text: match.text,
            options: match.options.length === q.options.length ? match.options : q.options,
            explanation: match.explanation
          };
        }
      }
    }

    // If pure English or already bilingual (contains complete English prose + Hindi),
    // return cleanly normalized text without mixing Hinglish substitutions into Devanagari.
    if (!isHindiText(q.text) || hasEnglishProse(q.text)) {
      return {
        text: normalizeHindiText(q.text),
        options: q.options.map((o) => normalizeHindiText(o)),
        explanation: normalizeHindiText(q.explanation)
      };
    }

    return {
      text: normalizeHindiText(q.text),
      options: q.options.map((opt) => normalizeHindiText(opt)),
      explanation: normalizeHindiText(q.explanation)
    };
  }

  // TARGET: HINDI
  if (targetLang === 'hi') {
    if (q.textHindi && q.textHindi.trim().length > 0) {
      return {
        text: normalizeHindiText(q.textHindi),
        options: (q.optionsHindi && q.optionsHindi.length === q.options.length ? q.optionsHindi : q.options).map((o) =>
          normalizeHindiText(o)
        ),
        explanation: normalizeHindiText(q.explanationHindi || q.explanation)
      };
    }

    if (isHindiText(q.text)) {
      return {
        text: normalizeHindiText(q.text),
        options: q.options.map((o) => (isPureFormulaOrUnit(o) ? o : normalizeHindiText(o))),
        explanation: normalizeHindiText(q.explanation)
      };
    }

    return {
      text: isPureFormulaOrUnit(q.text) ? q.text : translateEnglishToHindi(q.text),
      options: q.options.map((opt) => (isPureFormulaOrUnit(opt) ? opt : translateEnglishToHindi(opt))),
      explanation: isPureFormulaOrUnit(q.explanation) ? q.explanation : translateEnglishToHindi(q.explanation)
    };
  }

  return {
    text: normalizeHindiText(q.text),
    options: q.options.map((o) => normalizeHindiText(o)),
    explanation: normalizeHindiText(q.explanation)
  };
}

// Online fallback for questions that do not contain a saved bilingual version.
// Cached locally so each string is only translated once.
const translationCache = new Map<string, string>();

export async function translateWithGoogle(text: string, targetLang: 'en' | 'hi'): Promise<string> {
  const value = (text || '').trim();
  if (!value) return text || '';

  // Never send pure formulas, numbers, or SI unit options (e.g. "60 J", "9.8 m/s²") to translation
  if (isPureFormulaOrUnit(value)) {
    return value;
  }

  const cacheKey = `${targetLang}:${value}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const { masked: protectedText, tokens: maskedMath } = maskScientificContent(value);

  // Check again if anything translatable remains outside tokens
  const proseLeft = protectedText.replace(/\[\[MT_\d+\]\]/g, '').replace(/[^a-zA-Z\u0900-\u097F]/g, '');
  if (!proseLeft) {
    translationCache.set(cacheKey, value);
    return value;
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(protectedText)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Translation request failed: ${response.status}`);
    const data = await response.json();
    const rawTranslated = Array.isArray(data?.[0])
      ? data[0].map((part: any) => (Array.isArray(part) ? part[0] : '')).join('')
      : '';
    if (!rawTranslated.trim()) throw new Error('Empty translation response');
    const restored = restoreScientificContent(rawTranslated, maskedMath);
    const finalText = targetLang === 'hi' || isHindiText(restored) ? normalizeHindiText(restored) : restored;
    translationCache.set(cacheKey, finalText);
    return finalText;
  } catch (error) {
    console.warn('Question translation unavailable; showing original text.', error);
    return isHindiText(value) ? normalizeHindiText(value) : value;
  }
}

/**
 * Async bilingual display: keeps curated/saved translations, preserves valid
 * Devanagari & scientific formulas/SI units, and translates natural prose when needed.
 */
export async function getQuestionDisplayAsync(
  q: Question,
  targetLang: 'en' | 'hi'
): Promise<TranslatedContent> {
  if (!q) return { text: '', options: [], explanation: '' };

  if (targetLang === 'en' && (TIME_AND_WORK_TRANSLATIONS[q.number] || SIGNATURE_MAP.some((sig) => sig.match.test(q.text)))) {
    return getQuestionDisplay(q, targetLang);
  }

  const explicitText = targetLang === 'en' ? q.textEnglish : q.textHindi;
  const explicitOptions = targetLang === 'en' ? q.optionsEnglish : q.optionsHindi;
  const explicitExplanation = targetLang === 'en' ? q.explanationEnglish : q.explanationHindi;

  const sourceText = explicitText?.trim() ? explicitText : q.text;
  const sourceOptions = explicitOptions?.length === q.options.length ? explicitOptions : q.options;
  const sourceExplanation = explicitExplanation?.trim() ? explicitExplanation : q.explanation;

  const translateIfNeeded = async (value: string): Promise<string> => {
    if (!value?.trim()) return value || '';
    if (isPureFormulaOrUnit(value)) return value;

    const cleanVal = isHindiText(value) ? normalizeHindiText(value) : value;

    // If targeting English and the string is already bilingual (English + Hindi) or pure English,
    // keep the original bilingual text intact rather than corrupting Devanagari or duplicating prose.
    if (targetLang === 'en') {
      if (!isHindiText(cleanVal)) return cleanVal;
      if (hasEnglishProse(cleanVal)) return cleanVal;
      return translateWithGoogle(cleanVal, 'en');
    }

    // Target Hindi
    if (isHindiText(cleanVal)) return cleanVal;
    return translateWithGoogle(cleanVal, 'hi');
  };

  const [text, options, explanation] = await Promise.all([
    translateIfNeeded(sourceText),
    Promise.all(sourceOptions.map((option) => translateIfNeeded(option))),
    translateIfNeeded(sourceExplanation || '')
  ]);

  return { text, options, explanation };
}
