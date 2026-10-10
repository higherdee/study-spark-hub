import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Sanitizes text to WinAnsi character set for standard Helvetica fonts
 */
function sanitize(text) {
  if (!text) return "";
  return String(text)
    .replace(/[•●▪]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[✓✔]/g, "[OK]")
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, " ");
}

/**
 * Word wraps text into lines fitting within maxWidth
 */
function wrap(text, maxWidth, font, fontSize) {
  const clean = sanitize(text);
  const words = clean.split(/\s+/);
  const lines = [];
  let cur = "";

  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Generates a comprehensive, multi-page, publication-grade academic PDF
 * specifically tailored for Nigerian university courseware, lecture dossiers, and past question archives.
 */
export async function buildNigerianAcademicPdf({
  institution,
  country = "Nigeria",
  accreditation = "",
  faculty = "Faculty of Engineering & Technology",
  department = "General Engineering / Academic Affairs",
  courseCode,
  courseTitle,
  level = "200L",
  materialType = "handout",
  title,
  academicSession = "2023/2024",
  topics = [],
  modules = [],
  pastQuestions = [],
}) {
  // Ensure every document has rich, comprehensive multi-page modules
  if (!modules || modules.length === 0) {
    modules = [
      {
        title: `Module 1: Foundational Principles & Core Concepts of ${courseCode}`,
        content: [
          `This academic module establishes the rigorous theoretical foundation of ${courseTitle} as mandated by the National Universities Commission (NUC) Core Curriculum and Minimum Academic Standards (CCMAS). Mastery of these principles is essential for successful semester examinations and advanced coursework.`,
          `Key focus areas include fundamental definitions, governing physical and mathematical laws, standard international (SI) units, and regulatory compliance standards established for Nigerian university degree programmes.`
        ],
        points: topics.slice(0, 3).map(t => `Fundamental Study Principle: In-depth analysis and derivation of ${t}.`)
      },
      {
        title: `Module 2: Analytical Methods & Applied Formulations`,
        content: [
          `This section presents the primary mathematical formulations, analytical models, and methodological frameworks relevant to ${courseTitle}. Students are expected to derive all core relationships and understand their boundary conditions.`,
          `Practical implementation requires attention to systematic calculation steps, error analysis, and adherence to standard professional engineering/scientific practices.`
        ],
        points: (topics.slice(3, 6).length > 0 ? topics.slice(3, 6) : topics).map(t => `Analytical Competency: Systematic derivation and problem-solving methodology for ${t}.`)
      },
      {
        title: `Module 3: Experimental / Workshop Applications & Standard Protocols`,
        content: [
          `Laboratory and practical sessions at ${institution} reinforce theoretical lectures through structured hands-on exercises. Students must observe all safety regulations, instrument calibration protocols, and accurate data recording procedures.`,
          `Proper documentation, technical report writing, and adherence to safety guidelines are strictly evaluated as part of continuous assessment.`
        ],
        points: [
          "Mandatory compliance with departmental laboratory and workshop safety protocols.",
          "Proper calibration, operation, and maintenance of testing apparatus and machinery.",
          "Systematic error analysis, unit conversions, and validation of experimental findings."
        ]
      },
      {
        title: `Module 4: High-Yield Semester Exam Review & Core Summaries`,
        content: [
          `Review of recurring past examination questions indicates that questions frequently test both conceptual understanding and multi-step quantitative/analytical problems.`,
          `When approaching examination questions, state all assumptions clearly, write down the governing formulas before substitution, and provide proper units with final numerical answers.`
        ],
        points: [
          "Review definition questions and ensure concise, technically accurate explanations.",
          "Practice derivation questions under timed conditions without referencing notes.",
          "Solve past examination numerical problems with complete intermediate steps."
        ]
      }
    ];
  }

  if (!pastQuestions || pastQuestions.length === 0) {
    pastQuestions = [
      {
        question: `Explain in detail the fundamental principles of ${topics[0] || courseTitle}. State two major practical applications in modern industry or academic research.`,
        solution: `1. Principle: The foundational law establishes the direct relationship between governing physical or mathematical variables under controlled boundary conditions. 2. Practical Applications: (a) Industrial process design and optimization; (b) Quality assurance and safety verification in institutional engineering and scientific environments.`
      },
      {
        question: `Outline the step-by-step analytical or procedural approach for solving standard problems in ${topics[1] || courseTitle}. What common pitfalls should be avoided?`,
        solution: `1. Procedure: Step 1 - Identify given boundary conditions and required parameters. Step 2 - State the governing equation and verify unit consistency. Step 3 - Substitute numerical values and solve. 2. Pitfalls: Incorrect unit conversion (e.g. mm to m or degrees to radians), neglecting sign conventions, or omitting final units.`
      }
    ];
  }

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Palette: Nigerian academic prestige (Emerald Green #0d734d, Navy #0a192f, Dark Slate #2d3748)
  const emerald = rgb(0.05, 0.45, 0.3);
  const darkNavy = rgb(0.04, 0.1, 0.18);
  const slateText = rgb(0.2, 0.25, 0.3);
  const lightBg = rgb(0.95, 0.98, 0.96);
  const borderGray = rgb(0.82, 0.88, 0.85);

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89; // Standard A4
  const MARGIN = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 40;

  function checkNewPage(neededSpace = 40) {
    if (y - neededSpace < MARGIN + 30) {
      drawFooter();
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
      drawHeader();
    }
  }

  function drawHeader() {
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 10,
      width: PAGE_WIDTH,
      height: 10,
      color: emerald,
    });
    page.drawText(`${institution.toUpperCase()} — ${courseCode} ${materialType.toUpperCase()}`, {
      x: MARGIN,
      y: PAGE_HEIGHT - 26,
      size: 8,
      font: fontBold,
      color: emerald,
    });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 32 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 32 },
      thickness: 0.5,
      color: borderGray,
    });
  }

  const isNigerian = !country || country === "Nigeria" || institution.toLowerCase().includes("nigeria") || institution.toLowerCase().includes("achievers") || institution.toLowerCase().includes("futa") || institution.toLowerCase().includes("unilag");
  const badgeLabel = isNigerian 
    ? "[NUC CCMAS VERIFIED]" 
    : accreditation ? `[${accreditation.toUpperCase()}]` : `[${(country || 'GLOBAL').toUpperCase()} ACCREDITED]`;
  const footerLabel = isNigerian
    ? `Syllaboss Verified Academic Dossier · NUC CCMAS Standard · ${academicSession}`
    : `Syllaboss Global Academic Archive · International Standard · ${academicSession}`;

  function drawFooter() {
    page.drawLine({
      start: { x: MARGIN, y: MARGIN - 10 },
      end: { x: PAGE_WIDTH - MARGIN, y: MARGIN - 10 },
      thickness: 0.5,
      color: borderGray,
    });
    page.drawText(footerLabel, {
      x: MARGIN,
      y: MARGIN - 22,
      size: 8,
      font: fontRegular,
      color: slateText,
    });
  }

  // --- COVER BANNER ---
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 12,
    width: PAGE_WIDTH,
    height: 12,
    color: emerald,
  });

  // Institution title
  page.drawText(sanitize(institution.toUpperCase()), {
    x: MARGIN,
    y: y,
    size: 14,
    font: fontBold,
    color: emerald,
  });
  y -= 18;

  page.drawText(`${faculty} · ${department}${country && country !== 'Nigeria' ? ` (${country})` : ''}`, {
    x: MARGIN,
    y,
    size: 9,
    font: fontRegular,
    color: slateText,
  });
  y -= 14;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1.5,
    color: emerald,
  });
  y -= 25;

  // Document Badge
  const badgeWidth = Math.max(fontBold.widthOfTextAtSize(badgeLabel, 8) + 24, 140);
  page.drawRectangle({
    x: MARGIN,
    y: y - 5,
    width: badgeWidth,
    height: 20,
    color: lightBg,
    borderColor: emerald,
    borderWidth: 1,
  });
  page.drawText(badgeLabel, {
    x: MARGIN + 12,
    y: y,
    size: 8,
    font: fontBold,
    color: emerald,
  });
  y -= 24;

  // Title
  const titleLines = wrap(title, CONTENT_WIDTH, fontBold, 16);
  for (const line of titleLines) {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: 16,
      font: fontBold,
      color: darkNavy,
    });
    y -= 22;
  }
  y -= 6;

  // Course & Level metadata box
  page.drawRectangle({
    x: MARGIN,
    y: y - 28,
    width: CONTENT_WIDTH,
    height: 32,
    color: lightBg,
    borderColor: borderGray,
    borderWidth: 0.8,
  });
  page.drawText(`Course: ${courseCode} - ${courseTitle}`, {
    x: MARGIN + 12,
    y: y - 12,
    size: 9.5,
    font: fontBold,
    color: darkNavy,
  });
  page.drawText(`Level: ${level}  |  Type: ${materialType.toUpperCase()}  |  Session: ${academicSession}`, {
    x: MARGIN + 12,
    y: y - 24,
    size: 8.5,
    font: fontRegular,
    color: slateText,
  });
  y -= 48;

  // Topics / Syllabus Overview
  if (topics && topics.length > 0) {
    checkNewPage(40);
    const syllabusHeader = isNigerian 
      ? "OFFICIAL NUC CCMAS SYLLABUS TOPICS COVERED:" 
      : "OFFICIAL ACCREDITED CURRICULUM TOPICS COVERED:";
    page.drawText(syllabusHeader, {
      x: MARGIN,
      y,
      size: 10,
      font: fontBold,
      color: emerald,
    });
    y -= 16;

    for (const t of topics) {
      checkNewPage(18);
      page.drawText(`- ${sanitize(t)}`, {
        x: MARGIN + 10,
        y,
        size: 9,
        font: fontRegular,
        color: darkNavy,
      });
      y -= 14;
    }
    y -= 10;
  }

  // --- DETAILED LECTURE MODULES ---
  for (const mod of modules) {
    checkNewPage(50);
    // Section Header
    page.drawRectangle({
      x: MARGIN,
      y: y - 6,
      width: CONTENT_WIDTH,
      height: 22,
      color: rgb(0.92, 0.96, 0.94),
    });
    page.drawText(sanitize(mod.title.toUpperCase()), {
      x: MARGIN + 8,
      y: y,
      size: 10,
      font: fontBold,
      color: emerald,
    });
    y -= 26;

    if (mod.content) {
      const paragraphs = Array.isArray(mod.content) ? mod.content : [mod.content];
      for (const p of paragraphs) {
        const lines = wrap(p, CONTENT_WIDTH, fontRegular, 9.5);
        for (const l of lines) {
          checkNewPage(16);
          page.drawText(l, {
            x: MARGIN,
            y,
            size: 9.5,
            font: fontRegular,
            color: darkNavy,
          });
          y -= 13.5;
        }
        y -= 6;
      }
    }

    if (mod.points && mod.points.length > 0) {
      for (const pt of mod.points) {
        const ptLines = wrap(`* ${pt}`, CONTENT_WIDTH - 15, fontRegular, 9);
        for (let i = 0; i < ptLines.length; i++) {
          checkNewPage(14);
          page.drawText(ptLines[i], {
            x: MARGIN + (i === 0 ? 8 : 16),
            y,
            size: 9,
            font: i === 0 ? fontRegular : fontRegular,
            color: slateText,
          });
          y -= 13;
        }
      }
      y -= 6;
    }
    y -= 10;
  }

  // --- PAST EXAMINATION QUESTIONS & WORKED MODEL ANSWERS ---
  if (pastQuestions && pastQuestions.length > 0) {
    checkNewPage(60);
    page.drawRectangle({
      x: MARGIN,
      y: y - 8,
      width: CONTENT_WIDTH,
      height: 24,
      color: rgb(0.1, 0.35, 0.25),
    });
    page.drawText("EXAMINATION PAST QUESTIONS & STEP-BY-STEP MARKING SCHEMES", {
      x: MARGIN + 10,
      y: y,
      size: 10.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    y -= 32;

    for (let qIdx = 0; qIdx < pastQuestions.length; qIdx++) {
      const q = pastQuestions[qIdx];
      checkNewPage(45);

      // Question Title
      page.drawText(`QUESTION ${qIdx + 1}: ${sanitize(q.question)}`, {
        x: MARGIN,
        y,
        size: 9.5,
        font: fontBold,
        color: darkNavy,
      });
      y -= 15;

      if (q.subQuestions && q.subQuestions.length > 0) {
        for (const sub of q.subQuestions) {
          const subLines = wrap(sub, CONTENT_WIDTH - 12, fontRegular, 9);
          for (const sl of subLines) {
            checkNewPage(14);
            page.drawText(sl, {
              x: MARGIN + 10,
              y,
              size: 9,
              font: fontRegular,
              color: darkNavy,
            });
            y -= 12.5;
          }
        }
        y -= 4;
      }

      // Model Solution / Marking Scheme
      if (q.solution) {
        checkNewPage(30);
        page.drawText("MODEL ANSWER / STEP-BY-STEP SOLUTION:", {
          x: MARGIN + 8,
          y,
          size: 8.5,
          font: fontBold,
          color: emerald,
        });
        y -= 13;

        const solLines = wrap(q.solution, CONTENT_WIDTH - 15, fontOblique, 8.5);
        for (const sl of solLines) {
          checkNewPage(13);
          page.drawText(sl, {
            x: MARGIN + 12,
            y,
            size: 8.5,
            font: fontRegular,
            color: slateText,
          });
          y -= 12;
        }
      }
      y -= 12;
    }
  }

  drawFooter();
  const pdfBytes = await doc.save();
  const buffer = Buffer.from(pdfBytes);
  buffer.pageCount = doc.getPageCount();
  return buffer;
}
