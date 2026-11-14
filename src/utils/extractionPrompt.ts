export const EXTRACTION_PROMPT = `TASK: EXACT VERBATIM MCQ EXTRACTION FROM PDF PAGE OR EXAM SCREENSHOT (NOT QUESTION GENERATION).
Inspect every attached page/screenshot image carefully from top to bottom. Every image is preceded by a marker like "=== PAGE N ===".
Extract EVERY visible multiple-choice question (MCQ) on these images in exact top-to-bottom source order.

STRICT EXTRACTION RULES:
1. EXACT TEXT & CLEANUP:
   - Copy ONLY questions visibly present in the image. Never invent, replace, paraphrase, translate, or skip questions.
   - Preserve exact numbers, units, percentages, ratios, fractions, equations, and symbols.
   - MATHEMATICAL FORMATTING IS REQUIRED: Never flatten a mathematical fraction to plain text such as "1/2" when it is a numerator over denominator. Encode every mathematical expression as valid MathML inside a <math>...</math> element, keeping it inside the question/option string. Use <mfrac><mn>1</mn><mn>2</mn></mfrac> for 1/2; put the complete numerator in the first child and denominator in the second child.
   - Use <msqrt>...</msqrt> for square roots and nest <msqrt> elements for roots inside roots. Example: √(5 + 2√3) must be <math><msqrt><mrow><mn>5</mn><mo>+</mo><mn>2</mn><msqrt><mn>3</mn></msqrt></mrow></msqrt></math>. The radical bar must cover the complete radicand.
   - Use <msup> for powers and <msub> for subscripts. Use <mfrac> for every stacked fraction, including long algebraic fractions. Do not use slash notation for mathematical division.
   - Keep ordinary prose outside <math> and all math symbols/numbers inside MathML. Do not put Markdown, LaTeX commands, code fences, or explanatory text inside MathML. Use valid MathML tags only.
   - Ignore top mobile/exam UI chrome & watermarks: question timer (e.g. "1sec"), mark badges ("+1.0 -0.0"), warning/bookmark icons, page headers, website logos/watermarks, ads, footers, or Telegram links.
   - Strip option numbering prefixes ("1.", "2.", "3.", "4.", "A)", "B)", "C)", "D)") from extracted option strings so options contain clean choice text only.
   - CRITICAL: NEVER include the options inside the question "text" field, and NEVER include the question text inside "options". Keep question text and options strictly separated!

2. CLEAN HINDI DEVANAGARI UNICODE:
   - Write natural, properly joined Devanagari Hindi words with all matras (ि, ी, ु, ू, े, ै, ो, ौ, ं, ँ, ्) attached cleanly to their consonants.
   - Preserve exact spaces BETWEEN separate Hindi words (e.g. write "आकृति सन्निहित है" and "अनुमति है", NOT "आकृतिसन्निहित" or "अनुमतिहै") and NEVER split a single Hindi word with extra spaces (write "निम्नलिखित" NOT "नि म्नलि खि त", "त्रिभुजों" NOT "त्रि भु जों").

3. DETECT CORRECT ANSWER ACCURATELY (0-BASED INDEX: 0, 1, 2, 3, OR -1 IF UNMARKED):
   - GREEN TICK MARK (✅, ✔) OR GREEN HIGHLIGHTED OPTION BOX -> that option index is correctAnswerIndex!
   - IMPORTANT: Mobile exam screenshots often show a RED highlighted card / RED cross (❌) / RED retry icon (↺) for the user's wrong attempt. COMPLETELY IGNORE RED! Only GREEN (✓ / green box) or YELLOW highlight indicates the true correct answer.
   - Look for explicit answer keys like "Ans: B" or "उत्तर: C" if present.
   - If NO answer indicator is visible, set correctAnswerIndex to -1. NEVER guess.

4. DETECT TABLES (BOX / ROW / COLUMN - MEAN, MEDIAN, MODE, FREQUENCY DISTRIBUTION):
   - When a question includes a tabular box/row/column grid:
     * Set "figureType": "table"
     * Populate "tableData": { "title": "...", "headers": ["col1", "col2", ...], "rows": [["r1c1", "r1c2", ...], ...], "footer": "..." }.
     * Also provide "figureBox": [ymin, xmin, ymax, xmax] enclosing the table.

5. ISOLATE QUESTION DIAGRAM (figureBox) WITH ZERO TEXT LEAKAGE:
   - When a question has ANY visual diagram/figure — e.g. embedded figure, counting triangles, dice/cube net, mirror/water image prompt, bar/pie/line chart, composite DI, geometry figure, visual math formula, or photo:
     * Set appropriate "figureType" ("bar_chart", "pie_chart", "line_chart", "data_interpretation", "math_formula", "geometry", "reasoning_figure", or "image").
     * Provide "figureBox": [ymin, xmin, ymax, xmax] (integers 0 to 1000 relative to the image of "pageNumber").
     * CRITICAL ZERO-TEXT RULE FOR figureBox:
       - Start ymin STRICTLY BELOW the last line of the printed question text above the diagram (leave a tiny clean white margin above the top edge of the diagram — NEVER touch or clip any Hindi matras, parentheses, or descenders from the question text above!).
       - End ymax STRICTLY ABOVE any option boxes/numbers ("1.", "2.", "A)") below the diagram.
       - Include ONLY the diagram/chart itself (and axis labels/legend/A,B,C,D labels if inside the figure).
   - If a question has NO diagram/table/chart (text-only question), set "figureType": "none" and omit "figureBox".
   - SHARED DI CHARTS: If multiple questions on the same page share one DI chart/table above them, attach the same "figureType" and "figureBox" (and "tableData" if a table) to each dependent question.

6. VISUAL OPTION IMAGES (optionBoxes):
   - When options 1/2/3/4 (or A/B/C/D) themselves contain visual images, mirror/water reflections, shapes, dice, or rotated figures (like non-verbal reasoning options):
     * Set "optionBoxes" as an array of 4 [ymin, xmin, ymax, xmax] boxes in exact option order [0, 1, 2, 3] on "pageNumber".
     * TIGHT CROP: Each box in "optionBoxes" must tightly enclose ONLY the graphic/figure inside that option — EXCLUDE the option number ("1.", "2.", "3.", "4.") on the left and EXCLUDE UI icons (expand arrows ↗↙, green ✓, red ✕, red ↺) on the right!
     * Set "options" to ["Option A", "Option B", "Option C", "Option D"] (or clean short label if text accompanies the option graphic).
   - If options are normal text/numbers (e.g. "12", "11", "10", "14" or "केवल C"), set "optionBoxes" to [].

7. OUTPUT:
   - Return valid JSON matching the schema. Keep "pageNumber" accurate to the "=== PAGE N ===" marker.`;

export function parseExtractedModelJson(raw: string): { questions: any[] } {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  return {
    questions: Array.isArray(parsed?.questions) ? parsed.questions : []
  };
}
