/**
 * Global & Nigerian Academic Harvester Catalog
 * Comprehensive worldwide university and curriculum specifications:
 * - Nigeria 🇳🇬 (Achievers, FUTA, UNILAG, OAU, UI, ABU, UNIBEN, NOUN, Covenant, UNN, LASU)
 * - United States 🇺🇸 (MIT, Stanford, Harvard, UC Berkeley, CMU, Princeton, Columbia, Caltech)
 * - United Kingdom 🇬🇧 (Oxford, Cambridge, Imperial College, UCL, LSE, Edinburgh)
 * - Canada 🇨🇦 (University of Toronto, UBC, McGill, Waterloo)
 * - Australia 🇦🇺 (University of Melbourne, University of Sydney, ANU, UNSW)
 * - India 🇮🇳 (IIT Bombay, IIT Delhi, IIT Madras, IISc Bangalore)
 * - South Africa 🇿🇦 (University of Cape Town, Wits, Stellenbosch)
 * - Ghana 🇬🇭 (University of Ghana, KNUST, Ashesi)
 * - Kenya 🇰🇪 (University of Nairobi, Strathmore)
 * - Germany 🇩🇪 (TU Munich, Heidelberg, RWTH Aachen)
 * - France 🇫🇷 (Sorbonne University, École Polytechnique, PSL)
 * - Switzerland 🇨🇭 (ETH Zurich, EPFL)
 * - Singapore 🇸🇬 (NUS, NTU)
 * - Japan 🇯🇵 (University of Tokyo, Kyoto University)
 * - China 🇨🇳 (Tsinghua University, Peking University)
 * - Brazil 🇧🇷 (University of São Paulo, UNICAMP)
 * - Egypt 🇪🇬 (Cairo University, American University in Cairo)
 * - Netherlands 🇳🇱 (TU Delft, University of Amsterdam)
 * - Sweden 🇸🇪 (KTH Royal Institute of Technology, Karolinska Institute)
 * - South Korea 🇰🇷 (Seoul National University, KAIST)
 */
import { NUC_CCMAS_COURSES } from "./ccmas-catalog.mjs";

export const GLOBAL_UNIVERSITIES = [
  // --- NIGERIA ---
  {
    name: "Achievers University, Owo",
    shortCode: "Achievers",
    country: "Nigeria",
    region: "West Africa",
    accreditation: "NUC CCMAS Standard",
    facultyMap: {
      Engineering: "College of Engineering & Technology",
      Computing: "College of Natural & Applied Sciences",
      Science: "College of Natural & Applied Sciences",
      Health: "College of Basic Health Sciences",
      Business: "College of Social & Management Sciences",
      Law: "College of Law",
      General: "Directorate of General Studies",
    }
  },
  {
    name: "Federal University of Technology, Akure",
    shortCode: "FUTA",
    country: "Nigeria",
    region: "West Africa",
    accreditation: "NUC CCMAS Standard",
    facultyMap: {
      Engineering: "School of Engineering & Engineering Technology (SEET)",
      Computing: "School of Computing (SOC)",
      Science: "School of Physical Sciences (SPS)",
      Health: "School of Health & Health Technology",
      Business: "School of Management Technology (SMAT)",
      Law: "General Academic Studies",
      General: "Centre for General Studies (CGS)",
    }
  },
  {
    name: "University of Lagos",
    shortCode: "UNILAG",
    country: "Nigeria",
    region: "West Africa",
    accreditation: "NUC CCMAS Standard",
    facultyMap: {
      Engineering: "Faculty of Engineering",
      Computing: "Faculty of Science (Computer Science)",
      Science: "Faculty of Science",
      Health: "College of Medicine (Idi-Araba)",
      Business: "Faculty of Management Sciences",
      Law: "Faculty of Law",
      General: "General Studies Unit (GST)",
    }
  },
  {
    name: "Obafemi Awolowo University",
    shortCode: "OAU",
    country: "Nigeria",
    region: "West Africa",
    accreditation: "NUC CCMAS Standard",
    facultyMap: {
      Engineering: "Faculty of Technology",
      Computing: "Faculty of Technology",
      Science: "Faculty of Science",
      Health: "College of Health Sciences",
      Business: "Faculty of Administration",
      Law: "Faculty of Law",
      General: "Directorate of General Studies",
    }
  },
  {
    name: "University of Ibadan",
    shortCode: "UI",
    country: "Nigeria",
    region: "West Africa",
    accreditation: "NUC CCMAS Standard",
    facultyMap: {
      Engineering: "Faculty of Technology",
      Computing: "Faculty of Science",
      Science: "Faculty of Science",
      Health: "College of Medicine (UCH)",
      Business: "Faculty of Economics & Management",
      Law: "Faculty of Law",
      General: "Centre for General Studies",
    }
  },
  {
    name: "Ahmadu Bello University",
    shortCode: "ABU",
    country: "Nigeria",
    region: "West Africa",
    accreditation: "NUC CCMAS Standard",
    facultyMap: {
      Engineering: "Faculty of Engineering",
      Computing: "Faculty of Physical Sciences",
      Science: "Faculty of Physical Sciences",
      Health: "College of Medical Sciences",
      Business: "Faculty of Administration",
      Law: "Faculty of Law",
      General: "Division of General Studies",
    }
  },
  {
    name: "University of Benin",
    shortCode: "UNIBEN",
    country: "Nigeria",
    region: "West Africa",
    accreditation: "NUC CCMAS Standard",
    facultyMap: {
      Engineering: "Faculty of Engineering",
      Computing: "Faculty of Physical Sciences",
      Science: "Faculty of Physical Sciences",
      Health: "College of Medical Sciences",
      Business: "Faculty of Management Sciences",
      Law: "Faculty of Law",
      General: "General Studies Directorate",
    }
  },
  {
    name: "National Open University of Nigeria",
    shortCode: "NOUN",
    country: "Nigeria",
    region: "West Africa",
    accreditation: "NUC CCMAS Standard",
    facultyMap: {
      Engineering: "Faculty of Sciences",
      Computing: "Faculty of Sciences",
      Science: "Faculty of Sciences",
      Health: "Faculty of Health Sciences",
      Business: "Faculty of Management Sciences",
      Law: "Faculty of Law",
      General: "Directorate of General Studies",
    }
  },
  {
    name: "Covenant University",
    shortCode: "Covenant",
    country: "Nigeria",
    region: "West Africa",
    accreditation: "NUC CCMAS Standard",
    facultyMap: {
      Engineering: "College of Engineering",
      Computing: "College of Science & Technology",
      Science: "College of Science & Technology",
      Health: "College of Science & Technology",
      Business: "College of Management & Social Sciences",
      Law: "College of Leadership Development",
      General: "Centre for General Studies",
    }
  },
  {
    name: "University of Nigeria, Nsukka",
    shortCode: "UNN",
    country: "Nigeria",
    region: "West Africa",
    accreditation: "NUC CCMAS Standard",
    facultyMap: {
      Engineering: "Faculty of Engineering",
      Computing: "Faculty of Physical Sciences",
      Science: "Faculty of Biological & Physical Sciences",
      Health: "College of Medicine",
      Business: "Faculty of Business Administration",
      Law: "Faculty of Law",
      General: "School of General Studies",
    }
  },
  {
    name: "Lagos State University",
    shortCode: "LASU",
    country: "Nigeria",
    region: "West Africa",
    accreditation: "NUC CCMAS Standard",
    facultyMap: {
      Engineering: "Faculty of Engineering (Epe)",
      Computing: "Faculty of Science",
      Science: "Faculty of Science",
      Health: "Lagos State University College of Medicine (LASUCOM)",
      Business: "Faculty of Management Sciences",
      Law: "Faculty of Law",
      General: "Directorate of General Nigerian Studies",
    }
  },

  // --- UNITED STATES ---
  {
    name: "Massachusetts Institute of Technology",
    shortCode: "MIT",
    country: "United States",
    region: "North America",
    accreditation: "NECHE / ABET Accredited",
    facultyMap: {
      Engineering: "School of Engineering",
      Computing: "EECS & Schwarzman College of Computing",
      Science: "School of Science",
      Health: "Institute for Medical Engineering & Science (IMES)",
      Business: "Sloan School of Management",
      Law: "Department of Humanities & Social Sciences",
      General: "Undergraduate Academic Affairs",
    }
  },
  {
    name: "Stanford University",
    shortCode: "Stanford",
    country: "United States",
    region: "North America",
    accreditation: "WASC / ABET Accredited",
    facultyMap: {
      Engineering: "School of Engineering",
      Computing: "Department of Computer Science",
      Science: "School of Humanities & Sciences",
      Health: "Stanford School of Medicine",
      Business: "Stanford Graduate School of Business",
      Law: "Stanford Law School",
      General: "Undergraduate Education",
    }
  },
  {
    name: "Harvard University",
    shortCode: "Harvard",
    country: "United States",
    region: "North America",
    accreditation: "NECHE / Ivy League Benchmark",
    facultyMap: {
      Engineering: "John A. Paulson School of Engineering and Applied Sciences",
      Computing: "SEAS / Department of Computer Science",
      Science: "Faculty of Arts and Sciences",
      Health: "Harvard Medical School",
      Business: "Harvard Business School",
      Law: "Harvard Law School",
      General: "Harvard College Academic Affairs",
    }
  },
  {
    name: "University of California, Berkeley",
    shortCode: "UC Berkeley",
    country: "United States",
    region: "North America",
    accreditation: "WASC / ABET Accredited",
    facultyMap: {
      Engineering: "College of Engineering",
      Computing: "College of Computing, Data Science, and Society (CDSS)",
      Science: "College of Letters and Science",
      Health: "UC Berkeley Public Health & Bioengineering",
      Business: "Haas School of Business",
      Law: "Berkeley Law",
      General: "Undergraduate Division",
    }
  },
  {
    name: "Carnegie Mellon University",
    shortCode: "CMU",
    country: "United States",
    region: "North America",
    accreditation: "MSCHE / ABET Accredited",
    facultyMap: {
      Engineering: "College of Engineering",
      Computing: "School of Computer Science",
      Science: "Mellon College of Science",
      Health: "Biomedical Engineering & Computational Biology",
      Business: "Tepper School of Business",
      Law: "Department of Social and Decision Sciences",
      General: "University Academic Review",
    }
  },
  {
    name: "Princeton University",
    shortCode: "Princeton",
    country: "United States",
    region: "North America",
    accreditation: "MSCHE / Ivy League Benchmark",
    facultyMap: {
      Engineering: "School of Engineering and Applied Science",
      Computing: "Department of Computer Science",
      Science: "Division of Natural Sciences",
      Health: "Molecular Biology & Quantitative Neuroscience",
      Business: "Department of Economics & Bendheim Center",
      Law: "School of Public and International Affairs",
      General: "Office of the Dean of the College",
    }
  },

  // --- UNITED KINGDOM ---
  {
    name: "University of Oxford",
    shortCode: "Oxford",
    country: "United Kingdom",
    region: "Europe",
    accreditation: "QAA UK Benchmark Standard",
    facultyMap: {
      Engineering: "Department of Engineering Science",
      Computing: "Department of Computer Science",
      Science: "Mathematical, Physical and Life Sciences Division",
      Health: "Medical Sciences Division",
      Business: "Saïd Business School",
      Law: "Faculty of Law",
      General: "Collegiate Tutorial Board",
    }
  },
  {
    name: "University of Cambridge",
    shortCode: "Cambridge",
    country: "United Kingdom",
    region: "Europe",
    accreditation: "QAA UK Benchmark Standard",
    facultyMap: {
      Engineering: "Department of Engineering",
      Computing: "Department of Computer Science and Technology",
      Science: "School of the Physical Sciences",
      Health: "School of Clinical Medicine",
      Business: "Judge Business School",
      Law: "Faculty of Law",
      General: "Cambridge General Board of the Faculties",
    }
  },
  {
    name: "Imperial College London",
    shortCode: "Imperial",
    country: "United Kingdom",
    region: "Europe",
    accreditation: "QAA / Engineering Council UK",
    facultyMap: {
      Engineering: "Faculty of Engineering",
      Computing: "Department of Computing",
      Science: "Faculty of Natural Sciences",
      Health: "Faculty of Medicine",
      Business: "Imperial College Business School",
      Law: "Centre for Academic English & Humanities",
      General: "Imperial Education Council",
    }
  },
  {
    name: "University College London",
    shortCode: "UCL",
    country: "United Kingdom",
    region: "Europe",
    accreditation: "QAA UK Benchmark Standard",
    facultyMap: {
      Engineering: "Faculty of Engineering Sciences",
      Computing: "Department of Computer Science",
      Science: "Faculty of Mathematical & Physical Sciences",
      Health: "Faculty of Medical Sciences",
      Business: "UCL School of Management",
      Law: "Faculty of Laws",
      General: "UCL Academic Board",
    }
  },

  // --- CANADA ---
  {
    name: "University of Toronto",
    shortCode: "U of T",
    country: "Canada",
    region: "North America",
    accreditation: "CEAB / Canadian Universities Benchmark",
    facultyMap: {
      Engineering: "Faculty of Applied Science & Engineering",
      Computing: "Department of Computer Science",
      Science: "Faculty of Arts & Science",
      Health: "Temerty Faculty of Medicine",
      Business: "Rotman School of Management",
      Law: "Faculty of Law",
      General: "Faculty of Arts & Science",
    }
  },
  {
    name: "University of British Columbia",
    shortCode: "UBC",
    country: "Canada",
    region: "North America",
    accreditation: "CEAB / Canadian Standards",
    facultyMap: {
      Engineering: "Faculty of Applied Science",
      Computing: "Department of Computer Science",
      Science: "Faculty of Science",
      Health: "Faculty of Medicine",
      Business: "Sauder School of Business",
      Law: "Peter A. Allard School of Law",
      General: "Undergraduate Academic Office",
    }
  },
  {
    name: "McGill University",
    shortCode: "McGill",
    country: "Canada",
    region: "North America",
    accreditation: "CEAB / Canadian Standards",
    facultyMap: {
      Engineering: "Faculty of Engineering",
      Computing: "School of Computer Science",
      Science: "Faculty of Science",
      Health: "Faculty of Medicine and Health Sciences",
      Business: "Desautels Faculty of Management",
      Law: "Faculty of Law",
      General: "Office of the Deputy Provost (Student Life and Learning)",
    }
  },

  // --- AUSTRALIA ---
  {
    name: "University of Melbourne",
    shortCode: "UniMelb",
    country: "Australia",
    region: "Oceania",
    accreditation: "TEQSA / Group of Eight Benchmark",
    facultyMap: {
      Engineering: "Faculty of Engineering and Information Technology",
      Computing: "School of Computing and Information Systems",
      Science: "Faculty of Science",
      Health: "Faculty of Medicine, Dentistry and Health Sciences",
      Business: "Faculty of Business and Economics",
      Law: "Melbourne Law School",
      General: "Melbourne Academic Board",
    }
  },
  {
    name: "University of Sydney",
    shortCode: "USYD",
    country: "Australia",
    region: "Oceania",
    accreditation: "TEQSA / Group of Eight Benchmark",
    facultyMap: {
      Engineering: "Faculty of Engineering",
      Computing: "School of Computer Science",
      Science: "Faculty of Science",
      Health: "Faculty of Medicine and Health",
      Business: "University of Sydney Business School",
      Law: "Sydney Law School",
      General: "Academic Curriculum Board",
    }
  },
  {
    name: "Australian National University",
    shortCode: "ANU",
    country: "Australia",
    region: "Oceania",
    accreditation: "TEQSA / Group of Eight Benchmark",
    facultyMap: {
      Engineering: "College of Engineering, Computing and Cybernetics",
      Computing: "School of Computing",
      Science: "College of Science",
      Health: "College of Health and Medicine",
      Business: "College of Business and Economics",
      Law: "ANU College of Law",
      General: "Office of Academic Standards",
    }
  },

  // --- INDIA ---
  {
    name: "Indian Institute of Technology Bombay",
    shortCode: "IIT Bombay",
    country: "India",
    region: "Asia",
    accreditation: "Institute of National Importance (INI)",
    facultyMap: {
      Engineering: "Department of Mechanical & Civil Engineering",
      Computing: "Department of Computer Science and Engineering",
      Science: "Department of Physics & Chemistry",
      Health: "Department of Biosciences and Bioengineering",
      Business: "Shailesh J. Mehta School of Management",
      Law: "Department of Humanities and Social Sciences",
      General: "Undergraduate Curriculum Council",
    }
  },
  {
    name: "Indian Institute of Technology Delhi",
    shortCode: "IIT Delhi",
    country: "India",
    region: "Asia",
    accreditation: "Institute of National Importance (INI)",
    facultyMap: {
      Engineering: "School of Interdisciplinary Research & Engineering",
      Computing: "Department of Computer Science and Engineering",
      Science: "Department of Physical and Mathematical Sciences",
      Health: "Centre for Biomedical Engineering",
      Business: "Department of Management Studies",
      Law: "Department of Humanities and Social Sciences",
      General: "Board of Academic Programmes",
    }
  },
  {
    name: "Indian Institute of Science Bangalore",
    shortCode: "IISc",
    country: "India",
    region: "Asia",
    accreditation: "Institute of National Importance (INI)",
    facultyMap: {
      Engineering: "Division of Mechanical & Electrical Sciences",
      Computing: "Department of Computational and Data Sciences",
      Science: "Division of Physical and Mathematical Sciences",
      Health: "Division of Biological Sciences",
      Business: "Department of Management Studies",
      Law: "Centre for Contemporary Studies",
      General: "Senate Committee for Undergraduate Education",
    }
  },

  // --- SOUTH AFRICA ---
  {
    name: "University of Cape Town",
    shortCode: "UCT",
    country: "South Africa",
    region: "Southern Africa",
    accreditation: "CHE South Africa / ECSA Accredited",
    facultyMap: {
      Engineering: "Faculty of Engineering & the Built Environment",
      Computing: "Department of Computer Science",
      Science: "Faculty of Science",
      Health: "Faculty of Health Sciences (Groote Schuur)",
      Business: "Faculty of Commerce",
      Law: "Faculty of Law",
      General: "Centre for Higher Education Development",
    }
  },
  {
    name: "University of the Witwatersrand",
    shortCode: "Wits",
    country: "South Africa",
    region: "Southern Africa",
    accreditation: "CHE South Africa / ECSA Accredited",
    facultyMap: {
      Engineering: "Faculty of Engineering and the Built Environment",
      Computing: "School of Computer Science and Applied Mathematics",
      Science: "Faculty of Science",
      Health: "Faculty of Health Sciences",
      Business: "Faculty of Commerce, Law and Management",
      Law: "Wits School of Law",
      General: "Academic Standards Committee",
    }
  },

  // --- GHANA ---
  {
    name: "University of Ghana",
    shortCode: "UG Legon",
    country: "Ghana",
    region: "West Africa",
    accreditation: "GTEC / West African Benchmark",
    facultyMap: {
      Engineering: "School of Engineering Sciences",
      Computing: "Department of Computer Science",
      Science: "College of Basic and Applied Sciences",
      Health: "College of Health Sciences (Korle Bu)",
      Business: "University of Ghana Business School",
      Law: "University of Ghana School of Law",
      General: "Academic Affairs Directorate",
    }
  },
  {
    name: "Kwame Nkrumah University of Science and Technology",
    shortCode: "KNUST",
    country: "Ghana",
    region: "West Africa",
    accreditation: "GTEC / West African Benchmark",
    facultyMap: {
      Engineering: "College of Engineering",
      Computing: "Department of Computer Science",
      Science: "College of Science",
      Health: "College of Health Sciences",
      Business: "KNUST School of Business",
      Law: "Faculty of Law",
      General: "Quality Assurance and Planning Directorate",
    }
  },

  // --- KENYA ---
  {
    name: "University of Nairobi",
    shortCode: "UoN",
    country: "Kenya",
    region: "East Africa",
    accreditation: "CUE Kenya / East African Standards",
    facultyMap: {
      Engineering: "Faculty of Engineering",
      Computing: "Department of Computing and Informatics",
      Science: "Faculty of Science and Technology",
      Health: "Faculty of Health Sciences",
      Business: "Faculty of Business and Management Sciences",
      Law: "Faculty of Law",
      General: "Undergraduate Studies Committee",
    }
  },

  // --- GERMANY ---
  {
    name: "Technical University of Munich",
    shortCode: "TUM",
    country: "Germany",
    region: "Europe",
    accreditation: "German Universities Excellence Initiative",
    facultyMap: {
      Engineering: "TUM School of Engineering and Design",
      Computing: "TUM School of Computation, Information and Technology",
      Science: "TUM School of Natural Sciences",
      Health: "TUM School of Medicine and Health",
      Business: "TUM School of Management",
      Law: "TUM School of Social Sciences and Technology",
      General: "Academic Quality Board",
    }
  },
  {
    name: "Heidelberg University",
    shortCode: "Heidelberg",
    country: "Germany",
    region: "Europe",
    accreditation: "German Universities Excellence Initiative",
    facultyMap: {
      Engineering: "Faculty of Engineering Sciences",
      Computing: "Institute of Computer Science",
      Science: "Faculty of Mathematics and Natural Sciences",
      Health: "Medical Faculty Heidelberg",
      Business: "Alfred Weber Institute for Economics",
      Law: "Faculty of Law",
      General: "Heidelberg Academic Council",
    }
  },

  // --- FRANCE ---
  {
    name: "Sorbonne University",
    shortCode: "Sorbonne",
    country: "France",
    region: "Europe",
    accreditation: "HCERES French Higher Education Benchmark",
    facultyMap: {
      Engineering: "Faculty of Science and Engineering",
      Computing: "Department of Computer Science (LIP6)",
      Science: "Faculty of Science and Engineering",
      Health: "Faculty of Medicine (Pitié-Salpêtrière)",
      Business: "Faculty of Arts, Humanities and Economics",
      Law: "Paris Faculty of Law",
      General: "Sorbonne Academic Senate",
    }
  },
  {
    name: "École Polytechnique",
    shortCode: "l'X",
    country: "France",
    region: "Europe",
    accreditation: "CTI / Institut Polytechnique de Paris",
    facultyMap: {
      Engineering: "Department of Mechanics and Applied Mathematics",
      Computing: "Department of Computer Science (DIX)",
      Science: "Department of Physics & Chemistry",
      Health: "Department of Biology & Bioengineering",
      Business: "Department of Economics and Management",
      Law: "Department of Humanities and Social Sciences",
      General: "Council of Academic Studies",
    }
  },

  // --- SWITZERLAND ---
  {
    name: "ETH Zurich",
    shortCode: "ETH Zurich",
    country: "Switzerland",
    region: "Europe",
    accreditation: "Swiss Federal Institutes Benchmark",
    facultyMap: {
      Engineering: "Department of Mechanical and Process Engineering",
      Computing: "Department of Computer Science",
      Science: "Department of Mathematics and Physics",
      Health: "Department of Health Sciences and Technology",
      Business: "Department of Management, Technology, and Economics",
      Law: "Department of Humanities, Social and Political Sciences",
      General: "ETH Rectorate Academic Office",
    }
  },
  {
    name: "EPFL",
    shortCode: "EPFL",
    country: "Switzerland",
    region: "Europe",
    accreditation: "Swiss Federal Institutes Benchmark",
    facultyMap: {
      Engineering: "School of Engineering (STI)",
      Computing: "School of Computer and Communication Sciences (IC)",
      Science: "School of Basic Sciences (SB)",
      Health: "School of Life Sciences (SV)",
      Business: "College of Management of Technology (CDM)",
      Law: "College of Humanities (CDH)",
      General: "EPFL Education Committee",
    }
  },

  // --- SINGAPORE ---
  {
    name: "National University of Singapore",
    shortCode: "NUS",
    country: "Singapore",
    region: "Asia",
    accreditation: "Ministry of Education Singapore Benchmark",
    facultyMap: {
      Engineering: "College of Design and Engineering (CDE)",
      Computing: "School of Computing",
      Science: "Faculty of Science",
      Health: "Yong Loo Lin School of Medicine",
      Business: "NUS Business School",
      Law: "Faculty of Law",
      General: "Office of the Vice Provost (Academic Affairs)",
    }
  },
  {
    name: "Nanyang Technological University",
    shortCode: "NTU",
    country: "Singapore",
    region: "Asia",
    accreditation: "Ministry of Education Singapore Benchmark",
    facultyMap: {
      Engineering: "College of Engineering",
      Computing: "College of Computing and Data Science (CCDS)",
      Science: "College of Science",
      Health: "Lee Kong Chian School of Medicine",
      Business: "Nanyang Business School",
      Law: "School of Social Sciences",
      General: "Office of Academic Services",
    }
  },

  // --- JAPAN ---
  {
    name: "The University of Tokyo",
    shortCode: "Todai",
    country: "Japan",
    region: "Asia",
    accreditation: "MEXT Japan National University Standard",
    facultyMap: {
      Engineering: "Faculty of Engineering",
      Computing: "Department of Information Science",
      Science: "Faculty of Science",
      Health: "Faculty of Medicine",
      Business: "Faculty of Economics",
      Law: "Faculty of Law",
      General: "College of Arts and Sciences (Komaba)",
    }
  },
  {
    name: "Kyoto University",
    shortCode: "Kyoto",
    country: "Japan",
    region: "Asia",
    accreditation: "MEXT Japan National University Standard",
    facultyMap: {
      Engineering: "Faculty of Engineering",
      Computing: "Department of Intelligence Science and Technology",
      Science: "Faculty of Science",
      Health: "Faculty of Medicine",
      Business: "Faculty of Economics",
      Law: "Faculty of Law",
      General: "Institute for Liberal Arts and Sciences",
    }
  },

  // --- CHINA ---
  {
    name: "Tsinghua University",
    shortCode: "Tsinghua",
    country: "China",
    region: "Asia",
    accreditation: "Ministry of Education China / Double First Class",
    facultyMap: {
      Engineering: "School of Mechanical & Civil Engineering",
      Computing: "Department of Computer Science and Technology",
      Science: "School of Sciences",
      Health: "School of Medicine",
      Business: "School of Economics and Management",
      Law: "School of Law",
      General: "Academic Affairs Office",
    }
  },
  {
    name: "Peking University",
    shortCode: "PKU",
    country: "China",
    region: "Asia",
    accreditation: "Ministry of Education China / Double First Class",
    facultyMap: {
      Engineering: "College of Engineering",
      Computing: "School of Computer Science",
      Science: "Faculty of Science",
      Health: "Peking University Health Science Center (PUHSC)",
      Business: "Guanghua School of Management",
      Law: "Peking University Law School",
      General: "Undergraduate Academic Affairs",
    }
  },

  // --- BRAZIL ---
  {
    name: "University of São Paulo",
    shortCode: "USP",
    country: "Brazil",
    region: "South America",
    accreditation: "MEC Brazil / Latin America Top Benchmark",
    facultyMap: {
      Engineering: "Escola Politécnica (Poli-USP)",
      Computing: "Institute of Mathematics and Statistics (IME)",
      Science: "Institute of Physics & Chemistry",
      Health: "Faculdade de Medicina (FMUSP)",
      Business: "Faculdade de Economia, Administração e Contabilidade (FEA)",
      Law: "Faculdade de Direito do Largo de São Francisco",
      General: "Pró-Reitoria de Graduação",
    }
  },

  // --- EGYPT ---
  {
    name: "Cairo University",
    shortCode: "Cairo Uni",
    country: "Egypt",
    region: "North Africa / Middle East",
    accreditation: "NAQAAE Egypt Accreditation Benchmark",
    facultyMap: {
      Engineering: "Faculty of Engineering",
      Computing: "Faculty of Computers and Artificial Intelligence",
      Science: "Faculty of Science",
      Health: "Faculty of Medicine (Kasr Al-Ainy)",
      Business: "Faculty of Commerce",
      Law: "Faculty of Law",
      General: "University Academic Committee",
    }
  },

  // --- NETHERLANDS ---
  {
    name: "Delft University of Technology",
    shortCode: "TU Delft",
    country: "Netherlands",
    region: "Europe",
    accreditation: "NVAO Netherlands / IDEA League",
    facultyMap: {
      Engineering: "Faculty of Mechanical, Maritime and Materials Engineering",
      Computing: "Faculty of Electrical Engineering, Mathematics and Computer Science (EEMCS)",
      Science: "Faculty of Applied Sciences",
      Health: "Department of Bionanoscience",
      Business: "Faculty of Technology, Policy and Management",
      Law: "Department of Values, Technology and Innovation",
      General: "TU Delft Board of Studies",
    }
  },

  // --- SWEDEN ---
  {
    name: "KTH Royal Institute of Technology",
    shortCode: "KTH",
    country: "Sweden",
    region: "Europe",
    accreditation: "Swedish Higher Education Authority (UKÄ)",
    facultyMap: {
      Engineering: "School of Industrial Engineering and Management",
      Computing: "School of Electrical Engineering and Computer Science (EECS)",
      Science: "School of Engineering Sciences",
      Health: "School of Engineering Sciences in Chemistry, Biotechnology and Health",
      Business: "Department of Industrial Economics and Management",
      Law: "Department of Philosophy and History of Technology",
      General: "KTH Education Committee",
    }
  },

  // --- SOUTH KOREA ---
  {
    name: "Seoul National University",
    shortCode: "SNU",
    country: "South Korea",
    region: "Asia",
    accreditation: "Ministry of Education Korea Benchmark",
    facultyMap: {
      Engineering: "College of Engineering",
      Computing: "Department of Computer Science and Engineering",
      Science: "College of Natural Sciences",
      Health: "College of Medicine",
      Business: "College of Business Administration",
      Law: "School of Law",
      General: "Faculty of Liberal Education",
    }
  }
];

export const INTERNATIONAL_COURSES = [
  // --- COMPUTER SCIENCE & AI ---
  {
    course_code: "CS 101",
    title: "Introduction to Computer Science & Algorithmic Problem Solving",
    course: "Computer Science",
    category: "Computing",
    level: "100L / Freshman",
    topics: [
      "Algorithmic Problem Solving and Flowcharts",
      "Time and Space Asymptotic Complexity (Big-O)",
      "Recursion, Call Stacks and Inductive Proofs",
      "Dynamic Memory Management and Pointers",
      "Sorting and Searching Algorithms (MergeSort, QuickSort)"
    ],
    recommended_textbooks: [
      "Introduction to Algorithms (CLRS) - Cormen, Leiserson, Rivest, Stein",
      "Structure and Interpretation of Computer Programs (SICP) - Abelson & Sussman"
    ]
  },
  {
    course_code: "CS 201",
    title: "Data Structures & Object-Oriented Software Design",
    course: "Computer Science",
    category: "Computing",
    level: "200L / Sophomore",
    topics: [
      "Linked Lists, Stacks and Queue Implementations",
      "Self-Balancing Binary Search Trees (AVL and Red-Black Trees)",
      "Hash Tables, Collision Resolution and Load Factors",
      "Object-Oriented Design Patterns (Factory, Observer, Singleton)",
      "Priority Queues and Binary Heaps"
    ],
    recommended_textbooks: [
      "Data Structures and Algorithm Analysis in Java - Mark Allen Weiss",
      "Design Patterns: Elements of Reusable Object-Oriented Software - Gang of Four"
    ]
  },
  {
    course_code: "AI 401",
    title: "Artificial Intelligence, Deep Learning & Neural Networks",
    course: "Artificial Intelligence / Computer Science",
    category: "Computing",
    level: "400L / Senior",
    topics: [
      "Supervised Machine Learning and Gradient Descent",
      "Multilayer Perceptrons and Backpropagation Calculus",
      "Convolutional Neural Networks (CNN) for Computer Vision",
      "Transformer Architectures and Self-Attention Mechanisms",
      "Reinforcement Learning, Markov Decision Processes and Q-Learning"
    ],
    recommended_textbooks: [
      "Deep Learning - Goodfellow, Bengio, Courville",
      "Artificial Intelligence: A Modern Approach - Russell & Norvig"
    ]
  },
  {
    course_code: "SWE 301",
    title: "Software Engineering Principles, Architecture & Distributed Systems",
    course: "Software Engineering",
    category: "Computing",
    level: "300L / Junior",
    topics: [
      "Microservices Architecture and API Gateway Patterns",
      "Continuous Integration, Deployment Pipelines and DevOps",
      "Database Sharding, Replication and CAP Theorem",
      "Test-Driven Development (TDD) and Automated Unit Testing",
      "Scalable Concurrency, Async Event Loops and Message Queues"
    ],
    recommended_textbooks: [
      "Designing Data-Intensive Applications - Martin Kleppmann",
      "Clean Architecture: A Craftsman's Guide - Robert C. Martin"
    ]
  },
  {
    course_code: "CYB 301",
    title: "Cybersecurity, Modern Cryptography & Network Defense",
    course: "Cybersecurity",
    category: "Computing",
    level: "300L / Junior",
    topics: [
      "Symmetric and Asymmetric Cryptography (AES, RSA, ECC)",
      "Public Key Infrastructure, X.509 Certificates and TLS Handshakes",
      "Web Application Vulnerabilities (OWASP Top 10, SQLi, XSS)",
      "Zero Trust Architecture and Identity Access Management (IAM)",
      "Intrusion Detection Systems, Firewalls and Packet Analysis"
    ],
    recommended_textbooks: [
      "Cryptography and Network Security - William Stallings",
      "The Web Application Hacker's Handbook - Stuttard & Pinto"
    ]
  },

  // --- MATHEMATICS & QUANTITATIVE METHODS ---
  {
    course_code: "MATH 101",
    title: "Calculus I: Differential & Integral Single-Variable Analysis",
    course: "Mathematics",
    category: "Science",
    level: "100L / Freshman",
    topics: [
      "Limits, Epsilon-Delta Rigor and Continuity of Functions",
      "Differentiation Rules (Product, Quotient, Chain Rule)",
      "Applications of Derivatives: Optimization and Related Rates",
      "Riemann Sums, Definite Integrals and Fundamental Theorem of Calculus",
      "Integration Techniques: Substitution and Partial Fractions"
    ],
    recommended_textbooks: [
      "Calculus: Early Transcendentals - James Stewart",
      "Thomas' Calculus - Thomas, Weir, Hass"
    ]
  },
  {
    course_code: "MATH 205",
    title: "Linear Algebra, Vector Spaces & Matrix Decomposition",
    course: "Mathematics / Engineering",
    category: "Science",
    level: "200L / Sophomore",
    topics: [
      "Vector Spaces, Subspaces and Linear Independence",
      "Matrix Inverses, Gaussian Elimination and Determinants",
      "Linear Transformations, Kernel and Image Dimensions",
      "Eigenvalues, Eigenvectors and Diagonalization",
      "Singular Value Decomposition (SVD) and Orthogonal Projections"
    ],
    recommended_textbooks: [
      "Linear Algebra and Its Applications - Gilbert Strang",
      "Linear Algebra Done Right - Sheldon Axler"
    ]
  },
  {
    course_code: "STA 201",
    title: "Probability Theory, Mathematical Statistics & Inference",
    course: "Statistics / Mathematics",
    category: "Science",
    level: "200L / Sophomore",
    topics: [
      "Probability Axioms, Conditional Probability and Bayes Theorem",
      "Discrete and Continuous Random Variables (Poisson, Normal, Exponential)",
      "Central Limit Theorem and Law of Large Numbers",
      "Maximum Likelihood Estimation (MLE) and Confidence Intervals",
      "Hypothesis Testing, P-values, Type I/II Errors and ANOVA"
    ],
    recommended_textbooks: [
      "Introduction to Probability - Dimitri Bertsekas & John Tsitsiklis",
      "Mathematical Statistics with Applications - Wackerly, Mendenhall, Scheaffer"
    ]
  },

  // --- ENGINEERING & APPLIED MECHANICS ---
  {
    course_code: "ENGR 201",
    title: "Engineering Mechanics: Statics & Structural Equilibrium",
    course: "Mechanical & Civil Engineering",
    category: "Engineering",
    level: "200L / Sophomore",
    topics: [
      "Particle Equilibrium and 2D/3D Force Vectors",
      "Rigid Body Equilibrium and Free Body Diagrams",
      "Truss Analysis: Method of Joints and Method of Sections",
      "Internal Forces, Shear and Bending Moment Distributions",
      "Friction Laws, Centroids and Area Moments of Inertia"
    ],
    recommended_textbooks: [
      "Vector Mechanics for Engineers: Statics - Beer & Johnston",
      "Engineering Mechanics: Statics - R. C. Hibbeler"
    ]
  },
  {
    course_code: "ENGR 205",
    title: "Fluid Mechanics & Transport Phenomena",
    course: "Mechanical & Chemical Engineering",
    category: "Engineering",
    level: "200L / Sophomore",
    topics: [
      "Fluid Statics, Hydrostatic Pressure and Manometry",
      "Bernoulli Equation and Control Volume Energy Formulations",
      "Navier-Stokes Equations and Differential Momentum Conservation",
      "Laminar and Turbulent Pipe Flow (Moody Diagram & Friction Factor)",
      "Boundary Layer Theory and External Aerodynamic Drag"
    ],
    recommended_textbooks: [
      "Fluid Mechanics: Fundamentals and Applications - Yunus Cengel & John Cimbala",
      "Fox and McDonald's Introduction to Fluid Mechanics - Pritchard & Mitchell"
    ]
  },
  {
    course_code: "EE 201",
    title: "Electric Circuit Theory & Linear Network Analysis",
    course: "Electrical & Electronic Engineering",
    category: "Engineering",
    level: "200L / Sophomore",
    topics: [
      "Kirchhoff's Current and Voltage Laws in Resistive Networks",
      "Nodal and Mesh Analysis Techniques",
      "Thevenin, Norton and Maximum Power Transfer Theorems",
      "AC Sinusoidal Steady-State Analysis and Phasor Impedance",
      "Operational Amplifiers: Inverting, Non-Inverting and Active Filters"
    ],
    recommended_textbooks: [
      "Fundamentals of Electric Circuits - Alexander & Sadiku",
      "Electric Circuits - Nilsson & Riedel"
    ]
  },
  {
    course_code: "MEE 201",
    title: "Thermodynamics, Heat Transfer & Energy Systems",
    course: "Mechanical Engineering",
    category: "Engineering",
    level: "200L / Sophomore",
    topics: [
      "First Law of Thermodynamics: Closed and Open System Energy Balances",
      "Second Law, Carnot Cycle, Entropy and Irreversibility",
      "Rankine, Brayton and Vapor-Compression Refrigeration Cycles",
      "Conduction, Convection and Stefan-Boltzmann Radiation Heat Transfer",
      "Heat Exchanger Analysis: LMTD and NTU-Effectiveness Methods"
    ],
    recommended_textbooks: [
      "Thermodynamics: An Engineering Approach - Yunus Cengel & Michael Boles",
      "Fundamentals of Heat and Mass Transfer - Incropera & DeWitt"
    ]
  },

  // --- ECONOMICS, BUSINESS & ACCOUNTING ---
  {
    course_code: "ECON 101",
    title: "Principles of Microeconomics: Markets, Utility & Firm Theory",
    course: "Economics",
    category: "Business",
    level: "100L / Freshman",
    topics: [
      "Scarcity, Opportunity Cost and Production Possibility Frontiers",
      "Supply, Demand and Market Clearing Price Equilibrium",
      "Price, Income and Cross Elasticities of Demand",
      "Consumer Preference Theory and Indifference Curve Analysis",
      "Production Functions, Marginal Costs and Profit Maximization"
    ],
    recommended_textbooks: [
      "Principles of Microeconomics - N. Gregory Mankiw",
      "Microeconomics - Paul Krugman & Robin Wells"
    ]
  },
  {
    course_code: "ECON 102",
    title: "Principles of Macroeconomics: National Income, Monetary Policy & Growth",
    course: "Economics",
    category: "Business",
    level: "100L / Freshman",
    topics: [
      "Gross Domestic Product (GDP) Measurement and National Accounting",
      "Inflation, Consumer Price Index (CPI) and Unemployment Dynamics",
      "Aggregate Demand and Aggregate Supply (AD-AS) Equilibrium",
      "Central Banking, Money Creation and Monetary Policy Tools",
      "Fiscal Policy, Government Debt and Foreign Exchange Regimes"
    ],
    recommended_textbooks: [
      "Principles of Macroeconomics - N. Gregory Mankiw",
      "Macroeconomics - Olivier Blanchard"
    ]
  },
  {
    course_code: "ACCT 101",
    title: "Financial Accounting Principles & Corporate Statement Analysis",
    course: "Accounting",
    category: "Business",
    level: "100L / Freshman",
    topics: [
      "The Fundamental Accounting Equation (Assets = Liabilities + Equity)",
      "Double-Entry Bookkeeping, General Journal and Ledger Posting",
      "Accrual Accounting, Adjusting Entries and Depreciation Methods",
      "Preparation of Balance Sheets, Income Statements and Cash Flows",
      "Financial Ratio Analysis: Liquidity, Solvency and Profitability"
    ],
    recommended_textbooks: [
      "Financial Accounting - Weygandt, Kimmel, Kieso",
      "Principles of Financial Accounting - Wild, Shaw, Chiappetta"
    ]
  },

  // --- MEDICAL & HEALTH SCIENCES ---
  {
    course_code: "MED 201",
    title: "Human Gross Anatomy: Extremities, Thorax & Neuroanatomy",
    course: "Medicine & Surgery",
    category: "Health",
    level: "200L / Year 2",
    topics: [
      "Brachial Plexus Topography and Clinical Neurological Deficits",
      "Thoracic Cavity: Mediastinum, Coronary Circulation and Heart Valves",
      "Femoral Triangle, Popliteal Fossa and Lower Limb Innervation",
      "Cranial Nerves (I-XII): Pathways, Innervation and Clinical Testing",
      "Abdominal Wall, Inguinal Canal and Peritoneal Cavity"
    ],
    recommended_textbooks: [
      "Clinically Oriented Anatomy - Keith L. Moore, Dalley, Agur",
      "Gray's Anatomy for Students - Drake, Vogl, Mitchell"
    ]
  },
  {
    course_code: "MED 202",
    title: "Human Medical Physiology & Organ System Homeostasis",
    course: "Medicine & Surgery",
    category: "Health",
    level: "200L / Year 2",
    topics: [
      "Resting Membrane Potential and Action Potential Propagation",
      "Cardiac Cycle, Wiggers Diagram and Hemodynamic Regulation",
      "Renal Glomerular Filtration, Tubular Reabsorption and Countercurrent System",
      "Pulmonary Gas Exchange, Ventilation-Perfusion and Oxygen Dissociation",
      "Endocrine Control: Hypothalamic-Pituitary Axis and Hormonal Cascades"
    ],
    recommended_textbooks: [
      "Guyton and Hall Textbook of Medical Physiology - John E. Hall",
      "Ganong's Review of Medical Physiology - Barrett, Barman, Boitano"
    ]
  },
  {
    course_code: "PHA 301",
    title: "Medical Pharmacology, Pharmacokinetics & Drug Targets",
    course: "Pharmacy / Medicine",
    category: "Health",
    level: "300L / Year 3",
    topics: [
      "Pharmacokinetics: Absorption, Distribution, Metabolism and Elimination (ADME)",
      "Receptor Theory: Agonists, Antagonists, EC50 and Therapeutic Index",
      "Autonomic Pharmacology: Sympathomimetics and Parasympatholytics",
      "Cardiovascular Drugs: Antihypertensives, Beta-Blockers and ACE Inhibitors",
      "Antimicrobial Mechanisms: Penicillins, Cephalosporins and Antibiotic Resistance"
    ],
    recommended_textbooks: [
      "Goodman & Gilman's The Pharmacological Basis of Therapeutics - Brunton & Hilal-Dandan",
      "Basic and Clinical Pharmacology - Bertram G. Katzung"
    ]
  },

  // --- LAW & JURISPRUDENCE ---
  {
    course_code: "LAW 101",
    title: "Comparative Legal Systems, Constitutional Law & Jurisprudence",
    course: "Law",
    category: "Law",
    level: "100L / Year 1",
    topics: [
      "Sources of Law: Common Law, Civil Law Codes and Customary Traditions",
      "Constitutional Frameworks: Separation of Powers and Rule of Law",
      "Judicial Precedent (Stare Decisis) and Statutory Interpretation",
      "Fundamental Human Rights and Judicial Review Jurisprudence",
      "Theories of Justice: Positivism, Natural Law and Realism"
    ],
    recommended_textbooks: [
      "Introduction to the Study of the Law of the Constitution - A. V. Dicey",
      "Jurisprudence: Theory and Context - Brian Bix"
    ]
  },

  // --- PHYSICAL & LIFE SCIENCES ---
  {
    course_code: "PHY 101",
    title: "General Physics I: Classical Mechanics, Wave Motion & Acoustics",
    course: "Physics",
    category: "Science",
    level: "100L / Freshman",
    topics: [
      "Newtonian Mechanics, Conservation of Linear and Angular Momentum",
      "Work-Energy Theorem, Conservative Forces and Potential Energy Wells",
      "Simple Harmonic Motion, Damped Oscillations and Resonance",
      "Wave Equations, Doppler Effect and Superposition Principles",
      "Gravitation, Keplerian Orbits and Planetary Satellite Dynamics"
    ],
    recommended_textbooks: [
      "University Physics with Modern Physics - Young & Freedman",
      "Fundamentals of Physics - Halliday, Resnick, Walker"
    ]
  },
  {
    course_code: "BIO 101",
    title: "General Biology: Cell Biology, Molecular Genetics & Evolution",
    course: "Biological Sciences",
    category: "Science",
    level: "100L / Freshman",
    topics: [
      "Prokaryotic vs Eukaryotic Cell Ultrastructure and Organelle Function",
      "Cellular Respiration (Glycolysis, Krebs Cycle, Oxidative Phosphorylation)",
      "DNA Replication, Transcription, Translation and Gene Expression Regulation",
      "Mendelian Genetics, Linkage Mapping and Chromosomal Inheritance",
      "Evolutionary Mechanisms: Natural Selection, Genetic Drift and Speciation"
    ],
    recommended_textbooks: [
      "Campbell Biology - Urry, Cain, Wasserman, Minorsky, Reece",
      "Molecular Biology of the Cell - Alberts, Johnson, Lewis"
    ]
  }
];

export const MATERIAL_ARCHETYPES = [
  {
    type: "lecture_note",
    titleTemplate: (uni, code, topic) => `${uni.name}: ${code} Lecture Dossier - ${topic}`,
    descTemplate: (uni, code, topic) => `Comprehensive academic lecture dossier and analytical theoretical formulations on ${topic} for ${code} students at ${uni.name} (${uni.country}). Built to international higher education accreditation benchmarks.`,
  },
  {
    type: "past_question",
    titleTemplate: (uni, code, topic) => `${uni.name}: ${code} Examination Past Questions with Solutions (${topic})`,
    descTemplate: (uni, code, topic) => `University examination questions, model answers, step-by-step marking rubrics, and worked derivations covering ${topic} in ${code} at ${uni.name} (${uni.country}).`,
  },
  {
    type: "textbook",
    titleTemplate: (uni, code, topic) => `${uni.name} Reference Series: ${code} Academic Textbook - ${topic}`,
    descTemplate: (uni, code, topic) => `Authoritative university textbook and reference compendium on ${topic} for ${code} students at ${uni.name} (${uni.country}). Features complete chapter treatises, rigorous theoretical derivations, and end-of-chapter assessment problem sets.`,
  },
  {
    type: "handout",
    titleTemplate: (uni, code, topic) => `${uni.name}: ${code} Departmental Handout - ${topic}`,
    descTemplate: (uni, code, topic) => `Official departmental tutorial guide, reference formula sheet, and core conceptual review on ${topic} for ${code} candidates at ${uni.name} (${uni.country}).`,
  },
  {
    type: "lab_manual",
    titleTemplate: (uni, code, topic) => `${uni.name}: ${code} Practical Laboratory Manual - ${topic}`,
    descTemplate: (uni, code, topic) => `Standard institutional laboratory guide detailing experimental procedures, instrumentation calibration, observation tables, and safety protocols for ${topic} in ${code} at ${uni.name} (${uni.country}).`,
  }
];

function resolveFacultyAndDept(course, uni) {
  const category = course.category || "General";
  const faculty = uni.facultyMap?.[category] || uni.facultyMap?.General || "Faculty of Higher Academic Studies";
  const dept = `Department of ${course.course}`;
  return { faculty, dept };
}

/**
 * Builds rich, subject-matter-specific modules for a given topic and archetype
 */
export function buildGlobalTopicModules(course, topic, archetype, uni) {
  if (archetype.type === "textbook") {
    return [
      {
        title: `Chapter 1: Comprehensive Theoretical Foundations & Axioms of ${topic}`,
        content: [
          `This foundational chapter establishes the formal academic treatise of ${topic} for ${course.course_code} (${course.title}) within the official curriculum of ${uni.name} (${uni.country}). All discussions conform to ${uni.accreditation || 'International Academic Standards'}.`,
          `Rigorous understanding demands mastering primary definitions, physical or logical interpretations, and standard notation. Prescribed benchmark texts for this volume include ${course.recommended_textbooks ? course.recommended_textbooks.join(' and ') : 'Prescribed International References'}.`
        ],
        points: [
          `Comprehensive conceptual scope, formal mathematical definitions, and boundaries of ${topic}.`,
          `Universal governing theorems, thermodynamic/computational laws, and empirical validations.`,
          `Historical lineage, foundational scholarly papers, and contemporary state-of-the-art developments.`
        ]
      },
      {
        title: `Chapter 2: Analytical Formulations, Rigorous Proofs & Governing Equations`,
        content: [
          `This chapter details the mathematical and analytical apparatus of ${topic}. Step-by-step proofs are provided from first principles, demonstrating how complex systems are modeled under standard assumptions.`,
          `Special emphasis is placed on dimensional homogeneity across all derived formulas, boundary value constraints, and asymptotic limits as parameters approach critical thresholds.`
        ],
        points: [
          `Rigorous first-principles derivation of all governing analytical expressions for ${topic}.`,
          `Vector and matrix representations, coordinate transformations, and invariance principles.`,
          `Sensitivity analysis, stability criteria, and parameter optimization techniques.`
        ]
      },
      {
        title: `Chapter 3: Applied Methodologies, Practical Implementations & Case Studies`,
        content: [
          `Theory is bridged directly to professional industrial and laboratory practice at ${uni.name}. Real-world case studies illustrate the application of ${topic} across modern technological and scientific challenges.`,
          `Engineers, scientists, and analysts must apply standard error tolerances, conform to international ISO/IEEE/OSHA standards, and design resilient operational safeguards.`
        ],
        points: [
          `Industrial case studies highlighting direct application in high-consequence environments.`,
          `Design methodologies, computational simulations, and empirical verification procedures.`,
          `Troubleshooting failure modes, diagnostic rubrics, and risk mitigation strategies.`
        ]
      },
      {
        title: `Chapter 4: End-of-Chapter Self-Assessment Problem Sets & Solutions`,
        content: [
          `To reinforce mastery, this chapter presents progressive quantitative and theoretical exercises ranging from foundational conceptual checks to comprehensive synthesis problems.`,
          `Full solutions and analytical notes are provided to facilitate independent study and mastery for university examinations and professional certifications.`
        ],
        points: [
          `Diagnostic conceptual questions testing fundamental definitions and qualitative reasoning.`,
          `Multi-step quantitative derivation problems with full intermediate solutions.`,
          `Challenging synthesis capstone problems bridging multiple curricular modules.`
        ]
      }
    ];
  }

  if (archetype.type === "lab_manual") {
    return [
      {
        title: `Module 1: Laboratory Safety Protocols, PPE & Regulatory Standards`,
        content: [
          `Practical laboratory investigations in ${course.course_code} at ${uni.name} require strict compliance with institutional and international environmental health and safety codes.`,
          `Before entering the laboratory workspace, all students must complete prerequisite safety inductions, locate emergency shut-off valves, eye-wash stations, and wear prescribed Personal Protective Equipment (PPE).`
        ],
        points: [
          `Mandatory PPE requirements, hazardous material handling, and chemical/electrical safety.`,
          `Emergency protocols, spill response, and equipment shutdown procedures.`,
          `Standard laboratory etiquette, housekeeping, and waste disposal regulations.`
        ]
      },
      {
        title: `Module 2: Experimental Apparatus, Instrument Calibration & Measurement Precision`,
        content: [
          `Accurate experimental verification of ${topic} relies on precision instrumentation. Students must calibrate all sensors, dials, or digital data acquisition systems prior to acquiring baseline measurements.`,
          `Zero-error corrections and environmental baseline readings (temperature, ambient pressure, humidity) must be logged systematically in official lab workbooks.`
        ],
        points: [
          `Detailed apparatus schematic, component specifications, and wiring/piping layout.`,
          `Multi-point calibration procedures and calibration curve verification.`,
          `Manufacturer measurement tolerances and systematic error identification.`
        ]
      },
      {
        title: `Module 3: Step-by-Step Experimental Procedure & Data Collection Tables`,
        content: [
          `The experimental investigation of ${topic} is conducted across multiple controlled trials. Follow the procedural steps in sequential order without altering parameter variables simultaneously.`,
          `Tabulate all observed readings immediately upon acquisition. Do not discard anomalous data points; document them with explanatory marginal notes for subsequent regression analysis.`
        ],
        points: [
          `Chronological step-by-step operating instructions for running experimental trials.`,
          `Structured raw data collection matrices with appropriate SI unit headers.`,
          `Replication protocols: three independent measurement runs per test state.`
        ]
      },
      {
        title: `Module 4: Error Propagation Analysis & Technical Laboratory Report`,
        content: [
          `Experimental results must be evaluated using standard statistical methods. Calculate arithmetic means, sample standard deviations, and propagate random and systematic uncertainties through all governing formulas.`,
          `Format the final laboratory submission according to ${uni.name} departmental standards, including abstract, theoretical background, graphs with regression fits, discussion of sources of error, and definitive conclusions.`
        ],
        points: [
          `Analytical error propagation calculus (partial derivative sensitivity formulations).`,
          `Graphical presentation: linear and logarithmic plots with confidence error bars.`,
          `Comparison of empirical findings against theoretical models and percentage discrepancy calculations.`
        ]
      }
    ];
  }

  // Standard lecture dossier / handout / past question modules
  return [
    {
      title: `Module 1: Foundational Principles & Theoretical Axioms of ${topic}`,
      content: [
        `This section establishes the formal theoretical foundation of ${topic} for ${course.course_code} (${course.title}) at ${uni.name} (${uni.country}). In accordance with ${uni.accreditation || 'International Higher Education Academic Standards'}, students are required to demonstrate rigorous mastery of core governing principles, definitions, and boundary conditions.`,
        `Core competency requires synthesizing underlying physical, mathematical, or empirical frameworks. Reference texts prescribed for this module include ${course.recommended_textbooks ? course.recommended_textbooks.join(' and ') : 'Prescribed International Benchmark Textbooks'}.`
      ],
      points: [
        `Rigorous conceptual scope, formal definitions, and dimensional analysis of ${topic}.`,
        `Governing laws, conservation theorems, and regulatory criteria applicable worldwide.`,
        `Interdisciplinary integration between ${topic} and modern industry/research paradigms.`
      ]
    },
    {
      title: `Module 2: Analytical Formulations, Governing Equations & Worked Methodology`,
      content: [
        `Rigorous mathematical and analytical evaluation of ${topic} requires formulating governing relationships, deriving step-by-step solution algorithms, and enforcing dimensional homogeneity across all units.`,
        `Candidates must document all intermediate derivations clearly, define assumed system states (such as steady-state, laminar, or idealized conditions), and state all final numerical results with appropriate International System of Units (SI).`
      ],
      points: [
        `Formal mathematical modeling and analytical derivation of core relationships in ${topic}.`,
        `Structured multi-step problem-solving strategy for high-yield examination problems.`,
        `Identification and prevention of common calculation errors, sign ambiguities, and unit inconsistencies.`
      ]
    },
    {
      title: `Module 3: Experimental Instrumentation, Laboratory Protocols & Case Studies`,
      content: [
        `At ${uni.name}, theoretical coursework is directly paired with experimental and applied laboratory sessions to reinforce foundational concepts.`,
        `Students must observe all departmental laboratory and workplace safety protocols, calibrate measurement instrumentation before acquiring data, and maintain comprehensive laboratory logs documenting uncertainties and observed anomalies.`
      ],
      points: [
        `Standard operating procedures, safety codes (OSHA/ISO), and PPE guidelines.`,
        `Experimental apparatus setup, error propagation analysis, and calibration standards.`,
        `Practical case studies in modern technological development and scientific literature.`
      ]
    },
    {
      title: `Module 4: Semester Examination Mastery & Model Marking Criteria`,
      content: [
        `Analysis of past examination papers at ${uni.name} highlights recurring structures in how ${topic} is assessed. Examinations prioritize both conceptual depth (definition and derivation) and quantitative multi-step synthesis.`,
        `To obtain maximum marks, candidates should format responses with clear numbered headings, annotate diagrams comprehensively, and verify numerical answers through sanity checks and order-of-magnitude estimation.`
      ],
      points: [
        `Deconstruction of common student pitfalls and conceptual traps in examination settings.`,
        `Structuring answers to meet departmental marking criteria and partial-credit guidelines.`,
        `Timed practice techniques for both multiple-choice diagnostic and long-form derivation problems.`
      ]
    }
  ];
}

/**
 * Builds authentic examination questions & model solutions for a topic
 */
export function buildGlobalTopicPastQuestions(course, topic, uni) {
  return [
    {
      question: `[Section A - Theoretical Analysis (15 Marks)] With reference to ${course.course_code} (${course.title}) at ${uni.name}, define ${topic} in detail. State three fundamental principles governing its behavior and discuss two significant real-world challenges encountered when applying these principles in practice.`,
      solution: `1. Definition: ${topic} represents the core theoretical and analytical framework wherein governing system parameters are systematically formulated and evaluated under controlled boundary conditions. 2. Governing Principles: (a) Equilibrium and conservation laws; (b) Boundary condition conformity and dimensional homogeneity; (c) Compliance with standard physical/regulatory constants. 3. Practical Challenges: (a) Non-ideal system behaviors (such as friction, thermal losses, or noise) requiring corrective calibration; (b) Measurement tolerances and sensor precision constraints in experimental environments.`
    },
    {
      question: `[Section B - Quantitative Problem Solving (25 Marks)] Outline the step-by-step procedural methodology required to solve a standard analytical problem in ${topic}. State all necessary boundary assumptions, and demonstrate how error propagation is minimized throughout the calculation.`,
      solution: `1. Procedural Methodology: Step 1 - Define all known parameters and state boundary conditions clearly. Step 2 - Select and write out the governing analytical formula. Step 3 - Verify unit consistency across all input variables (convert to SI units). Step 4 - Perform intermediate substitutions maintaining significant figure precision. Step 5 - State the final value with exact units and evaluate physical plausibility. 2. Error Minimization: Calibrate instruments prior to recording, perform repeated independent trials to calculate arithmetic mean, and eliminate systematic zero errors.`
    }
  ];
}

/**
 * Combines Nigerian NUC CCMAS catalog + Global International catalog
 * into an alternating, perfectly interleaved stream of fresh academic materials.
 * Every harvest batch cycles across diverse countries, courses, and archetypes.
 */
export function* generateGlobalMaterialCandidates() {
  // 1. Group universities by country
  const unisByCountry = new Map();
  for (const u of GLOBAL_UNIVERSITIES) {
    if (!unisByCountry.has(u.country)) unisByCountry.set(u.country, []);
    unisByCountry.get(u.country).push(u);
  }
  const countries = Array.from(unisByCountry.keys());

  // 2. Format Nigerian NUC CCMAS courses
  const nigerianCourses = NUC_CCMAS_COURSES.map(c => ({
    course_code: c.course_code,
    title: c.title,
    course: c.course || "General Studies",
    category: c.course_code.startsWith("GET") ? "Engineering" : c.course_code.startsWith("CSC") || c.course_code.startsWith("COS") ? "Computing" : c.course_code.startsWith("ANA") || c.course_code.startsWith("PHS") || c.course_code.startsWith("BCH") ? "Health" : c.course_code.startsWith("MTH") || c.course_code.startsWith("PHY") || c.course_code.startsWith("CHM") ? "Science" : c.course_code.startsWith("ACC") || c.course_code.startsWith("ECO") ? "Business" : c.course_code.startsWith("LAW") ? "Law" : "General",
    level: c.level || "200L",
    topics: c.topics && c.topics.length > 0 ? c.topics : [c.title],
    recommended_textbooks: c.recommended_textbooks || [],
    isNigerian: true
  }));

  const intlCourses = INTERNATIONAL_COURSES.map(c => ({
    ...c,
    isNigerian: false
  }));

  // Indices trackers for round-robin rotation
  let countryIdx = 0;
  let nigerianCourseIdx = 0;
  let intlCourseIdx = 0;
  let archetypeIdx = 0;
  const topicIndices = new Map();
  const uniIndices = new Map();

  while (true) {
    // Pick next country in round-robin sequence
    const country = countries[countryIdx % countries.length];
    countryIdx++;

    // Pick a university from this country
    const countryUnis = unisByCountry.get(country);
    const uIdx = uniIndices.get(country) || 0;
    const uni = countryUnis[uIdx % countryUnis.length];
    uniIndices.set(country, uIdx + 1);

    // Pick course: if country is Nigeria, pick from Nigerian NUC CCMAS; else pick from International courses
    let course;
    if (country === "Nigeria") {
      course = nigerianCourses[nigerianCourseIdx % nigerianCourses.length];
      nigerianCourseIdx++;
    } else {
      course = intlCourses[intlCourseIdx % intlCourses.length];
      intlCourseIdx++;
    }

    // Pick topic in round-robin for this course
    const tIdx = topicIndices.get(course.course_code) || 0;
    const topic = course.topics[tIdx % course.topics.length];
    topicIndices.set(course.course_code, tIdx + 1);

    // Pick archetype in round-robin (lecture_note, past_question, textbook, handout, lab_manual)
    const archetype = MATERIAL_ARCHETYPES[archetypeIdx % MATERIAL_ARCHETYPES.length];
    archetypeIdx++;

    const { faculty, dept } = resolveFacultyAndDept(course, uni);
    const title = archetype.titleTemplate(uni, course.course_code, topic);
    const description = archetype.descTemplate(uni, course.course_code, topic);

    yield {
      id: `${course.course_code}_${uni.shortCode}_${topic.slice(0, 10)}_${archetype.type}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
      title,
      course_code: course.course_code,
      course_title: course.title,
      institution: uni.name,
      country: uni.country,
      accreditation: uni.accreditation,
      faculty,
      department: dept,
      level: course.level,
      material_type: archetype.type,
      description,
      topic,
      topics: course.topics,
      modules: buildGlobalTopicModules(course, topic, archetype, uni),
      pastQuestions: buildGlobalTopicPastQuestions(course, topic, uni),
      academicSession: "2023/2024",
    };
  }
}
