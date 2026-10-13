import katex from "katex";

// Lazy-loaded Speech Rule Engine instance
let sreInstance: any = null;
let sreReadyPromise: Promise<boolean> | null = null;

/**
 * Initialize Speech Rule Engine asynchronously
 */
export async function initSpeechRuleEngine(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (sreReadyPromise) return sreReadyPromise;

  sreReadyPromise = (async () => {
    try {
      const sreModule = await import("speech-rule-engine");
      const sre = sreModule.default || sreModule;
      sre.setupEngine({
        domain: "mathspeak", // Reads math using standard conversational academic rules
        style: "default",
        speech: "deep",
        locale: "en",
      });

      if (typeof sre.engineReady === "function") {
        await sre.engineReady();
      }
      sreInstance = sre;
      return true;
    } catch (err) {
      console.warn("Speech Rule Engine initialization skipped or fallback active:", err);
      return false;
    }
  })();

  return sreReadyPromise;
}

/**
 * Strips robotic AI introductions, header titles, and model attribution footers
 * so text-to-speech begins speaking immediately with natural conversational content.
 */
export function stripRobotIntros(raw: string): string {
  if (!raw) return "";

  let cleaned = raw;

  // Strip Syllaboss header banners: "### Syllaboss Study Assistant (Boss AI)", "Boss AI:", etc.
  cleaned = cleaned.replace(/^#+\s*Syllaboss\s+Study\s+Assistant[^\n]*\n+/gim, "");
  cleaned = cleaned.replace(/^(?:Boss\s*AI|Assistant|AI):\s*/gim, "");
  cleaned = cleaned.replace(/^I\s+have\s+analyzed\s+your\s+(?:study\s+)?(?:inquiry|query|question)[^:\n]*:\s*/gim, "");
  cleaned = cleaned.replace(/^Hello(?:!|,)\s*(?:I\s*am\s*Boss\s*AI[^.\n]*[.\n]+)?/gim, "");
  cleaned = cleaned.replace(/^Welcome\s+to\s+your\s+study\s+session[^.\n]*[.\n]+/gim, "");

  // Strip footer attribution: "*Powered by Groq Cloud LPU...*", etc.
  cleaned = cleaned.replace(/\*?Powered\s+by\s+[^*\n]+\*?/gim, "");
  cleaned = cleaned.replace(/You\s+can\s+ask\s+me\s+to\s+generate\s+practice\s+questions[^.\n]*/gim, "");

  return cleaned.trim();
}

/**
 * Helper to parse balanced braces for nested LaTeX commands like \frac{...}{...}
 */
function replaceBalancedFractions(str: string): string {
  let result = "";
  let i = 0;
  while (i < str.length) {
    if (str.startsWith("\\frac", i) || str.startsWith("\\dfrac", i)) {
      const isDfrac = str.startsWith("\\dfrac", i);
      const fracLen = isDfrac ? 6 : 5;
      let pos = i + fracLen;
      while (pos < str.length && /\s/.test(str[pos])) pos++;
      if (str[pos] === "{") {
        let numStart = pos + 1;
        let depth = 1;
        let p = numStart;
        while (p < str.length && depth > 0) {
          if (str[p] === "{") depth++;
          else if (str[p] === "}") depth--;
          p++;
        }
        if (depth === 0) {
          const num = str.slice(numStart, p - 1);
          while (p < str.length && /\s/.test(str[p])) p++;
          if (str[p] === "{") {
            let denStart = p + 1;
            depth = 1;
            let q = denStart;
            while (q < str.length && depth > 0) {
              if (str[q] === "{") depth++;
              else if (str[q] === "}") depth--;
              q++;
            }
            if (depth === 0) {
              const den = str.slice(denStart, q - 1);
              const cleanNum = replaceBalancedFractions(num);
              const cleanDen = replaceBalancedFractions(den);
              result += `(${cleanNum}) over (${cleanDen})`;
              i = q;
              continue;
            }
          }
        }
      }
    }
    result += str[i];
    i++;
  }
  return result;
}

/**
 * Format SRE speech output into conversational spoken words
 */
function cleanSpeechOutput(speech: string): string {
  return speech
    .replace(/\bStartFraction\b/gi, "")
    .replace(/\bEndFraction\b/gi, "")
    .replace(/\bOver\b/g, "over")
    .replace(/\bStartRoot\b/gi, "square root of")
    .replace(/\bEndRoot\b/gi, "")
    .replace(/\bSuperscript\b/gi, "to the power of")
    .replace(/\bSubscript\b/gi, "sub")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Robust rule engine for translating LaTeX to natural spoken English
 */
export function fallbackLatexToSpeech(latex: string): string {
  let text = latex;

  // Boxed, text, and vector wrappers
  text = text.replace(/\\boxed\{([^{}]+)\}/g, "$1");
  text = text.replace(/\\vec\{([^{}]+)\}/g, "vector $1");
  text = text.replace(/\\(?:text|mathrm|mathbf)\{([^{}]+)\}/g, " $1 ");

  // Nested and balanced fractions
  text = replaceBalancedFractions(text);

  // Roots
  text = text.replace(/\\sqrt\[3\]\{([^{}]+)\}/g, "cube root of $1");
  text = text.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, "the $1th root of $2");
  text = text.replace(/\\sqrt\{([^{}]+)\}/g, "square root of $1");

  // Exponents and powers
  text = text.replace(/\^2\b|\^\{2\}/g, " squared");
  text = text.replace(/\^3\b|\^\{3\}/g, " cubed");
  text = text.replace(/\^\{([^{}]+)\}/g, " to the power of $1");
  text = text.replace(/\^([a-zA-Z0-9])/g, " to the power of $1");

  // Subscripts
  text = text.replace(/_\{([^{}]+)\}/g, " sub $1");
  text = text.replace(/_([a-zA-Z0-9])/g, " sub $1");

  // Calculus & advanced STEM
  text = text.replace(/\\int_\{([^{}]+)\}\^\{([^{}]+)\}/g, "integral from $1 to $2 of ");
  text = text.replace(/\\int\b/g, "integral of ");
  text = text.replace(/\\sum_\{([^{}]+)\}\^\{([^{}]+)\}/g, "sum from $1 to $2 of ");
  text = text.replace(/\\sum\b/g, "summation of ");
  text = text.replace(/\\prod\b/g, "product of ");
  text = text.replace(/\\partial\b/g, "partial derivative of ");
  text = text.replace(/\\lim_\{([^{}]+)\}/g, "limit as $1 ");

  // Common mathematical operations & relations
  text = text.replace(/\\pm\b/g, " plus or minus ");
  text = text.replace(/\\mp\b/g, " minus or plus ");
  text = text.replace(/\\times\b/g, " times ");
  text = text.replace(/\\div\b/g, " divided by ");
  text = text.replace(/\\cdot\b/g, " times ");
  text = text.replace(/\\neq\b/g, " is not equal to ");
  text = text.replace(/\\leq\b|\\le\b/g, " is less than or equal to ");
  text = text.replace(/\\geq\b|\\ge\b/g, " is greater than or equal to ");
  text = text.replace(/\\approx\b/g, " is approximately equal to ");
  text = text.replace(/\\equiv\b/g, " is equivalent to ");
  text = text.replace(/\\propto\b/g, " is proportional to ");
  text = text.replace(/\\infty\b/g, " infinity ");
  text = text.replace(/\\to\b|\\rightarrow\b/g, " approaches ");
  text = text.replace(/\\leftarrow\b/g, " from ");

  // Greek letters
  text = text.replace(/\\alpha\b/g, "alpha");
  text = text.replace(/\\beta\b/g, "beta");
  text = text.replace(/\\gamma\b/g, "gamma");
  text = text.replace(/\\delta\b/g, "delta");
  text = text.replace(/\\Delta\b/g, "change in ");
  text = text.replace(/\\epsilon\b/g, "epsilon");
  text = text.replace(/\\theta\b/g, "theta");
  text = text.replace(/\\lambda\b/g, "lambda");
  text = text.replace(/\\mu\b/g, "mu");
  text = text.replace(/\\pi\b/g, "pi");
  text = text.replace(/\\sigma\b/g, "sigma");
  text = text.replace(/\\omega\b/g, "omega");
  text = text.replace(/\\phi\b/g, "phi");
  text = text.replace(/\\rho\b/g, "rho");
  text = text.replace(/\\tau\b/g, "tau");

  // Trigonometry & Logarithms
  text = text.replace(/\\sin\b/g, "sine of ");
  text = text.replace(/\\cos\b/g, "cosine of ");
  text = text.replace(/\\tan\b/g, "tangent of ");
  text = text.replace(/\\ln\b/g, "natural log of ");
  text = text.replace(/\\log_\{([^{}]+)\}/g, "log base $1 of ");
  text = text.replace(/\\log\b/g, "log of ");

  // Clean brackets and remaining LaTeX syntax
  text = text.replace(/\\(?:left|right)[()\[\]|.]/g, "");
  text = text.replace(/[{}\\]/g, " ");

  // Clean redundant parenthesis around simple tokens in fractions: e.g. (10) over (2) -> 10 over 2
  text = text.replace(/\(([a-zA-Z0-9.]+)\)\s+over\s+\(([a-zA-Z0-9.]+)\)/g, "$1 over $2");

  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/**
 * Convert raw LaTeX expression to spoken academic English
 */
export function mathToSpeech(latexOrMathML: string): string {
  const trimmed = latexOrMathML.trim();
  if (!trimmed) return "";

  // 1. Try Speech Rule Engine if ready
  if (sreInstance) {
    try {
      let mathml = trimmed;
      if (!trimmed.startsWith("<math")) {
        const rendered = katex.renderToString(trimmed, {
          output: "mathml",
          throwOnError: false,
        });
        const match = rendered.match(/<math[\s\S]*?<\/math>/);
        mathml = match ? match[0] : rendered;
      }

      const speech = sreInstance.toSpeech(mathml);
      if (speech && speech.trim()) {
        return cleanSpeechOutput(speech);
      }
    } catch {
      // Fall through to rule-based converter
    }
  }

  // 2. High-fidelity rule-based speech translator fallback (instant & $0)
  return fallbackLatexToSpeech(trimmed);
}

/**
 * Takes any mixed Markdown + LaTeX text from Boss AI or flashcards,
 * strips robotic greetings, converts all inline, block, and unwrapped math
 * to fluent spoken words, cleans markdown symbols, and produces conversational text.
 */
export function convertTextAndMathToSpeech(rawContent: string): string {
  if (!rawContent) return "";

  // 1. Strip robot greetings and AI titles
  let processed = stripRobotIntros(rawContent);

  // 2. Process display math blocks: $$ ... $$ or \[ ... \]
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    return ` ${mathToSpeech(math)} `;
  });
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    return ` ${mathToSpeech(math)} `;
  });

  // 3. Process inline math blocks: $ ... $ or \( ... \)
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    return ` ${mathToSpeech(math)} `;
  });
  processed = processed.replace(/\\\(([^\n]+?)\\\)/g, (_, math) => {
    return ` ${mathToSpeech(math)} `;
  });

  // 4. Translate any remaining unwrapped LaTeX commands or symbols in the body
  if (/[\\^_]/.test(processed)) {
    processed = fallbackLatexToSpeech(processed);
  }

  // 5. Remove Markdown decorations
  processed = processed
    .replace(/^#+\s+/gm, "") // headers
    .replace(/[*_~`]/g, "") // bold, italics, code, strikethrough
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/^\s*[-*+]\s+/gm, "") // bullets
    .replace(/^\s*\d+\.\s+/gm, "") // numbered lists
    .replace(/>\s*/g, "") // blockquotes
    .replace(/\s+/g, " ")
    .trim();

  return processed;
}

/**
 * Selects the highest quality natural human voice available on the user's platform
 * (Edge Natural, Google, Apple Neural/Enhanced) instead of robotic default voices.
 */
export function getBestNaturalVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // 1. Top tier: Modern Natural / Neural English voices
  const topTier = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.includes("Natural") ||
        v.name.includes("Online (Natural)") ||
        v.name.includes("Neural") ||
        v.name.includes("Google US English") ||
        v.name.includes("Google UK English Female") ||
        v.name.includes("Samantha (Enhanced)") ||
        v.name.includes("Alex") ||
        v.name.includes("Karen") ||
        v.name.includes("Daniel"))
  );
  if (topTier) return topTier;

  // 2. Google voices
  const googleVoice = voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en"));
  if (googleVoice) return googleVoice;

  // 3. Any en-US voice
  const usVoice = voices.find((v) => v.lang === "en-US" || v.lang === "en_US");
  if (usVoice) return usVoice;

  // 4. Any English voice
  const anyEn = voices.find((v) => v.lang.startsWith("en"));
  if (anyEn) return anyEn;

  // 5. Fallback
  return voices.find((v) => v.default) || voices[0] || null;
}
