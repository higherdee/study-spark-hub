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
 * Convert raw LaTeX expression to spoken academic English
 */
export function mathToSpeech(latexOrMathML: string): string {
  const trimmed = latexOrMathML.trim();
  if (!trimmed) return "";

  // 1. Try Speech Rule Engine if ready
  if (sreInstance) {
    try {
      let mathml = trimmed;
      // If it looks like LaTeX (starts with \ or doesn't have <math>), convert with KaTeX first
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
 * Format SRE speech output into conversational spoken words
 */
function cleanSpeechOutput(speech: string): string {
  return speech
    .replace(/\bStartFraction\b/gi, "fraction")
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

  // Fractions: \frac{a}{b} -> "a over b"
  text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "the fraction with numerator $1 and denominator $2");
  text = text.replace(/\\dfrac\{([^{}]+)\}\{([^{}]+)\}/g, "the fraction with numerator $1 and denominator $2");

  // Roots: \sqrt{x} -> "square root of x", \sqrt[n]{x} -> "nth root of x"
  text = text.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, "the $1th root of $2");
  text = text.replace(/\\sqrt\{([^{}]+)\}/g, "square root of $1");

  // Exponents and powers
  text = text.replace(/\^2\b|\^\{2\}/g, " squared");
  text = text.replace(/\^3\b|\^\{3\}/g, " cubed");
  text = text.replace(/\^\{([^{}]+)\}/g, " to the power of $1");
  text = text.replace(/\^([a-zA-Z0-9])/g, " to the power of $1");

  // Subscripts: x_1 -> "x sub 1", x_{initial} -> "x sub initial"
  text = text.replace(/_\{([^{}]+)\}/g, " sub $1");
  text = text.replace(/_([a-zA-Z0-9])/g, " sub $1");

  // Common mathematical operations & relations
  text = text.replace(/\\pm\b/g, " plus or minus ");
  text = text.replace(/\\mp\b/g, " minus or plus ");
  text = text.replace(/\\times\b/g, " times ");
  text = text.replace(/\\div\b/g, " divided by ");
  text = text.replace(/\\cdot\b/g, " dot ");
  text = text.replace(/\\neq\b/g, " is not equal to ");
  text = text.replace(/\\leq\b/g, " is less than or equal to ");
  text = text.replace(/\\geq\b/g, " is greater than or equal to ");
  text = text.replace(/\\approx\b/g, " is approximately equal to ");
  text = text.replace(/\\equiv\b/g, " is equivalent to ");
  text = text.replace(/\\propto\b/g, " is proportional to ");
  text = text.replace(/\\infty\b/g, " infinity ");
  text = text.replace(/\\to\b|\\rightarrow\b/g, " approaches ");
  text = text.replace(/\\leftarrow\b/g, " from ");

  // Calculus & advanced STEM
  text = text.replace(/\\int_\{([^{}]+)\}\^\{([^{}]+)\}/g, "integral from $1 to $2 of ");
  text = text.replace(/\\int\b/g, "integral of ");
  text = text.replace(/\\sum_\{([^{}]+)\}\^\{([^{}]+)\}/g, "sum from $1 to $2 of ");
  text = text.replace(/\\sum\b/g, "summation of ");
  text = text.replace(/\\prod\b/g, "product of ");
  text = text.replace(/\\partial\b/g, "partial derivative of ");
  text = text.replace(/\\lim_\{([^{}]+)\}/g, "limit as $1 ");

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

  // Trigonometry & Logarithms
  text = text.replace(/\\sin\b/g, "sine of ");
  text = text.replace(/\\cos\b/g, "cosine of ");
  text = text.replace(/\\tan\b/g, "tangent of ");
  text = text.replace(/\\ln\b/g, "natural log of ");
  text = text.replace(/\\log_\{([^{}]+)\}/g, "log base $1 of ");
  text = text.replace(/\\log\b/g, "log of ");

  // Clean remaining LaTeX syntax
  text = text.replace(/\\(?:left|right)[()\[\]|.]/g, "");
  text = text.replace(/\\(?:text|mathrm|mathbf)\{([^{}]+)\}/g, " $1 ");
  text = text.replace(/[{}\\]/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Takes any mixed Markdown + LaTeX text from Boss AI or flashcards,
 * converts all inline and display math to spoken words, cleans markdown,
 * and produces conversational text ready for SpeechSynthesisUtterance.
 */
export function convertTextAndMathToSpeech(rawContent: string): string {
  if (!rawContent) return "";

  let processed = rawContent;

  // 1. Process display math blocks: $$ ... $$ or \[ ... \]
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    return ` ${mathToSpeech(math)} `;
  });
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    return ` ${mathToSpeech(math)} `;
  });

  // 2. Process inline math blocks: $ ... $ or \( ... \)
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    return ` ${mathToSpeech(math)} `;
  });
  processed = processed.replace(/\\\(([^\n]+?)\\\)/g, (_, math) => {
    return ` ${mathToSpeech(math)} `;
  });

  // 3. Remove Markdown decorations
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
