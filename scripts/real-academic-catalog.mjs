import "./dns-resilience.mjs";

export const REAL_ACADEMIC_WEB_DOCS = [
  // --- ENGINEERING & WORKSHOP TECHNOLOGY (GET 206 / MEE 206 / FEG 206 / ENG 206) ---
  {
    courseCode: "GET 206",
    courseTitle: "Workshop Practice & Technology",
    title: "Mechanical Engineering Workshop Practice Laboratory and Safety Manual",
    url: "https://archive.org/download/MechanicalEngineeringWorkshopPracticeLaboratoryManual/MechanicalWorkshopLaboratory1.pdf",
    materialType: "Lab manual",
    level: "200 Level",
    faculty: "Engineering",
    description: "Standard university workshop laboratory manual covering bench work, fitting, carpentry, machine tools, welding, lathe operations, and industrial safety regulations.",
    topics: ["Bench work and fitting", "Lathe machine operations", "Welding and fabrication", "Foundry and casting", "Workshop safety and hazards"]
  },
  {
    courseCode: "GET 206",
    courseTitle: "Workshop Practice & Technology",
    title: "Introduction to Basic Manufacturing Process and Workshop Technology",
    url: "https://archive.org/download/IntroductionToBasicManufacturingProcessAndWorkshopTechnology/Introduction%20to%20basic%20manufacturing%20process%20and%20workshop%20technology%20(1).pdf",
    materialType: "Textbook / handout",
    level: "200 Level",
    faculty: "Engineering",
    description: "Comprehensive university reference on industrial manufacturing processes, machine tools, metal cutting mechanics, metal joining, and workshop technology.",
    topics: ["Manufacturing processes", "Metal cutting and chip formation", "Shaper, planer, and milling operations", "Sheet metal work", "Heat treatment"]
  },

  // --- NIGERIAN & GENERAL STUDIES (GST 111 / GST 112 / GST 223) ---
  {
    courseCode: "GST 112",
    courseTitle: "Nigerian Peoples and Culture",
    title: "Groundwork of Nigerian History - Prof. Obaro Ikime (Historical Society of Nigeria)",
    url: "https://archive.org/download/ground-work-of-nigerian-history/GROUND%20WORK%20OF%20NIGERIAN%20HISTORY%201983%20NLN.pdf",
    materialType: "Textbook / handout",
    level: "100 Level",
    faculty: "Arts",
    description: "The authoritative academic groundwork text on Nigerian history, indigenous cultures, state formations, colonial impact, and national evolution across pre-colonial and modern Nigeria.",
    topics: ["Pre-colonial Nigerian societies", "Yoruba, Igbo, Hausa-Fulani kingdoms", "British colonial administration", "Constitutional development", "Post-independence nation building"]
  },

  // --- UNIVERSITY PHYSICS (PHY 101 / PHY 102 / Mechanics / Electromagnetism) ---
  {
    courseCode: "PHY 102",
    courseTitle: "General Physics II (Electricity & Magnetism)",
    title: "University Physics Volume 2: Electricity, Magnetism, Circuits and Modern Physics",
    url: "https://archive.org/download/UniversityPhysicsVolume2/UniversityPhysicsVolume2-OP.pdf",
    materialType: "Textbook / handout",
    level: "100 Level",
    faculty: "Science",
    description: "Comprehensive university physics text covering electric charges, electric fields, Gauss's law, electric potential, capacitance, current, resistance, DC circuits, magnetic forces, electromagnetic induction, AC circuits, and Maxwell's equations.",
    topics: ["Electric charge and Coulomb's Law", "Gauss's Law and electric flux", "Capacitance and dielectrics", "Direct-current circuits", "Magnetic fields and electromagnetic induction"]
  },
  {
    courseCode: "PHY 101",
    courseTitle: "General Physics I (Mechanics & Waves)",
    title: "University Physics Volume 1: Mechanics, Kinematics, Dynamics and Waves",
    url: "https://archive.org/download/UniversityPhysicsVolume1/UniversityPhysicsVolume1-OP.pdf",
    materialType: "Textbook / handout",
    level: "100 Level",
    faculty: "Science",
    description: "Standard calculus-based university physics volume covering units, vectors, 1D & 2D motion, Newton's laws of motion, work, energy, linear momentum, collisions, rotational motion, gravitation, fluid statics, and oscillations.",
    topics: ["Vectors and coordinate systems", "Newton's laws of motion", "Work, energy and conservation laws", "Rotational dynamics and torque", "Oscillations and mechanical waves"]
  },
  {
    courseCode: "PHY 201",
    courseTitle: "Modern Physics & Quantum Mechanics",
    title: "MIT Physics 8.051: Quantum Physics II Lecture Notes & Problem Sets",
    url: "https://archive.org/download/quantum-mechanics-i-mit/8.051%20Quantum%20Physics%20II%20MIT.pdf",
    materialType: "Lecture notes",
    level: "200 Level",
    faculty: "Science",
    description: "Official Massachusetts Institute of Technology quantum physics lecture notes covering state vectors, operators, angular momentum, spin-1/2 systems, perturbation theory, and wave mechanics.",
    topics: ["Dirac notation and Hilbert spaces", "Angular momentum and spin operators", "Time-independent perturbation theory", "Identical particles", "Variational methods"]
  },
  {
    courseCode: "PHY 202",
    courseTitle: "Quantum Mechanics & Statistical Physics",
    title: "Notes on Quantum Mechanics - Prof. Klaus Schulten (University Physics Series)",
    url: "https://archive.org/download/K_Schulten__Notes_on_Quantum_Mechanics/QM_Book.pdf",
    materialType: "Lecture notes",
    level: "200 Level",
    faculty: "Science",
    description: "Advanced university physics lecture notes covering mathematical foundations of quantum theory, harmonic oscillator, hydrogen atom solutions, and atomic spectra.",
    topics: ["Schrodinger wave equation", "One-dimensional potential barriers", "Harmonic oscillator ladder operators", "Hydrogen atom wavefunction", "Spin and magnetic resonance"]
  },

  // --- UNIVERSITY MATHEMATICS & CALCULUS (MTH 101 / MTH 201 / MATH 101) ---
  {
    courseCode: "MTH 101",
    courseTitle: "Elementary Mathematics I (Calculus & Algebra)",
    title: "University Calculus Volume 1: Functions, Limits, Derivatives and Integrals",
    url: "https://archive.org/download/CalculusVolume1_201906/CalculusVolume1-OP_7h4t0Wd.pdf",
    materialType: "Textbook / handout",
    level: "100 Level",
    faculty: "Science",
    description: "Foundational university calculus textbook covering functions, graphs, limits, continuity, differentiation rules, applications of derivatives, integration, and fundamental theorem of calculus.",
    topics: ["Limits and continuity", "Differentiation techniques and chain rule", "Applications of derivatives (extrema, curve sketching)", "Definite and indefinite integrals", "Fundamental Theorem of Calculus"]
  },
  {
    courseCode: "MTH 101",
    courseTitle: "Elementary Mathematics I (Foundations of Geometry)",
    title: "Euclid's Elements of Geometry - The Classical Mathematical Foundation",
    url: "https://archive.org/download/JL_Heiberg___EUCLIDS_ELEMENTS_OF_GEOMETRY/Elements.pdf",
    materialType: "Textbook / handout",
    level: "100 Level",
    faculty: "Science",
    description: "Complete mathematical treatise containing the axiomatic foundations of plane geometry, number theory, proportion, incommensurable magnitudes, and solid geometry.",
    topics: ["Axiomatic proofs and Euclidean postulates", "Triangles, parallels and quadrilaterals", "Circles, tangents and chords", "Theory of proportions", "Solid geometry"]
  },
  {
    courseCode: "MTH 201",
    courseTitle: "Mathematical Methods & Advanced Analysis",
    title: "MIT Mathematics 18.102: Introduction to Functional Analysis Lecture Series",
    url: "https://archive.org/download/18.677-topics-in-stochastic-processes/18.102%20Introduction%20to%20Functional%20Analysis.pdf",
    materialType: "Lecture notes",
    level: "200 Level",
    faculty: "Science",
    description: "Official MIT undergraduate mathematics lecture notes covering normed vector spaces, Banach spaces, Hilbert spaces, bounded linear operators, spectral theorem, and Lebesgue integration.",
    topics: ["Metric and normed spaces", "Banach and Hilbert spaces", "Bounded linear operators", "Hahn-Banach theorem", "Compact operators and spectra"]
  },
  {
    courseCode: "STA 201",
    courseTitle: "Probability Theory & Stochastic Processes",
    title: "Cambridge University Mathematical Tripos: Advanced Probability Lecture Notes",
    url: "https://archive.org/download/cambridge_maths_lecture_notes/advanced_probability.pdf",
    materialType: "Lecture notes",
    level: "200 Level",
    faculty: "Science",
    description: "University of Cambridge mathematical Tripos lecture notes on probability measures, random variables, conditional expectation, martingales, convergence theorems, and Brownian motion.",
    topics: ["Probability spaces and sigma-algebras", "Independence and Borel-Cantelli lemmas", "Martingales and stopping times", "Central limit theorem and law of large numbers", "Markov chains"]
  },
  {
    courseCode: "MTH 101",
    courseTitle: "University Mathematics & Examination Prep",
    title: "Advanced Problems in Mathematics: Preparing for University Examinations",
    url: "https://zenodo.org/api/records/19847950/files/fc088d17-bab2-4bfa-90bc-b320760c6c97_book.pdf/content",
    materialType: "Past questions",
    level: "100 Level",
    faculty: "Science",
    description: "Comprehensive problem collection and solutions for university entrance and undergraduate mathematics examinations, covering advanced algebra, calculus, geometry, and mechanics.",
    topics: ["Algebraic equations and inequalities", "Calculus problem sets and solutions", "Coordinate geometry past questions", "Trigonometric identities and series", "Step-by-step examination solutions"]
  },
  {
    courseCode: "MTH 101",
    courseTitle: "Calculus & Analytical Geometry",
    title: "Culture Connected Calculus: A University Self Study Guide and Problem Solver",
    url: "https://zenodo.org/api/records/23160831/files/Culture_Connected_Calculus_ISBN_978-626-01-7478-1.pdf/content",
    materialType: "Summary",
    level: "100 Level",
    faculty: "Science",
    description: "Comprehensive university study guide and tutorial manual with worked examples in single-variable calculus, differential equations, and series approximations.",
    topics: ["Limits and rate of change", "Derivative formulas and applications", "Integration techniques (by parts, substitution)", "Improper integrals", "Sequences and Taylor series"]
  },

  // --- BUSINESS, MANAGEMENT & ECONOMICS (BUS 101 / ECO 101 / MKT 101) ---
  {
    courseCode: "BUS 101",
    courseTitle: "Introduction to Business & Enterprise",
    title: "Introduction to Business - OpenStax University Edition",
    url: "https://archive.org/download/IntroductionToBusiness_201906/IntroductionToBusiness-OP_MD3cA0Z.pdf",
    materialType: "Textbook / handout",
    level: "100 Level",
    faculty: "Administration / Business",
    description: "Foundational university business textbook covering business environments, global commerce, entrepreneurship, organizational structures, management principles, marketing, operations, and corporate finance.",
    topics: ["Understanding business environments", "Forms of business ownership", "Entrepreneurship and small business", "Management and leadership", "Marketing mix and digital strategy"]
  },
  {
    courseCode: "ECO 101",
    courseTitle: "Principles of Microeconomics",
    title: "Principles of Microeconomics: University Foundations & Market Applications",
    url: "https://archive.org/download/principles-of-microeconomics-11.9/principles-of-microeconomics-11.9.pdf",
    materialType: "Textbook / handout",
    level: "100 Level",
    faculty: "Social Sciences",
    description: "Rigorous introductory microeconomics text covering scarcity, supply and demand, price elasticity, consumer choice, production costs, perfect competition, monopoly, oligopoly, and market failures.",
    topics: ["Demand, supply and market equilibrium", "Elasticity of demand and supply", "Consumer theory and utility maximization", "Cost structures and perfect competition", "Monopoly, monopolistic competition and oligopoly"]
  },
  {
    courseCode: "MKT 201",
    courseTitle: "Marketing Management & Systems",
    title: "MIT Sloan School of Management: Marketing Systems & Consumer Analytics",
    url: "https://archive.org/download/lecturenotesrela00amst/lecturenotesrela00amst.pdf",
    materialType: "Lecture notes",
    level: "200 Level",
    faculty: "Administration / Business",
    description: "Official MIT Sloan School university lecture series on strategic marketing systems, pricing algorithms, product distribution channels, customer segmentation, and market research.",
    topics: ["Marketing system frameworks", "Customer segmentation and positioning", "Pricing strategies and models", "Distribution channel logistics", "Integrated marketing communications"]
  },
  {
    courseCode: "ECO 102",
    courseTitle: "Principles of Economics",
    title: "Principles of Economics: Classical & Contemporary Foundations",
    url: "https://zenodo.org/api/records/1572037/files/article.pdf/content",
    materialType: "Summary",
    level: "100 Level",
    faculty: "Social Sciences",
    description: "Core academic synthesis of economic thought, macroeconomic indicators, monetary policies, fiscal mechanisms, and international trade dynamics.",
    topics: ["Gross Domestic Product and national income", "Inflation and unemployment", "Fiscal and monetary policy", "International trade and exchange rates", "Economic growth models"]
  },

  // --- ACCOUNTING & FINANCE (ACC 101 / ACC 201) ---
  {
    courseCode: "ACC 101",
    courseTitle: "Principles of Accounting I",
    title: "Principles of Accounting Volume 1: Financial Accounting - University Edition",
    url: "https://archive.org/download/FinancialAccounting_201906/FinancialAccounting-OP_VzAhRvu.pdf",
    materialType: "Textbook / handout",
    level: "100 Level",
    faculty: "Administration / Business",
    description: "Complete financial accounting textbook covering role of accounting, transaction analysis, double-entry bookkeeping, accruals, financial statement preparation, cash flows, and internal controls.",
    topics: ["Accounting equation and transactions", "The accounting cycle and ledger posting", "Adjusting entries and closing process", "Financial statement preparation (Income statement, Balance sheet)", "Internal control systems and cash management"]
  },

  // --- CHEMISTRY & CHEMICAL SCIENCES (CHM 101 / CHM 102 / CHM 201) ---
  {
    courseCode: "CHM 201",
    courseTitle: "Organic Chemistry Laboratory & Techniques",
    title: "The Organic Chem Lab Survival Manual: A Student's Guide to Techniques",
    url: "https://archive.org/download/TheOrganicChemLabSurvivalManual/TheOrganicChemLabSurvivalManual-Zubrick.pdf",
    materialType: "Lab manual",
    level: "200 Level",
    faculty: "Science",
    description: "The premier university laboratory guide to organic chemistry methods: recrystallization, distillation, extraction, chromatography, melting point determination, NMR, and infrared spectroscopy.",
    topics: ["Laboratory safety and chemical handling", "Recrystallization and purification", "Distillation (simple, fractional, vacuum)", "Extraction and drying agents", "Thin layer chromatography (TLC) and spectroscopy"]
  },
  {
    courseCode: "CHM 101",
    courseTitle: "General Chemistry I",
    title: "Chemistry 2e: Atoms First, Chemical Reactions, Bonding & Thermochemistry",
    url: "https://archive.org/download/Chemistry2e/Chemistry2e-OP.pdf",
    materialType: "Textbook / handout",
    level: "100 Level",
    faculty: "Science",
    description: "Comprehensive university general chemistry textbook covering atomic structure, periodic trends, stoichiometry, chemical equations, gas laws, chemical bonding, and thermodynamics.",
    topics: ["Essential ideas and stoichiometry", "Electronic structure and periodic properties", "Chemical bonding and molecular geometry", "Gases, liquids and solids", "Thermochemistry and calorimetry"]
  },
  {
    courseCode: "CHM 102",
    courseTitle: "General Chemistry Practical",
    title: "Laboratory Manual of Organic Chemistry & Analytical Techniques",
    url: "https://zenodo.org/api/records/1733516/files/article.pdf/content",
    materialType: "Lab manual",
    level: "100 Level",
    faculty: "Science",
    description: "Standard practical laboratory manual detailing qualitative analysis, synthesis of organic compounds, volumetric titration, and analytical chemistry procedures.",
    topics: ["Volumetric analysis and standardization", "Qualitative inorganic salt analysis", "Organic functional group identification", "Synthesis of aspirin and esters", "Spectrophotometric analysis"]
  },

  // --- BIOLOGY, MEDICINE & HEALTH SCIENCES (BIO 101 / ANA 201) ---
  {
    courseCode: "BIO 101",
    courseTitle: "General Biology I (Cell Biology & Genetics)",
    title: "Biology 2e: Cellular Organization, Genetics, Evolution and Ecology",
    url: "https://archive.org/download/Biology2e/Biology2e-OP.pdf",
    materialType: "Textbook / handout",
    level: "100 Level",
    faculty: "Basic Medical / Science",
    description: "Premier university biology textbook covering chemistry of life, cell structure, membranes, cellular respiration, photosynthesis, mitosis, meiosis, Mendelian genetics, and molecular biology.",
    topics: ["The study of life and biological macromolecules", "Cell structure and membrane transport", "Cellular respiration and ATP synthesis", "Photosynthesis and light reactions", "Mendelian genetics and DNA replication"]
  },
  {
    courseCode: "ANA 201",
    courseTitle: "Human Anatomy & Physiology I",
    title: "Anatomy and Physiology 2e: University Medical Sciences Edition",
    url: "https://archive.org/download/AnatomyAndPhysiology2e/AnatomyAndPhysiology2e-OP.pdf",
    materialType: "Textbook / handout",
    level: "200 Level",
    faculty: "Basic Medical / Science",
    description: "Standard medical and university textbook on human structural organization, integumentary system, bone tissue, axial and appendicular skeleton, joints, muscle physiology, and nervous system.",
    topics: ["Levels of structural organization", "Cellular anatomy and tissues (epithelial, connective)", "The skeletal system and articulatory joints", "Muscular system physiology and contraction", "Central and peripheral nervous systems"]
  },
  {
    courseCode: "AGR 201",
    courseTitle: "Agricultural Entomology & Crop Protection",
    title: "Agricultural Entomology Third Edition: Comprehensive University Textbook",
    url: "https://zenodo.org/api/records/15244840/files/Soojeede's%20Agricultural%20Entomology%20Third%20Edition.pdf/content",
    materialType: "Textbook / handout",
    level: "200 Level",
    faculty: "Agriculture",
    description: "Comprehensive university treatise on insect anatomy, physiology, taxonomy, pest ecology, integrated pest management (IPM), and crop protection strategies.",
    topics: ["Insect external morphology and anatomy", "Insect orders of agricultural importance", "Pest monitoring and economic thresholds", "Biological control and parasitoids", "Integrated pest management strategies"]
  },

  // --- COMPUTER SCIENCE & ELECTRICAL ENGINEERING (CSC 101 / CSC 201 / EEE 201) ---
  {
    courseCode: "EEE 201",
    courseTitle: "Analog & Digital Electronics",
    title: "Analog and Digital Electronics Lecture Series & Circuit Analysis",
    url: "https://zenodo.org/api/records/4692174/files/ElectronicLectures.pdf/content",
    materialType: "Lecture notes",
    level: "200 Level",
    faculty: "Engineering",
    description: "University electrical engineering lecture notes covering semiconductor physics, p-n junction diodes, bipolar junction transistors (BJTs), field-effect transistors (FETs), and op-amps.",
    topics: ["Semiconductor diode characteristics", "Transistor biasing and small-signal models", "Operational amplifier configurations", "Digital logic gates and combinational circuits", "Oscillators and power supplies"]
  },
  {
    courseCode: "CSC 101",
    courseTitle: "Introduction to Computer Programming",
    title: "Introduction to Python Programming for Engineers & Scientists",
    url: "https://archive.org/download/introduction-to-python-for-engineers/Introduction%20to%20Python%20for%20Engineers.pdf",
    materialType: "Textbook / handout",
    level: "100 Level",
    faculty: "Science / Engineering",
    description: "University programming textbook covering Python basics, variables, control structures, functions, NumPy, scientific computing, data visualization, and object-oriented programming.",
    topics: ["Python syntax, data types, and operators", "Control flow (loops, conditionals)", "Functions, modules and scope", "NumPy array computing", "File handling and exception management"]
  },

  // --- ENGINEERING MECHANICS (GET 205 / CVE 201 / MEE 201) ---
  {
    courseCode: "GET 205",
    courseTitle: "Engineering Mechanics (Statics)",
    title: "Engineering Mechanics: Statics 14th Edition - University Standard",
    url: "https://archive.org/download/engineering-mechanics-statics-14th-edition/Engineering%20Mechanics%20Statics%2014th%20Edition.pdf",
    materialType: "Textbook / handout",
    level: "200 Level",
    faculty: "Engineering",
    description: "Standard engineering mechanics textbook covering force vectors, equilibrium of a particle, force system resultants, equilibrium of a rigid body, structural analysis, trusses, and friction.",
    topics: ["General principles and force vectors", "Equilibrium of a particle in 2D and 3D", "Force system resultants and moments", "Equilibrium of rigid bodies", "Truss analysis (method of joints and sections)"]
  }
];
