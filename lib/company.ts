// =============================================================================
// FUTEX brand content — sourced from the official company brochure & DOE
// accreditation. Used across the public marketing site.
// =============================================================================

export const COMPANY = {
  legalName: "FUTEX Philippines Development Corporation",
  shortName: "FUTEX Energy Solution",
  tagline: "Future-Ready Power Solutions",
  closingLine: "Powering a Sustainable Future.",
  phones: ["0961-449-6825", "0968-477-2475", "0954-361-4493"],
  facebook: "https://facebook.com/futexenergyph",
  facebookHandle: "facebook.com/futexenergyph",
  facebookName: "FUTEX Energy Solutions",
  messenger: "https://msng.link/o?Futexenergyph=fm",
  messengerName: "Futex Facebook Messenger",
  // Main office & showroom (walk-in).
  mainOffice: "2246 Dimasalang St., Sampaloc, Manila — Unit 01",
  // DOE-registered office.
  address:
    "11 Azucena, Brgy. Longos, Malabon City, National Capital Region – Third District, NCR",
};

export const ACCREDITATION = {
  title: "DOE-Accredited Certified EV Charger Installer",
  number: "DOE-EUMB-ANA-202604200002",
  authority:
    "Department of Energy — Energy Utilization Management Bureau (Republic of the Philippines)",
  level: "EVCS Provider – Service · National Accreditation Level",
  validUntil: "April 30, 2029",
};

export const MISSION =
  "FUTEX aims to become a leading provider of charging stations, home charger installations, and smart energy systems by delivering innovative, high-quality solutions with integrity in installation, excellent service, and continuous innovation in renewable energy — making modern and sustainable energy accessible to all.";

export const VISION =
  "We envision paving the way for innovative technology that will propel renewable energy forward — leading communities toward a future of clean, intelligent, and accessible energy for all.";

export const OUR_STORY =
  "Started in 2023 as a solar panel installer. In 2026, we expanded into EV charger installation and EV auto-parts installation services — riding the EV boom to offer complete clean-energy solutions.";

export const OUR_COMMITMENT =
  "We prioritize safety, reliability, and long-term performance, giving every EV owner true peace of mind.";

export interface Leader {
  name: string;
  title: string;
  photo: string;
  bio: string;
}

export const LEADERS: Leader[] = [
  {
    name: "Engr. Jeffrey Lois Talla",
    title: "Founder & Engineer",
    photo: "/images/leader-jeffrey.jpg",
    bio: "Filipino computer engineer, entrepreneur, and social-media personality known for his influence in the motorcycle, electric scooter, electric vehicle, and renewable-energy industries. He is also widely recognized as the creator behind “Motorkada,” one of the Philippines' largest motorcycle and rider communities online, combining technology, innovation, and community engagement through digital content and public service.",
  },
  {
    name: "Thompson Laohianty",
    title: "Co-Founder",
    photo: "/images/leader-thompson.jpg",
    bio: "Engaged in layout and printing services since 2022 and previously managed a private educational institution in Malabon City, he remains active in numerous charitable initiatives. He is affiliated with the Federation of Filipino-Chinese Chambers of Commerce and Industry, the Malabon Chamber of Commerce and Industry, the Philippine Fujian General Chamber of Commerce, and the Philippine Xiamen Chamber of Commerce and Industry.",
  },
];

export const KEY_FEATURES = [
  {
    title: "Integrated 3-Way Electrical Protection",
    desc: "Enhanced safety built into every installation.",
  },
  {
    title: "Smart App Control",
    desc: "Real-time monitoring & charging management via the Futex Smart App.",
  },
  {
    title: "Cybertruck-Style Enclosure",
    desc: "Sleek, durable design that protects your charger.",
  },
];

export const OUR_PROMISE = [
  "Clean, precise, professional workmanship",
  "Hassle-free daily home charging",
  "One-year after-installation warranty and support",
];

export const PARTNERS = ["Schneider Electric", "TENGEN", "Ewild"];

export const SEGMENTS = ["Home", "Condominium", "Commercial"];
