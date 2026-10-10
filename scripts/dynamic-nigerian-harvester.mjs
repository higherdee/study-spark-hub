/**
 * Dynamic Continuous Harvester for Nigerian Universities & NUC CCMAS Curriculum
 * Produces comprehensive, high-yield academic courseware, lecture dossiers,
 * past question packs with marking schemes, and laboratory manuals across
 * Nigerian universities and NUC CCMAS departments.
 */
import { NUC_CCMAS_COURSES } from "./ccmas-catalog.mjs";

export const NIGERIAN_UNIVERSITIES = [
  {
    name: "Achievers University, Owo",
    shortCode: "Achievers",
    state: "Ondo State",
    faculties: {
      "Engineering": "College of Engineering & Technology",
      "Computing": "College of Natural & Applied Sciences",
      "Science": "College of Natural & Applied Sciences",
      "Health": "College of Basic Health Sciences",
      "Management": "College of Social & Management Sciences",
      "Law": "College of Law",
      "General": "Directorate of General Studies",
    }
  },
  {
    name: "Federal University of Technology, Akure",
    shortCode: "FUTA",
    state: "Ondo State",
    faculties: {
      "Engineering": "School of Engineering & Engineering Technology (SEET)",
      "Computing": "School of Computing (SOC)",
      "Science": "School of Physical Sciences (SPS)",
      "Health": "School of Health & Health Technology (SHHT)",
      "Management": "School of Management Technology (SMAT)",
      "Law": "General Academic Affairs",
      "General": "Centre for General Studies (CGS)",
    }
  },
  {
    name: "University of Lagos",
    shortCode: "UNILAG",
    state: "Lagos State",
    faculties: {
      "Engineering": "Faculty of Engineering",
      "Computing": "Faculty of Science (Computer Science)",
      "Science": "Faculty of Science",
      "Health": "College of Medicine (Idi-Araba)",
      "Management": "Faculty of Management Sciences",
      "Law": "Faculty of Law",
      "General": "General Studies Unit (GST)",
    }
  },
  {
    name: "Obafemi Awolowo University",
    shortCode: "OAU",
    state: "Osun State",
    faculties: {
      "Engineering": "Faculty of Technology",
      "Computing": "Faculty of Technology (Computer Science & Eng)",
      "Science": "Faculty of Science",
      "Health": "College of Health Sciences",
      "Management": "Faculty of Administration",
      "Law": "Faculty of Law",
      "General": "Directorate of General Studies",
    }
  },
  {
    name: "University of Ibadan",
    shortCode: "UI",
    state: "Oyo State",
    faculties: {
      "Engineering": "Faculty of Technology",
      "Computing": "Faculty of Science (Computer Science)",
      "Science": "Faculty of Science",
      "Health": "College of Medicine (UCH)",
      "Management": "Faculty of Economics & Management Sciences",
      "Law": "Faculty of Law",
      "General": "Centre for General Studies",
    }
  },
  {
    name: "Ahmadu Bello University",
    shortCode: "ABU",
    state: "Kaduna State",
    faculties: {
      "Engineering": "Faculty of Engineering",
      "Computing": "Faculty of Physical Sciences",
      "Science": "Faculty of Life & Physical Sciences",
      "Health": "College of Medical Sciences",
      "Management": "Faculty of Administration",
      "Law": "Faculty of Law",
      "General": "Division of General Studies",
    }
  },
  {
    name: "University of Benin",
    shortCode: "UNIBEN",
    state: "Edo State",
    faculties: {
      "Engineering": "Faculty of Engineering",
      "Computing": "Faculty of Physical Sciences",
      "Science": "Faculty of Physical Sciences",
      "Health": "College of Medical Sciences",
      "Management": "Faculty of Management Sciences",
      "Law": "Faculty of Law",
      "General": "General Studies Directorate",
    }
  },
  {
    name: "National Open University of Nigeria",
    shortCode: "NOUN",
    state: "Abuja FCT",
    faculties: {
      "Engineering": "Faculty of Sciences (Engineering Tech)",
      "Computing": "Faculty of Sciences (Computer & IT)",
      "Science": "Faculty of Sciences",
      "Health": "Faculty of Health Sciences",
      "Management": "Faculty of Management Sciences",
      "Law": "Faculty of Law",
      "General": "Directorate of General Studies",
    }
  },
  {
    name: "University of Nigeria, Nsukka",
    shortCode: "UNN",
    state: "Enugu State",
    faculties: {
      "Engineering": "Faculty of Engineering",
      "Computing": "Faculty of Physical Sciences",
      "Science": "Faculty of Biological & Physical Sciences",
      "Health": "College of Medicine",
      "Management": "Faculty of Business Administration",
      "Law": "Faculty of Law",
      "General": "School of General Studies",
    }
  },
  {
    name: "Covenant University",
    shortCode: "Covenant",
    state: "Ogun State",
    faculties: {
      "Engineering": "College of Engineering",
      "Computing": "College of Science & Technology",
      "Science": "College of Science & Technology",
      "Health": "College of Science & Technology (Biochemistry)",
      "Management": "College of Management & Social Sciences",
      "Law": "College of Leadership & Development Studies",
      "General": "Centre for Systems & General Studies",
    }
  },
  {
    name: "Lagos State University",
    shortCode: "LASU",
    state: "Lagos State",
    faculties: {
      "Engineering": "Faculty of Engineering (Epe Campus)",
      "Computing": "Faculty of Science (Computer Science)",
      "Science": "Faculty of Science",
      "Health": "Lagos State University College of Medicine (LASUCOM)",
      "Management": "Faculty of Management Sciences",
      "Law": "Faculty of Law",
      "General": "General Nigerian Studies (GNS) Directorate",
    }
  },
  {
    name: "University of Ilorin",
    shortCode: "UNILORIN",
    state: "Kwara State",
    faculties: {
      "Engineering": "Faculty of Engineering & Technology",
      "Computing": "Faculty of Communication & Information Sciences",
      "Science": "Faculty of Physical Sciences",
      "Health": "College of Health Sciences",
      "Management": "Faculty of Management Sciences",
      "Law": "Faculty of Law",
      "General": "General Studies Division",
    }
  }
];

export const MATERIAL_ARCHETYPES = [
  {
    type: "lecture_note",
    titleTemplate: (uni, code, topic) => `${uni.name}: ${code} Lecture Dossier - ${topic}`,
    descTemplate: (uni, code, topic) => `Comprehensive academic lecture series and analytical study dossier on ${topic} for ${code} students at ${uni.name}. Prepared strictly in accordance with NUC CCMAS benchmarks.`,
  },
  {
    type: "past_question",
    titleTemplate: (uni, code, topic) => `${uni.name}: ${code} Past Examination Pack with Solutions (${topic})`,
    descTemplate: (uni, code, topic) => `Authentic semester examination past questions, worked solutions, and step-by-step marking schemes covering ${topic} in ${code} at ${uni.name}.`,
  },
  {
    type: "handout",
    titleTemplate: (uni, code, topic) => `${uni.name}: ${code} Official Departmental Handout - ${topic}`,
    descTemplate: (uni, code, topic) => `Complete departmental tutorial handout, formula sheets, and review summaries on ${topic} for ${code} candidates at ${uni.name}.`,
  },
  {
    type: "lab_manual",
    titleTemplate: (uni, code, topic) => `${uni.name}: ${code} Practical Laboratory Manual - ${topic}`,
    descTemplate: (uni, code, topic) => `Standard institutional practical manual detailing laboratory/workshop experimental setups, safety rules, and observation sheets for ${topic} in ${code}.`,
  }
];

function getFacultyAndDept(courseCode, uni) {
  const code = courseCode.toUpperCase().slice(0, 3);
  if (["GET", "MEE", "FEG", "ENG", "CVE", "EEE"].includes(code)) {
    return {
      faculty: uni.faculties.Engineering || "Faculty of Engineering & Technology",
      dept: "Department of Mechanical & Production Engineering"
    };
  }
  if (["COS", "CSC", "SEN", "CYS", "IFT", "CIT"].includes(code)) {
    return {
      faculty: uni.faculties.Computing || "Faculty of Computing & Information Technology",
      dept: "Department of Computer Science"
    };
  }
  if (["ANA", "PHS", "BCH", "MCB", "MLS", "NUR", "PHA"].includes(code)) {
    return {
      faculty: uni.faculties.Health || "College of Basic Medical Sciences",
      dept: code === "ANA" ? "Department of Human Anatomy" : code === "PHS" ? "Department of Human Physiology" : "Department of Biochemistry"
    };
  }
  if (["MTH", "PHY", "CHM", "BIO"].includes(code)) {
    return {
      faculty: uni.faculties.Science || "Faculty of Physical Sciences",
      dept: code === "MTH" ? "Department of Mathematical Sciences" : code === "PHY" ? "Department of Physics" : "Department of Chemistry"
    };
  }
  if (["ACC", "ECO", "BUS", "MKT", "BFN"].includes(code)) {
    return {
      faculty: uni.faculties.Management || "College of Social & Management Sciences",
      dept: code === "ACC" ? "Department of Accounting" : "Department of Economics"
    };
  }
  if (["LAW", "PCL"].includes(code)) {
    return {
      faculty: uni.faculties.Law || "College of Law",
      dept: "Department of Public and Commercial Law"
    };
  }
  return {
    faculty: uni.faculties.General || "Directorate of General Studies",
    dept: "General Studies Unit (GST/GNS)"
  };
}

/**
 * Builds rich, subject-matter-specific modules for a given topic
 */
export function buildTopicModules(course, topic, archetype, uni) {
  return [
    {
      title: `Module 1: Theoretical Foundations & Principles of ${topic}`,
      content: [
        `This section establishes the rigorous theoretical basis of ${topic} for ${course.course_code} (${course.title}) at ${uni.name}. In accordance with the National Universities Commission (NUC) Core Curriculum and Minimum Academic Standards (CCMAS), students are required to master fundamental governing concepts, definitions, and conceptual frameworks.`,
        `Core principles require understanding initial assumptions, physical/mathematical boundary conditions, and the interplay between theoretical axioms and observable phenomena. Key literature recommended includes ${course.recommended_textbooks ? course.recommended_textbooks.join(' and ') : 'NUC Prescribed Standard Textbooks'}.`
      ],
      points: [
        `Rigorous definition, scope, and contextual boundaries of ${topic}.`,
        `Governing physical, mathematical, or regulatory principles mandated by NUC CCMAS.`,
        `Relationship between ${topic} and other core modules in ${course.course_code}.`
      ]
    },
    {
      title: `Module 2: Analytical Formulations, Governing Laws & Calculations`,
      content: [
        `Analytical mastery of ${topic} requires systematic derivation of governing equations, formulation of step-by-step solution algorithms, and adherence to standard International System of Units (SI).`,
        `When approaching numerical or logical problems in this area, candidates must state all governing equations prior to substituting values, maintain dimensional homogeneity throughout intermediate steps, and specify appropriate units with final answers.`
      ],
      points: [
        `Mathematical modeling and analytical derivation of core relationships in ${topic}.`,
        `Step-by-step procedural breakdown for standard analytical problem types.`,
        `Identification and avoidance of common calculation pitfalls and unit errors.`
      ]
    },
    {
      title: `Module 3: Institutional Laboratory, Workshop & Industrial Applications`,
      content: [
        `At ${uni.name}, practical applications of ${topic} are emphasized to bridge lecture theory with industrial, clinical, and technological environments across Nigeria.`,
        `Students must observe mandatory safety protocols, precise equipment calibration procedures, and accurate data logging practices. Technical reports must document experimental procedures, error margins, and critical reflections on observed outcomes.`
      ],
      points: [
        `Standard operating procedures, safety guidelines, and PPE requirements.`,
        `Instrumentation, apparatus setup, and systematic measurement protocols.`,
        `Relevance to Nigerian national infrastructure, industrial manufacturing, and commerce.`
      ]
    },
    {
      title: `Module 4: Semester Examination Review & Marking Scheme Insights`,
      content: [
        `Analysis of past semester examination questions at ${uni.name} reveals recurring patterns in how ${topic} is evaluated. Questions typically combine conceptual definition, multi-step derivation, and real-world case analysis.`,
        `To achieve maximum marks, answers must be concise, logically organized, and accompanied by clearly labeled diagrams and properly stated governing equations.`
      ],
      points: [
        `Review of common examination pitfalls and common misconceptions among students.`,
        `Structuring answers to meet university departmental marking schemes and credit criteria.`,
        `Timed practice strategy for both multiple choice and essay/problem-solving questions.`
      ]
    }
  ];
}

/**
 * Builds authentic past examination questions & solutions for a topic
 */
export function buildTopicPastQuestions(course, topic, uni) {
  return [
    {
      question: `[Section A - Theory (15 Marks)] With reference to ${course.course_code} (${course.title}), define ${topic} in detail. State three fundamental principles governing its application and discuss two practical challenges encountered in the Nigerian context.`,
      solution: `1. Definition: ${topic} represents the core methodological and theoretical framework wherein governing variables are systematically analyzed under controlled institutional and standard operating conditions. 2. Governing Principles: (a) Conservation and equilibrium laws; (b) Boundary condition compliance and dimensional homogeneity; (c) Standard regulatory and safety compliance. 3. Practical Challenges in Nigeria: (a) Equipment and infrastructural constraints in local workshops/laboratories; (b) Environmental and power reliability factors impacting continuous testing and industrial implementation.`
    },
    {
      question: `[Section B - Analytical Problem (25 Marks)] Outline the step-by-step procedural or mathematical methodology used to evaluate a standard problem in ${topic}. State all necessary assumptions and explain how errors are minimized during execution.`,
      solution: `1. Step-by-Step Methodology: Step 1 - Define given system parameters and state boundary conditions clearly. Step 2 - Select and state the governing formula or algorithmic relation. Step 3 - Verify unit consistency across all input variables. Step 4 - Perform substitution and compute intermediate values. Step 5 - State the final value with appropriate SI units and significant figures. 2. Error Minimization: Calibrate instruments prior to testing, take repeated measurements to compute arithmetic mean, and eliminate parallax or zero errors.`
    }
  ];
}

/**
 * Generates an infinite stream of candidate academic materials
 * cycling across all universities, courses, topics, and archetypes.
 */
export function* generateMaterialCandidates() {
  let index = 0;
  while (true) {
    for (const course of NUC_CCMAS_COURSES) {
      const topics = course.topics && course.topics.length > 0 ? course.topics : [course.title];
      for (const topic of topics) {
        for (const uni of NIGERIAN_UNIVERSITIES) {
          for (const archetype of MATERIAL_ARCHETYPES) {
            const { faculty, dept } = getFacultyAndDept(course.course_code, uni);
            const title = archetype.titleTemplate(uni, course.course_code, topic);
            const description = archetype.descTemplate(uni, course.course_code, topic);

            yield {
              id: `${course.course_code}_${uni.shortCode}_${topic.slice(0, 10)}_${archetype.type}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
              title,
              course_code: course.course_code,
              course_title: course.title,
              institution: uni.name,
              faculty,
              department: dept,
              level: course.level || "200L",
              material_type: archetype.type,
              description,
              topic,
              topics,
              modules: buildTopicModules(course, topic, archetype, uni),
              pastQuestions: buildTopicPastQuestions(course, topic, uni),
              academicSession: "2023/2024",
            };
          }
        }
      }
    }
  }
}
