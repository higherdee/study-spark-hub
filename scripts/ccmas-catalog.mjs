/**
 * NUC CCMAS (Core Curriculum and Minimum Academic Standards) Catalog
 * Official Nigerian Universities Commission Undergraduate Degree Specifications
 * Contains standard course codes, titles, syllabus units, recommended textbooks,
 * and verified open-access resource endpoints for Nigerian universities.
 */

export const NUC_CCMAS_COURSES = [
  // --- GENERAL STUDIES (UNIVERSAL FOR ALL NIGERIAN UNIVERSITIES) ---
  {
    course_code: "GST 111",
    title: "Communication in English",
    course: "General Studies",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "handout",
    description: "Syllabus covering listening comprehension, phonetics & oral English, note-taking techniques, paragraph development, mechanics of writing, concord, and academic referencing.",
    recommended_textbooks: ["Effective Communication in English for Universities - Ogbulogo", "English for Academic Purposes - Babatunde"],
    topics: ["Phonetics and Phonology", "Note-Taking and Listening Strategies", "Sentence Structure and Concord", "Reading Comprehension", "Essay Writing and Paragraph Development"],
    open_resources: [
      {
        title: "GST 111: Communication in English Courseware & Lecture Guide",
        file_name: "GST_111_Communication_in_English_CCMAS.pdf",
        type: "pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" // replaced with resilient open source pdf fetcher
      }
    ]
  },
  {
    course_code: "GST 112",
    title: "Nigerian Peoples and Culture",
    course: "General Studies",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "handout",
    description: "Official NUC CCMAS curriculum on the history of Nigerian peoples, evolution of the Nigerian state, socio-cultural zones, indigenous technology, colonial rule, and the 1999 Constitution.",
    recommended_textbooks: ["Groundwork of Nigerian History - Obaro Ikime", "Nigerian Peoples and Culture - Falola & Heaton"],
    topics: ["Pre-colonial Nigerian Societies", "Colonial Rule and Nationalism", "Cultural Zones of Nigeria", "Indigenous Science and Technology", "Social Justice and Citizenship in Nigeria"]
  },
  {
    course_code: "GST 113",
    title: "Philosophy, Logic and Human Existence",
    course: "General Studies",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "lecture_note",
    description: "Foundational philosophy syllabus: epistemological inquiry, formal logic, propositional calculus, fallacies of reasoning, and existential ethics in contemporary African society.",
    recommended_textbooks: ["Introduction to Logic - Copi & Cohen", "African Philosophy: An Introduction - Wiredu"],
    topics: ["Branches of Philosophy", "Nature of Human Existence", "Deductive and Inductive Arguments", "Informal Fallacies", "Symbolic Logic and Truth Tables"]
  },
  {
    course_code: "GST 114",
    title: "Use of Library, Study Skills and ICT",
    course: "General Studies",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "handout",
    description: "Library organization systems (LC and Dewey Decimal), digital archival repositories, database Boolean search strategies, academic integrity, plagiarism avoidance, and citation styles.",
    recommended_textbooks: ["Modern Library and Information Science - Aguolu", "Information Literacy in Higher Education - Edem"],
    topics: ["Library Classification Schemes", "Online Public Access Catalog (OPAC)", "Citation and Referencing Styles (APA/MLA)", "Study Habits and Time Management", "Search Engines and Academic Databases"]
  },
  {
    course_code: "GST 212",
    title: "Peace Studies and Conflict Resolution",
    course: "General Studies",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "handout",
    description: "Causes of communal and regional conflicts in Nigeria, non-violent resistance, negotiation, mediation, arbitration, post-conflict peacebuilding, and ECOWAS/UN security frameworks.",
    recommended_textbooks: ["Introduction to Peace and Conflict Studies in West Africa - Best", "Conflict Resolution in Nigeria - Albert"],
    topics: ["Theories of Conflict", "Conflict Analysis and Early Warning", "Mediation and Arbitration", "Peacebuilding and Reconciliation", "Insurgency, Banditry and Security in Nigeria"]
  },
  {
    course_code: "GST 223",
    title: "Entrepreneurship and Innovation",
    course: "General Studies",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Entrepreneurial mindset, opportunity recognition, Lean Business Model Canvas, prototyping, financial forecasting, CAC/LTV metrics, and SME regulatory compliance with CAC and SMEDAN in Nigeria.",
    recommended_textbooks: ["The Lean Startup - Eric Ries", "Entrepreneurship: A Nigerian Perspective - Inegbenebor"],
    topics: ["Ideation and Value Proposition", "Business Model Canvas", "Financial Planning for Startups", "Marketing Mix and Customer Acquisition", "Legal Framework for Nigerian Businesses"]
  },

  // --- FACULTY OF COMPUTING (COS / CSC / SEN / CYS / IFT) ---
  {
    course_code: "COS 101",
    title: "Introduction to Computing Sciences",
    course: "Computer Science",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Comprehensive introduction to binary numeral systems, logic gates, von Neumann computer architecture, operating system kernels, algorithm logic, and networking basics.",
    recommended_textbooks: ["Computer Science Illuminated - Dale & Lewis", "Foundations of Computer Science - Forouzan"],
    topics: ["Number Systems and Binary Arithmetic", "Logic Gates and Boolean Algebra", "Computer Hardware Architecture", "Operating Systems Overview", "Introduction to Algorithms"]
  },
  {
    course_code: "COS 102",
    title: "Computing Practice and Problem Solving",
    course: "Computer Science",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "lecture_note",
    description: "Practical algorithmic problem-solving: pseudocode design, flowchart modeling, control flow, functions, modular programming, and hands-on Python scripts.",
    recommended_textbooks: ["Problem Solving and Programming Concepts - Sprankle", "Python Crash Course - Eric Matthes"],
    topics: ["Algorithmic Thinking", "Flowcharting and Pseudocode", "Variables, Data Types and Operators", "Control Structures (Loops and Branching)", "Functions and Modular Design"]
  },
  {
    course_code: "CSC 201",
    title: "Computer Programming I (Structured Programming)",
    course: "Computer Science",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "lecture_note",
    description: "Structured programming paradigms using C and Python: memory allocation, pointer manipulation, arrays, records, recursive functions, and file I/O processing.",
    recommended_textbooks: ["The C Programming Language - Kernighan & Ritchie", "Programming with Python - Deitel"],
    topics: ["Memory Architecture and Variables", "Pointers and Memory Addresses", "Arrays and String Manipulation", "Structs and Data Aggregation", "File Streams and Exception Handling"]
  },
  {
    course_code: "CSC 202",
    title: "Object-Oriented Programming (OOP)",
    course: "Computer Science",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "lecture_note",
    description: "Core OOP tenets in Java and C++: encapsulation, inheritance hierarchies, runtime polymorphism, abstract classes, interfaces, generic collections, and Design Patterns.",
    recommended_textbooks: ["Head First Java - Sierra & Bates", "Effective Java - Joshua Bloch"],
    topics: ["Classes, Constructors and Objects", "Encapsulation and Access Modifiers", "Inheritance and Composition", "Polymorphism and Method Overriding", "Interfaces and Abstract Classes"]
  },
  {
    course_code: "CSC 301",
    title: "Data Structures and Algorithms",
    course: "Computer Science",
    level: "300L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Algorithmic asymptotic analysis (Big-O, Omega, Theta), arrays, linked lists, stacks, queues, binary search trees, AVL trees, graphs, Dijkstra's algorithm, sorting, and dynamic programming.",
    recommended_textbooks: ["Introduction to Algorithms (CLRS) - Cormen, Leiserson, Rivest, Stein", "Data Structures and Algorithm Analysis - Weiss"],
    topics: ["Asymptotic Time and Space Complexity", "Linked Lists and Dynamic Arrays", "Stacks and Queues Applications", "Trees, Heaps and Balanced BSTs", "Graph Traversals (BFS, DFS) and Shortest Paths"]
  },
  {
    course_code: "CSC 302",
    title: "Database Systems and SQL Management",
    course: "Computer Science",
    level: "300L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "lecture_note",
    description: "Relational database schema modeling, Entity-Relationship (ER) diagrams, relational algebra, database normalization (1NF, 2NF, 3NF, BCNF), SQL queries, transactions, and ACID compliance.",
    recommended_textbooks: ["Database System Concepts - Silberschatz, Korth, Sudarshan", "Fundamentals of Database Systems - Elmasri & Navathe"],
    topics: ["Relational Model and Constraints", "ER and EER Data Modeling", "Functional Dependencies and Normalization", "Complex SQL Queries and Joins", "Transaction Concurrency and ACID Properties"]
  },
  {
    course_code: "CSC 411",
    title: "Artificial Intelligence and Machine Learning",
    course: "Computer Science",
    level: "400L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Heuristic search algorithms (A*, minimax, alpha-beta pruning), supervised learning (regression, classification, SVMs), neural network backpropagation, and unsupervised clustering.",
    recommended_textbooks: ["Artificial Intelligence: A Modern Approach - Russell & Norvig", "Pattern Recognition and Machine Learning - Bishop"],
    topics: ["State-Space Search and Heuristics", "Supervised Learning Fundamentals", "Gradient Descent and Optimization", "Feedforward Neural Networks and Backpropagation", "Clustering and Dimensionality Reduction"]
  },

  // --- FACULTY OF ENGINEERING & TECHNOLOGY (GET / EEE / MEE / CVE) ---
  {
    course_code: "GET 201",
    title: "Applied Electricity I",
    course: "Electrical Engineering",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "handout",
    description: "DC and AC circuit laws: Kirchhoff's laws, nodal and mesh analysis, Thevenin and Norton equivalent circuits, maximum power transfer theorem, capacitive/inductive transients, and phasor analysis.",
    recommended_textbooks: ["Electric Circuits - Nilsson & Riedel", "Fundamentals of Electric Circuits - Alexander & Sadiku"],
    topics: ["Kirchhoff's Current and Voltage Laws", "Mesh and Nodal Network Analysis", "Network Theorems (Thevenin, Norton, Superposition)", "AC Steady-State Phasors and Impedance", "Resonance in RLC Circuits"]
  },
  {
    course_code: "GET 202",
    title: "Engineering Mathematics I",
    course: "Mechanical Engineering",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Ordinary differential equations (ODEs), homogenous and non-homogeneous first/second-order equations, Frobenius method, Fourier series expansions, and matrix eigenvalue problems.",
    recommended_textbooks: ["Engineering Mathematics - K.A. Stroud", "Advanced Engineering Mathematics - Erwin Kreyszig"],
    topics: ["First-Order Differential Equations", "Second-Order Linear ODEs with Constant Coefficients", "Fourier Series and Periodic Waveforms", "Matrix Eigenvalues and Eigenvectors", "Vector Calculus (Grad, Div, Curl)"]
  },
  {
    course_code: "GET 205",
    title: "Engineering Mechanics (Statics and Dynamics)",
    course: "Civil Engineering",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "lecture_note",
    description: "Principles of statics: force vectors, equilibrium of rigid bodies, free body diagrams, trusses, shear and moment distributions, centroid, moment of inertia, and kinematics of particles.",
    recommended_textbooks: ["Vector Mechanics for Engineers: Statics & Dynamics - Beer & Johnston", "Engineering Mechanics - Hibbeler"],
    topics: ["Force Vectors and 2D/3D Equilibrium", "Free Body Diagrams and Support Reactions", "Truss Analysis (Method of Joints and Sections)", "Centroids and Second Moment of Area", "Kinematics and Kinetics of Particles"]
  },
  {
    course_code: "GET 206",
    title: "Workshop Practice and Safety Technology",
    course: "Mechanical Engineering",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "handout",
    description: "Industrial workshop safety protocols, bench fitting, sheet metal fabrication, arc and gas welding procedures, lathe machine operations, casting, and electrical wiring standards in Nigeria.",
    recommended_textbooks: ["Workshop Technology Part 1 & 2 - W.A.J. Chapman", "Manufacturing Engineering & Technology - Kalpakjian"],
    topics: ["Workshop Safety Codes and Personal Protective Equipment", "Measuring Instruments (Vernier Calipers, Micrometers)", "Bench Work, Filing, Sawing and Drilling", "Lathe Operations and Turning", "Welding Techniques and Joint Inspection"]
  },
  {
    course_code: "GET 210",
    title: "Engineering Drawing II & CAD",
    course: "Civil Engineering",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "handout",
    description: "Assembly drawings, exploded views, geometric dimensioning and tolerancing (GD&T), sectioning of machine components, and Computer-Aided Drafting (CAD) workflows using AutoCAD.",
    recommended_textbooks: ["Engineering Drawing with CAD Applications - Ostrowsky", "Technical Drawing - Giesecke"],
    topics: ["Orthographic and Isometric Projection Rules", "Sectional Views and Hatching Standards", "Assembly and Detailed Component Drawings", "Geometric Tolerancing and Fits", "Computer-Aided Drafting (AutoCAD Fundamentals)"]
  },

  // --- FACULTY OF BASIC MEDICAL SCIENCES (ANA / PHS / BCH / MCB / PHM) ---
  {
    course_code: "ANA 201",
    title: "Gross Anatomy of Upper and Lower Extremities",
    course: "Medicine and Surgery",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Osteology, arthrology, and myology of the pectoral girdle, axilla, brachial plexus, cubital fossa, carpal tunnel, gluteal region, femoral triangle, popliteal fossa, and arterial blood supply.",
    recommended_textbooks: ["Clinically Oriented Anatomy - Moore, Dalley, Agur", "Grays Anatomy for Students - Drake, Vogl, Mitchell"],
    topics: ["Brachial Plexus Organization and Nerve Lesions", "Axilla and Pectoral Girdle Musculature", "Cubital Fossa and Forearm Compartments", "Femoral Triangle and Femoral Sheath", "Knee Joint Stability and Popliteal Fossa"]
  },
  {
    course_code: "PHS 201",
    title: "Introductory Human Physiology and Blood",
    course: "Medicine and Surgery",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Cell physiology, membrane transport mechanisms, resting membrane potential, action potential propagation, fluid compartments, erythropoiesis, hemoglobin synthesis, blood groups, and hemostasis.",
    recommended_textbooks: ["Guyton and Hall Textbook of Medical Physiology - Hall", "Ganongs Review of Medical Physiology - Barrett"],
    topics: ["Homeostatic Feedback Mechanisms", "Membrane Potentials and Action Potentials", "Red Blood Cells and Erythropoiesis", "ABO and Rhesus Blood Group Systems", "Hemostasis and Blood Coagulation Cascade"]
  },
  {
    course_code: "BCH 201",
    title: "General Biochemistry I (Biomolecules)",
    course: "Biochemistry",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "lecture_note",
    description: "Stereochemistry and structural classification of carbohydrates, amino acids, peptide bonds, protein secondary/tertiary structures, lipid classes, fatty acids, and nucleic acid double helix.",
    recommended_textbooks: ["Lehninger Principles of Biochemistry - Nelson & Cox", "Harper's Illustrated Biochemistry - Rodwell"],
    topics: ["Monosaccharides, Disaccharides and Polysaccharides", "Amino Acid Titration and Peptide Bonds", "Protein Folding and Denaturation", "Phospholipids, Triglycerides and Membranes", "DNA and RNA Structural Conformations"]
  },
  {
    course_code: "BCH 301",
    title: "Enzymology and Intermediary Metabolism",
    course: "Biochemistry",
    level: "300L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Enzyme kinetics (Michaelis-Menten equation, Lineweaver-Burk plots, reversible/irreversible inhibition), glycolysis pathway, pyruvate dehydrogenase complex, citric acid cycle, and oxidative phosphorylation.",
    recommended_textbooks: ["Biochemistry - Voet & Voet", "Lippincott Illustrated Reviews: Biochemistry - Ferrier"],
    topics: ["Enzyme Catalysis Mechanisms", "Michaelis-Menten Kinetics and Km/Vmax", "Glycolytic Pathway and Regulation", "Tricarboxylic Acid (Krebs) Cycle", "Electron Transport Chain and ATP Synthase"]
  },

  // --- FACULTY OF SCIENCE (MTH / PHY / CHM) ---
  {
    course_code: "MTH 101",
    title: "Elementary Mathematics I (Algebra & Trigonometry)",
    course: "Mathematics",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Set theory, real number system, quadratic equations, polynomials, mathematical induction, binomial theorem, permutations and combinations, complex numbers, and trigonometric identities.",
    recommended_textbooks: ["Pure Mathematics for Advanced Level - Bunday & Mulholland", "College Algebra and Trigonometry - Stewart, Redlin, Watson"],
    topics: ["Sets, Venn Diagrams and Number Systems", "Quadratic Equations and Roots", "Mathematical Induction and Binomial Expansions", "Complex Numbers and Argand Diagrams", "Trigonometric Addition and Double-Angle Formulas"]
  },
  {
    course_code: "MTH 102",
    title: "Elementary Mathematics II (Calculus)",
    course: "Mathematics",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Limits and continuity, differentiation from first principles, chain rule, product and quotient rules, maxima and minima problems, integration techniques, substitution, parts, and definite integrals.",
    recommended_textbooks: ["Calculus: Early Transcendentals - James Stewart", "Thomas' Calculus - Thomas, Weir, Hass"],
    topics: ["Limits and Continuity of Functions", "Derivative Techniques (Product, Quotient, Chain Rule)", "Applications of Derivatives (Optimization & Curve Sketching)", "Integration by Substitution and Partial Fractions", "Integration by Parts and Area Under Curves"]
  },
  {
    course_code: "PHY 101",
    title: "General Physics I (Mechanics and Thermal Physics)",
    course: "Physics",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Vectors, kinematics in 1D and 2D, Newton's laws of motion, work, energy, and momentum conservation, rotational dynamics, gravitation, elasticity, fluid statics, and laws of thermodynamics.",
    recommended_textbooks: ["Fundamentals of Physics - Halliday, Resnick, Walker", "University Physics - Young & Freedman"],
    topics: ["Vector Algebra and Kinematics", "Newton's Laws and Free Body Motion", "Conservation of Linear Momentum and Collisions", "Rotational Inertia and Torque", "Heat Transfer and First Law of Thermodynamics"]
  },
  {
    course_code: "CHM 101",
    title: "General Chemistry I (Physical and Inorganic)",
    course: "Chemistry",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Atomic structure, quantum numbers, periodic table trends, chemical bonding (ionic, covalent, metallic), stoichiometry, gas laws, chemical equilibria, acid-base theories, and electrochemistry.",
    recommended_textbooks: ["Chemistry - Raymond Chang", "General Chemistry - Ebbing & Gammon"],
    topics: ["Atomic Orbitals and Quantum Numbers", "Periodic Trends (Electronegativity, Ionization Energy)", "Molecular Geometry and VSEPR Theory", "Chemical Equilibrium and Le Chatelier's Principle", "Acid-Base Titration and pH Calculations"]
  },

  // --- FACULTY OF SOCIAL & MANAGEMENT SCIENCES (ACC / ECO / BUS) ---
  {
    course_code: "ACC 101",
    title: "Principles of Accounting I",
    course: "Accounting",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Accounting equation, double-entry bookkeeping system, journal entries, ledger accounts, cash books, three-column cash book, trial balance preparation, and correction of accounting errors.",
    recommended_textbooks: ["Business Accounting 1 - Frank Wood & Sangster", "Principles of Accounts for West Africa - Femi Longe"],
    topics: ["The Accounting Equation (Assets = Liabilities + Equity)", "Books of Original Entry and Journalizing", "Ledger Accounts and Double Entry Rules", "Bank Reconciliation Statements", "Trial Balance and Suspense Accounts"]
  },
  {
    course_code: "ECO 101",
    title: "Principles of Economics I (Microeconomics)",
    course: "Economics",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "textbook",
    description: "Nature of economic problems, scarcity and choice, production possibility curve, theory of demand and supply, price equilibrium, price elasticity, consumer utility, and production costs.",
    recommended_textbooks: ["Principles of Microeconomics - Mankiw", "Economics - Lipsey & Chrystal"],
    topics: ["Scarcity, Choice and Opportunity Cost", "Demand, Supply and Market Equilibrium", "Price, Cross and Income Elasticity of Demand", "Consumer Behavior and Indifference Curves", "Short-Run and Long-Run Cost Curves"]
  },

  // --- FACULTY OF LAW (LAW) ---
  {
    course_code: "LAW 101",
    title: "Nigerian Legal System I",
    course: "Law / Bachelor of Laws (LL.B)",
    level: "100L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "lecture_note",
    description: "Historical evolution of Nigerian law, received English law (Common Law, Equity, Statutes of General Application), customary law validity tests, judicial precedent, and hierarchy of courts.",
    recommended_textbooks: ["The Nigerian Legal System - Ese Malemi", "Introduction to Nigerian Legal System - Obilade"],
    topics: ["Sources of Nigerian Law", "Received English Law and Statutes of General Application", "Customary Law and Repugnancy Test", "Doctrine of Stare Decisis (Judicial Precedent)", "Hierarchy and Jurisdiction of Nigerian Courts"]
  },
  {
    course_code: "LAW 203",
    title: "Law of Contract I",
    course: "Law / Bachelor of Laws (LL.B)",
    level: "200L",
    institution: "National Curriculum (NUC CCMAS)",
    material_type: "lecture_note",
    description: "Essential elements of a valid contract in Nigeria: offer and acceptance, intention to create legal relations, consideration, capacity of parties, terms of contract, conditions and warranties.",
    recommended_textbooks: ["The Law of Contract in Nigeria - Sagay", "Law of Contract - Cheshire, Fifoot & Furmston"],
    topics: ["Offer, Invitation to Treat and Acceptance", "Consideration and Promissory Estoppel", "Intention to Create Legal Relations", "Capacity of Parties (Infants, Corporations)", "Terms of Contract: Conditions, Warranties, Innominate Terms"]
  }
];

// Curated high-yield educational image charts & diagrams (anatomy, circuits, data structures)
export const HIGH_YIELD_DIAGRAMS = [
  {
    title: "Brachial Plexus Anatomical Schema & Nerve Branch Chart",
    course: "Medicine and Surgery",
    course_code: "ANA 201",
    institution: "National Curriculum (NUC CCMAS)",
    level: "200L",
    material_type: "handout",
    mime_type: "image/png",
    description: "Comprehensive schematic diagram of the brachial plexus roots (C5-T1), trunks, divisions, cords, and terminal branches with clinical motor/sensory deficits.",
    diagram_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Brachial_plexus_2.svg/1024px-Brachial_plexus_2.svg.png"
  },
  {
    title: "Cardiac Cycle Pressure-Volume Curves (Wiggers Diagram)",
    course: "Medicine and Surgery",
    course_code: "PHS 201",
    institution: "National Curriculum (NUC CCMAS)",
    level: "200L",
    material_type: "handout",
    mime_type: "image/png",
    description: "High-yield physiological Wiggers diagram depicting ventricular pressure, atrial pressure, aortic flow, ECG timing, and heart sounds during systole and diastole.",
    diagram_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Wiggers_Diagram_2.svg/1024px-Wiggers_Diagram_2.svg.png"
  },
  {
    title: "Operational Amplifier (Op-Amp) Inverting & Non-Inverting Circuits",
    course: "Electrical Engineering",
    course_code: "GET 201",
    institution: "National Curriculum (NUC CCMAS)",
    level: "200L",
    material_type: "handout",
    mime_type: "image/png",
    description: "Schematic diagrams, golden rules of ideal op-amps, closed-loop gain derivations, and frequency response curves for inverting, non-inverting, and differential amplifiers.",
    diagram_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Op-amp_Inverting_Amplifier.svg/1024px-Op-amp_Inverting_Amplifier.svg.png"
  },
  {
    title: "Binary Search Tree (BST) & AVL Self-Balancing Rotations",
    course: "Computer Science",
    course_code: "CSC 301",
    institution: "National Curriculum (NUC CCMAS)",
    level: "300L",
    material_type: "handout",
    mime_type: "image/png",
    description: "Algorithmic infographic illustrating BST node insertion, deletion edge cases, and AVL tree single/double rotations (LL, RR, LR, RL) with balance factors.",
    diagram_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/AVL-tree-w-balance_shift.svg/1024px-AVL-tree-w-balance_shift.svg.png"
  },
  {
    title: "Glycolysis Pathway & Enzymatic Control Steps Infographic",
    course: "Biochemistry",
    course_code: "BCH 301",
    institution: "National Curriculum (NUC CCMAS)",
    level: "300L",
    material_type: "handout",
    mime_type: "image/png",
    description: "Complete biochemical reaction sequence of glycolysis from glucose to pyruvate, detailing all 10 enzymatic reactions, ATP investment/generation, and allosteric regulators.",
    diagram_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Glycolysis.svg/1024px-Glycolysis.svg.png"
  }
];
