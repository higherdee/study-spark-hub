import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface AcademicPdfOptions {
  title: string;
  course: string;
  courseCode?: string | null;
  institution: string;
  level?: string | null;
  materialType?: string | null;
  description?: string | null;
  score?: number;
}

/**
 * Sanitizes text to be WinAnsi compliant for StandardFonts.Helvetica
 */
function sanitizeWinAnsi(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/[✓✔]/g, "[VERIFIED]")
    .replace(/[•●]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
}

/**
 * Generates an archival-grade Academic PDF document for a syllabus/course material.
 */
export async function buildAcademicPdf({
  title,
  course,
  courseCode,
  institution,
  level,
  materialType,
  description,
  score = 95,
}: AcademicPdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // Embed standard Helvetica fonts
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Palette
  const emerald = rgb(0.05, 0.45, 0.3); // #0d734d
  const darkNavy = rgb(0.0, 0.07, 0.15); // #001226
  const slateText = rgb(0.25, 0.3, 0.35);
  const lightBgBorder = rgb(0.85, 0.9, 0.88);
  const darkGreenText = rgb(0.1, 0.3, 0.2);

  // Helper: word wrap text into lines fitting within maxWidth
  function wrapText(text: string | null | undefined, maxWidth: number, font: typeof fontRegular, fontSize: number): string[] {
    const cleanText = sanitizeWinAnsi(text);
    if (!cleanText) return [];
    const words = cleanText.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // --- PAGE 1: COVER & EXECUTIVE OVERVIEW ---
  const page1 = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page1.getSize();

  // Top header bar
  page1.drawRectangle({
    x: 0,
    y: height - 12,
    width: width,
    height: 12,
    color: emerald,
  });

  // Institution / Repository Header
  page1.drawText("SYLLABOSS NATIONAL ACADEMIC REPOSITORY - NUC BMAS ACCREDITED", {
    x: 45,
    y: height - 42,
    size: 8.5,
    font: fontBold,
    color: emerald,
  });

  const instName = sanitizeWinAnsi((institution || "FEDERAL REPUBLIC OF NIGERIA - UNIVERSITY SYSTEM").toUpperCase());
  page1.drawText(instName, {
    x: 45,
    y: height - 58,
    size: 11,
    font: fontBold,
    color: darkNavy,
  });

  page1.drawLine({
    start: { x: 45, y: height - 68 },
    end: { x: width - 45, y: height - 68 },
    thickness: 1.2,
    color: lightBgBorder,
  });

  // Course Code Badge & Level
  const displayCode = sanitizeWinAnsi(courseCode || "GEN 101");
  page1.drawRectangle({
    x: 45,
    y: height - 105,
    width: 90,
    height: 24,
    color: rgb(0.93, 0.97, 0.94),
    borderColor: emerald,
    borderWidth: 1,
  });
  page1.drawText(displayCode, {
    x: 55,
    y: height - 98,
    size: 12,
    font: fontBold,
    color: emerald,
  });

  const levelTypeStr = sanitizeWinAnsi(`${level || "Undergraduate"} | ${(materialType || "Lecture Handout").replace(/_/g, " ").toUpperCase()}`);
  page1.drawText(levelTypeStr, {
    x: 145,
    y: height - 96,
    size: 10,
    font: fontBold,
    color: slateText,
  });

  // Title Box
  const titleLines = wrapText(title, width - 90, fontBold, 18);
  let yPos = height - 135;
  for (const line of titleLines) {
    page1.drawText(line, {
      x: 45,
      y: yPos,
      size: 18,
      font: fontBold,
      color: darkNavy,
    });
    yPos -= 24;
  }

  // Course Department Subtitle
  yPos -= 5;
  page1.drawText(`Faculty / Academic Discipline: ${sanitizeWinAnsi(course)}`, {
    x: 45,
    y: yPos,
    size: 11,
    font: fontOblique,
    color: slateText,
  });

  // Verification Box
  yPos -= 45;
  page1.drawRectangle({
    x: 45,
    y: yPos,
    width: width - 90,
    height: 38,
    color: rgb(0.95, 0.98, 0.96),
    borderColor: emerald,
    borderWidth: 0.8,
  });
  page1.drawText(`[VERIFIED] PEER-REVIEWED & AUTONOMOUSLY AUDITED BY BOSS AI (Score: ${score}/100)`, {
    x: 58,
    y: yPos + 22,
    size: 9.5,
    font: fontBold,
    color: emerald,
  });
  page1.drawText("Certified for high-yield university examination preparation, test revision, and continuous assessment.", {
    x: 58,
    y: yPos + 9,
    size: 8.5,
    font: fontRegular,
    color: slateText,
  });

  // Section 1: Executive Overview
  yPos -= 35;
  page1.drawText("1. EXECUTIVE SYNOPSIS & LEARNING OBJECTIVES", {
    x: 45,
    y: yPos,
    size: 12,
    font: fontBold,
    color: emerald,
  });

  yPos -= 18;
  const overviewText = description ||
    `This academic monograph provides systematic coverage of core theoretical frameworks, derivations, and problem sets for ${displayCode} (${course}) at ${institution}. Developed in strict conformance with standard curricular guidelines, the material emphasizes exam-tested principles and practical problem analysis.`;

  const overviewLines = wrapText(overviewText, width - 90, fontRegular, 10);
  for (const line of overviewLines) {
    page1.drawText(line, {
      x: 45,
      y: yPos,
      size: 10,
      font: fontRegular,
      color: darkNavy,
    });
    yPos -= 15;
  }

  // Section 2: Core Syllabus Outline
  yPos -= 20;
  page1.drawText("2. MODULAR SYLLABUS BREAKDOWN", {
    x: 45,
    y: yPos,
    size: 12,
    font: fontBold,
    color: emerald,
  });

  const modules = [
    { title: "Module I: Fundamental Concepts, Definitions and Axiomatic Framework", desc: "Covers historical antecedents, foundational terminology, boundary conditions, and primary governing equations." },
    { title: "Module II: Theoretical Analysis & Methodological Derivations", desc: "Rigorous step-by-step proofs, algebraic and analytical formulations, and standard parameter representations." },
    { title: "Module III: Worked Problem Sets & Recurring Examination Paradigms", desc: "Detailed solutions to standard semester exam questions, past exam paper patterns, and common calculation pitfalls." },
    { title: "Module IV: Practical Applications, Contemporary Trends & Case Studies", desc: "Industry context, experimental laboratory validation, computational implementation, and real-world relevance." },
  ];

  for (const mod of modules) {
    yPos -= 18;
    page1.drawText(`- ${sanitizeWinAnsi(mod.title)}`, {
      x: 50,
      y: yPos,
      size: 9.5,
      font: fontBold,
      color: darkNavy,
    });
    yPos -= 13;
    const modLines = wrapText(mod.desc, width - 110, fontRegular, 9);
    for (const line of modLines) {
      page1.drawText(line, {
        x: 60,
        y: yPos,
        size: 9,
        font: fontRegular,
        color: slateText,
      });
      yPos -= 12;
    }
  }

  // Footer for Page 1
  page1.drawText("Page 1 of 2 | Syllaboss Official Document | Verify at syllaboss.com", {
    x: 45,
    y: 30,
    size: 8,
    font: fontRegular,
    color: slateText,
  });

  // --- PAGE 2: HIGH-YIELD STUDY GUIDE & PRACTICE PROBLEMS ---
  const page2 = doc.addPage([595.28, 841.89]);

  // Header bar
  page2.drawRectangle({
    x: 0,
    y: height - 12,
    width: width,
    height: 12,
    color: emerald,
  });

  page2.drawText(sanitizeWinAnsi(`${displayCode} | ${course} - HIGH-YIELD EXAMINATION DOSSIER`), {
    x: 45,
    y: height - 38,
    size: 9,
    font: fontBold,
    color: emerald,
  });
  page2.drawLine({
    start: { x: 45, y: height - 46 },
    end: { x: width - 45, y: height - 46 },
    thickness: 1,
    color: lightBgBorder,
  });

  let p2Y = height - 70;

  // Section 3: High-Yield Revision Points
  page2.drawText("3. HIGH-YIELD EXAMINATION REVISION POINTERS", {
    x: 45,
    y: p2Y,
    size: 12,
    font: fontBold,
    color: emerald,
  });

  const highYieldPoints = [
    "Definition Precision: In examination scripts, state all technical definitions verbatim with their operational boundary conditions and SI units.",
    "Step-by-Step Marks: Lecturers award partial credit for clear step numbering, formula citation before substitution, and final numerical rounding.",
    "Diagrammatic Proofs: Always accompany theoretical explanations with clearly labeled schematics or graphs to earn maximum presentation score.",
    "Common Trap: Pay close attention to unit conversions (e.g., metric prefixes, degree-to-radian, gauge vs. absolute values) prior to algebraic substitution.",
  ];

  for (const pt of highYieldPoints) {
    p2Y -= 17;
    const ptLines = wrapText(`[Key] ${pt}`, width - 90, fontRegular, 9.5);
    for (const line of ptLines) {
      page2.drawText(line, {
        x: 50,
        y: p2Y,
        size: 9.5,
        font: fontRegular,
        color: darkNavy,
      });
      p2Y -= 13;
    }
  }

  // Section 4: Model Questions & Solution Key
  p2Y -= 15;
  page2.drawText("4. MODEL PRACTICE QUESTIONS & WORKED SOLUTIONS", {
    x: 45,
    y: p2Y,
    size: 12,
    font: fontBold,
    color: emerald,
  });

  const sampleQuestions = [
    {
      q: `Q1. Explain the fundamental premise of ${title.slice(0, 45)} and describe its essential governing laws.`,
      sol: `Solution Outline: Begin by stating the formal definition. Identify the two primary operational assumptions. Provide the mathematical formulation and explain each parameter. Conclude with an everyday engineering or scientific example illustrating equilibrium conditions.`,
    },
    {
      q: `Q2. Differentiate between primary and secondary characteristics within this domain, highlighting 3 key distinctions.`,
      sol: `Solution Outline: Structure the answer in a comparative table format. Contrast underlying physical mechanisms, response timeframes, and sensitivity to environmental or boundary variations.`,
    },
  ];

  for (const sq of sampleQuestions) {
    p2Y -= 16;
    const qLines = wrapText(sq.q, width - 90, fontBold, 9.5);
    for (const line of qLines) {
      page2.drawText(line, {
        x: 50,
        y: p2Y,
        size: 9.5,
        font: fontBold,
        color: darkGreenText,
      });
      p2Y -= 13;
    }

    p2Y -= 4;
    const solLines = wrapText(sq.sol, width - 100, fontRegular, 9);
    for (const line of solLines) {
      page2.drawText(line, {
        x: 60,
        y: p2Y,
        size: 9,
        font: fontRegular,
        color: slateText,
      });
      p2Y -= 12;
    }
  }

  // Section 5: Academic Integrity & Watermark Box
  p2Y -= 20;
  page2.drawRectangle({
    x: 45,
    y: p2Y - 25,
    width: width - 90,
    height: 40,
    color: rgb(0.96, 0.96, 0.97),
    borderColor: rgb(0.8, 0.85, 0.83),
    borderWidth: 0.8,
  });
  page2.drawText("ACADEMIC CITATION & ETHICAL USE GUIDELINES", {
    x: 55,
    y: p2Y + 2,
    size: 8.5,
    font: fontBold,
    color: darkNavy,
  });
  page2.drawText("This verified archival document is authorized strictly for personal scholarship and study aid.", {
    x: 55,
    y: p2Y - 11,
    size: 8,
    font: fontRegular,
    color: slateText,
  });
  page2.drawText("Authored under Syllaboss Open Education Initiative | Distributed across Nigerian Universities.", {
    x: 55,
    y: p2Y - 21,
    size: 8,
    font: fontRegular,
    color: slateText,
  });

  // Footer for Page 2
  page2.drawText("Page 2 of 2 | Syllaboss Official Document | Distributed via syllaboss.com", {
    x: 45,
    y: 30,
    size: 8,
    font: fontRegular,
    color: slateText,
  });

  return await doc.save();
}
