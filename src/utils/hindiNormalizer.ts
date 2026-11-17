/**
 * Hindi Devanagari text cleaner & normalizer.
 * Fixes broken matras, unwanted intra-word spaces from OCR/PDF extraction,
 * and common duplicate conjunct artifacts (e.g. अनुपानुपात -> अनुपात, पुस्‍पुतक -> पुस्तक).
 */

const OCR_DUPLICATE_FIXES: [RegExp, string][] = [
  [/अनुपानुपात/g, 'अनुपात'],
  [/पुस्‍पुतकों/g, 'पुस्तकों'],
  [/पुस्पुतकों/g, 'पुस्तकों'],
  [/पुस्‍पुतक/g, 'पुस्तक'],
  [/पुस्पुतक/g, 'पुस्तक'],
  [/संयुक्‍युत/g, 'संयुक्त'],
  [/संयुक्युत/g, 'संयुक्त'],
  [/शुरुशुआती/g, 'शुरुआती'],
  [/पूर्णां कर्णां/g, 'पूर्णांक'],
  [/मूल्मूय/g, 'मूल्य'],
  [/शुद्धशु/g, 'शुद्ध'],
  [/तुलतुना/g, 'तुलना'],
  [/समूहमू/g, 'समूह'],
  [/भुगभुता न/g, 'भुगतान'],
  [/बुकबु\s*स्टो\s*र/g, 'बुकस्टोर'],
  [/करें\?रें/g, 'करें?'],
  [/हैं,\s*हैं/g, 'हैं,'],
  [/में,\s*d\s*में/g, 'में, d'],
  [/में\s*की\s*कमी/g, 'की कमी'],
  [/kMT\s*में\s*में/g, 'kMT में'],
  [/kMT\s*में\s*की/g, 'kMT की'],
  [/FY23\s*में\s*से/g, 'FY23 से'],
  [/संख्या\s*एं\s*और/g, 'संख्याएं और'],
];

const HI_BOUNDARY_START = '(?<![\\u0900-\\u097F])';
const HI_BOUNDARY_END = '(?![\\u0900-\\u097F])';
const hiSplit = (pattern: string) => new RegExp(`${HI_BOUNDARY_START}(?:${pattern})${HI_BOUNDARY_END}`, 'g');

const SPLIT_WORD_FIXES: [RegExp, string][] = [
  [hiSplit('नि\\s+म्न(?:\\u200D)?'), 'निम्न'],
  [hiSplit('नि\\s+म्न\\s*लि\\s*खि\\s*त'), 'निम्नलिखित'],
  [hiSplit('मा\\s+न'), 'मान'],
  [hiSplit('ज्ञा\\s+त'), 'ज्ञात'],
  [hiSplit('की\\s+जि\\s+ए'), 'कीजिए'],
  [hiSplit('दी\\s+जि\\s+ए'), 'दीजिए'],
  [hiSplit('कि\\s+सी'), 'किसी'],
  [hiSplit('कि\\s+स'), 'किस'],
  [hiSplit('कि\\s+तने'), 'कितने'],
  [hiSplit('कि\\s+तना'), 'कितना'],
  [hiSplit('कि\\s+या'), 'किया'],
  [hiSplit('दि\\s+या'), 'दिया'],
  [hiSplit('दि\\s+ए'), 'दिए'],
  [hiSplit('नी\\s+चे'), 'नीचे'],
  [hiSplit('वि\\s+भा\\s+ज्य'), 'विभाज्य'],
  [hiSplit('वि\\s+भि\\s+न्न'), 'विभिन्न'],
  [hiSplit('अभ्यर्थि\\s+यों'), 'अभ्यर्थियों'],
  [hiSplit('अभ्यर्थी\\s+यों'), 'अभ्यर्थियों'],
  [hiSplit('अनुपा\\s+त'), 'अनुपात'],
  [hiSplit('नि\\s+रू\\s*पि\\s+त'), 'निरूपित'],
  [hiSplit('बा\\s+लकों'), 'बालकों'],
  [hiSplit('बा\\s+लि\\s+का\\s+ओं'), 'बालिकाओं'],
  [hiSplit('स्था\\s+नां\\s+तरि\\s+त'), 'स्थानांतरित'],
  [hiSplit('प्रति\\s+शत'), 'प्रतिशत'],
  [hiSplit('नि\\s+का\\s+य'), 'निकाय'],
  [hiSplit('अनं\\s+त'), 'अनंत'],
  [hiSplit('हों\\s+गे'), 'होंगे'],
  [hiSplit('हो\\s+गा'), 'होगा'],
  [hiSplit('हो\\s+जा\\s+ती'), 'हो जाती'],
  [hiSplit('हो\\s+जा\\s+ता'), 'हो जाता'],
  [hiSplit('वि\\s+त्ती\\s+य'), 'वित्तीय'],
  [hiSplit('वि\\s+नि\\s+र्मा\\s+ण'), 'विनिर्माण'],
  [hiSplit('कंपनि\\s+यों'), 'कंपनियों'],
  [hiSplit('कंपनी\\s+यों'), 'कंपनियों'],
  [hiSplit('उत्पा\\s+दन'), 'उत्पादन'],
  [hiSplit('बि\\s+क्री'), 'बिक्री'],
  [hiSplit('हजा\\s+र'), 'हजार'],
  [hiSplit('यूनि\\s+ट'), 'यूनिट'],
  [hiSplit('अति\\s+रि\\s+क्त'), 'अतिरिक्त'],
  [hiSplit('जा\\s+नका\\s+री'), 'जानकारी'],
  [hiSplit('सब्सि\\s+डी'), 'सब्सिडी'],
  [hiSplit('भंडा\\s+रण'), 'भंडारण'],
  [hiSplit('वि\\s+चा\\s+र'), 'विचार'],
  [hiSplit('सर्वा\\s+धि\\s+क'), 'सर्वाधिक'],
  [hiSplit('अर्जि\\s+त'), 'अर्जित'],
  [hiSplit('चा\\s+ल'), 'चाल'],
  [hiSplit('पाँ\\s+च'), 'पाँच'],
  [hiSplit('मही\\s+नों'), 'महीनों'],
  [hiSplit('दि\\s+खा\\s+ता'), 'दिखाता'],
  [hiSplit('बा\\s+र'), 'बार'],
  [hiSplit('ग्रा\\s+फ'), 'ग्राफ'],
  [hiSplit('बा\\s+रंबा\\s+रता'), 'बारंबारता'],
  [hiSplit('समां\\s+तर'), 'समांतर'],
  [hiSplit('मा\\s+ध्य'), 'माध्य'],
  [hiSplit('अधि\\s+क'), 'अधिक'],
  [hiSplit('रा\\s+ज(?:स्‍व|स्व)'), 'राजस्व'],
  [hiSplit('प्रा\\s+(?:प्‍त|प्त)'), 'प्राप्त'],
  [hiSplit('सरली\\s+कृत'), 'सरलीकृत'],
  [hiSplit('प्रका\\s+र'), 'प्रकार'],
  [hiSplit('संख्या\\s+ओं'), 'संख्याओं'],
  [hiSplit('संख्या\\s+एं'), 'संख्याएं'],
  [hiSplit('यो\\s+गफल'), 'योगफल'],
  [hiSplit('शो\\s+धकर्ता'), 'शोधकर्ता'],
  [hiSplit('व्यक्ति\\s+यों'), 'व्यक्तियों'],
  [hiSplit('पा\\s+ई'), 'पाई'],
  [hiSplit('चा\\s+र्ट'), 'चार्ट'],
  [hiSplit('क्विं\\s+टल'), 'क्विंटल'],
  [hiSplit('अल्को\\s+हल'), 'अल्कोहल'],
  [hiSplit('वि\\s+लयन'), 'विलयन'],
  [hiSplit('ली\\s+टर'), 'लीटर'],
  [hiSplit('नि\\s+का\\s+लकर'), 'निकालकर'],
  [hiSplit('उपस्थि\\s+त'), 'उपस्थित'],
  [hiSplit('ती\\s+न'), 'तीन'],
  [hiSplit('चा\\s+वल'), 'चावल'],
  [hiSplit('मा\\s+त्रा'), 'मात्रा'],
  [hiSplit('नि\\s+ष्पा\\s+दन'), 'निष्पादन'],
  [hiSplit('प्रवृ\\s+त्ति'), 'प्रवृत्ति'],
  [hiSplit('संक्षि\\s+प्त'), 'संक्षिप्त'],
  [hiSplit('नि\\s+रंतर'), 'निरंतर'],
  [hiSplit('एकमा\\s+त्र'), 'एकमात्र'],
  [hiSplit('वर्षों\\s+के\\s+दौरा\\s+न'), 'वर्षों के दौरान'],
  [hiSplit('दौरा\\s+न'), 'दौरान'],
  [hiSplit('नि\\s+र्या\\s+त'), 'निर्यात'],
  [hiSplit('सं\\s+घटन'), 'संगठन'],
  [hiSplit('वि\\s+कल्पों'), 'विकल्पों'],
  [hiSplit('बि\\s+ना'), 'बिना'],
  [hiSplit('बि\\s+की'), 'बिकी'],
  [hiSplit('बि\\s+के'), 'बिके'],
  [hiSplit('खर्च\\s+कर\\s+ता'), 'खर्च करता'],
  [hiSplit('मा\\s+सि\\s+क'), 'मासिक'],
  [hiSplit('कि\\s+रा\\s+ए'), 'किराए'],
  [hiSplit('बि\\s+लों'), 'बिलों'],
  [hiSplit('जन्मदि\\s+न'), 'जन्मदिन'],
  [hiSplit('मना\\s+ने'), 'मनाने'],
  [hiSplit('के\\s+लि\\s+ए'), 'के लिए'],
  [hiSplit('लि\\s+ए'), 'लिए']
];

export function normalizeHindiText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  // Normalize to Unicode NFC so precomposed/decomposed Devanagari sequences stay canonical
  let cleaned = text.normalize('NFC');

  // 1. Remove zero-width spaces / BOM / stray ZWJ that corrupt Hindi font rendering
  cleaned = cleaned.replace(/[\u200B\u200D\uFEFF]/g, '');

  // 2. Fix known OCR duplicate/stutter syllables
  for (const [regex, replacement] of OCR_DUPLICATE_FIXES) {
    cleaned = cleaned.replace(regex, replacement);
  }

  // 3. Fix words split by intra-syllable spaces (boundary-safe)
  for (const [regex, replacement] of SPLIT_WORD_FIXES) {
    cleaned = cleaned.replace(regex, replacement);
  }

  // 4. Reattach split Devanagari vowel signs / matras / nukta / anusvara / chandrabindu / visarga / virama
  // Includes standard consonants (0915-0939) and nukta consonants (0958-095F), plus independent vowels (0904-0914) for anusvara/chandrabindu
  cleaned = cleaned.replace(
    /([\u0904-\u0939\u0958-\u095F]\u093C?)[ \t]+([\u0901-\u0903\u093C\u093E-\u094D\u0962-\u0963]+)/g,
    '$1$2'
  );

  // 5. Clean up multiple spaces and spaces before punctuation (preserve newlines)
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/[ \t]+([।?,.!])/g, '$1');

  return cleaned.normalize('NFC').trim();
}
