export type JobTemplate = {
  description: string;
  responsibilities: string;
  qualification: string;
  benefits: string;
  skills: string;
};

type TemplateDef = { keywords: RegExp; template: JobTemplate };

const TEMPLATES: TemplateDef[] = [
  {
    keywords: /customer\s*(support|service|care)|support\s*executive|csr\b/i,
    template: {
      description:
        "We're hiring a Customer Support Executive to be the friendly, dependable voice of our brand. You'll help customers resolve issues over calls, chat and email, keep them informed, and turn every interaction into a great experience.",
      responsibilities:
        "• Respond to customer queries via calls, email and chat within SLA.\n• Understand issues, troubleshoot, and provide clear resolutions.\n• Log tickets accurately in the CRM and follow up until closure.\n• Escalate complex issues to the right team with full context.\n• Share customer feedback with product and ops to improve experience.",
      qualification:
        "Graduate in any discipline. 0–3 years in customer support / BPO / voice or non-voice preferred.",
      benefits:
        "• Fixed salary + performance incentives\n• Paid training and certifications\n• Health insurance\n• Growth path to Team Lead / QA / Trainer",
      skills: "Communication, English, Hindi, CRM, Problem Solving, Empathy, MS Office",
    },
  },
  {
    keywords: /sales|business\s*development|bd(e|m)\b|inside\s*sales|field\s*sales/i,
    template: {
      description:
        "We're hiring a Sales Executive to drive revenue by connecting with prospects, understanding their needs, and closing deals. You'll own your pipeline end-to-end and hit clear monthly targets.",
      responsibilities:
        "• Generate leads through calls, emails, LinkedIn and referrals.\n• Qualify prospects and run product demos / meetings.\n• Negotiate, close deals and hit monthly revenue targets.\n• Maintain accurate pipeline & activity data in the CRM.\n• Build long-term relationships and drive repeat business.",
      qualification:
        "Graduate in any discipline. 0–4 years in B2B / B2C sales, ed-tech, SaaS, insurance or real estate.",
      benefits:
        "• Uncapped incentives on top of fixed CTC\n• Fast promotions based on performance\n• Sales training and mentorship\n• Health insurance",
      skills: "Cold Calling, Lead Generation, Negotiation, CRM, Communication, Closing, Follow-up",
    },
  },
  {
    keywords: /\bhr\b|human\s*resources|recruiter|talent\s*acquisition/i,
    template: {
      description:
        "We're hiring an HR Recruiter to own end-to-end hiring for the company. You'll source, screen, interview and close great candidates while giving them a smooth, respectful experience.",
      responsibilities:
        "• Post jobs and source candidates from Naukri, LinkedIn, referrals and portals.\n• Screen resumes and run first-round telephonic interviews.\n• Coordinate interviews with hiring managers and share feedback.\n• Roll out offers, follow up on joining, and reduce drop-offs.\n• Maintain the ATS with clean, up-to-date candidate data.",
      qualification:
        "Graduate/MBA in HR. 1–4 years in recruitment (in-house or consultancy).",
      benefits:
        "• Fixed CTC + hiring incentives per closure\n• Access to premium job portals\n• Learning budget for HR certifications\n• Health insurance",
      skills: "Sourcing, Screening, Naukri, LinkedIn Recruiter, ATS, Communication, Negotiation",
    },
  },
  {
    keywords: /data\s*entry|back\s*office|typist|operator/i,
    template: {
      description:
        "We're hiring a Data Entry Operator to accurately capture, update and maintain data across our internal systems. Attention to detail and speed matter the most.",
      responsibilities:
        "• Enter data from documents, forms and PDFs into our systems.\n• Verify data for accuracy and fix errors.\n• Maintain daily reports in Excel / Google Sheets.\n• Handle basic email communication and file management.\n• Protect confidentiality of all data handled.",
      qualification:
        "12th pass or Graduate. 0–2 years in data entry / back office / admin.",
      benefits:
        "• Fixed monthly salary\n• Fixed shift (day/general)\n• Paid leaves and weekly off\n• Growth into MIS / Executive roles",
      skills: "Typing, MS Excel, Google Sheets, Attention to Detail, English, Data Accuracy",
    },
  },
  {
    keywords: /telecaller|tele\s*caller|tele\s*sales|calling/i,
    template: {
      description:
        "We're hiring a Telecaller to reach out to leads over phone, pitch our offerings and book qualified appointments / close sales.",
      responsibilities:
        "• Make 80–120 outbound calls per day on provided data.\n• Pitch products/services and answer basic queries.\n• Book demos / site visits / meetings for the sales team.\n• Maintain call logs and disposition in the CRM.\n• Meet daily and monthly call & conversion targets.",
      qualification: "12th pass or Graduate. Fluent in Hindi + basic English.",
      benefits:
        "• Fixed salary + attractive incentives\n• Day shift, Sunday off\n• Training on product & pitch\n• Growth to Sr. Telecaller / Team Lead",
      skills: "Hindi, English, Cold Calling, Persuasion, CRM, Patience, Target Oriented",
    },
  },
  {
    keywords: /accountant|accounts|tally|book\s*keep|gst/i,
    template: {
      description:
        "We're hiring an Accountant to manage day-to-day accounting, bank reconciliation, GST/TDS filings and monthly closings.",
      responsibilities:
        "• Record daily transactions in Tally / Zoho Books.\n• Handle bank reconciliation and vendor payments.\n• Prepare GST, TDS and other statutory returns.\n• Support monthly and yearly financial closings.\n• Coordinate with auditors and management for reports.",
      qualification: "B.Com / M.Com. 1–4 years in accounts. Tally ERP mandatory.",
      benefits:
        "• Fixed CTC as per experience\n• PF & health insurance\n• Support for CA-Inter / certifications\n• Stable, long-term role",
      skills: "Tally, GST, TDS, MS Excel, Bank Reconciliation, Zoho Books, Accounting",
    },
  },
  {
    keywords: /developer|engineer|software|full\s*stack|frontend|backend|react|node|python|java\b/i,
    template: {
      description:
        "We're hiring a Software Engineer to build reliable, well-tested features end-to-end. You'll own modules, ship to production regularly and help raise the technical bar of the team.",
      responsibilities:
        "• Design, build and ship features across the stack.\n• Write clean, tested, maintainable code with proper reviews.\n• Debug production issues and improve performance.\n• Collaborate with product, design and QA in short cycles.\n• Contribute to architecture and technical decisions.",
      qualification:
        "B.E. / B.Tech / MCA. 1–5 years of hands-on development experience.",
      benefits:
        "• Competitive salary + ESOPs (as applicable)\n• Remote / hybrid flexibility\n• Learning budget & conference support\n• Top-tier health insurance",
      skills: "JavaScript, TypeScript, React, Node.js, REST APIs, SQL, Git",
    },
  },
  {
    keywords: /designer|design|ui|ux|graphic/i,
    template: {
      description:
        "We're hiring a Designer to craft clean, intuitive and delightful experiences across web and mobile. You'll own end-to-end design from research to polished handoff.",
      responsibilities:
        "• Turn requirements into wireframes, flows and hi-fi mockups.\n• Build and maintain a consistent design system.\n• Partner with engineering to ship pixel-perfect UI.\n• Run quick usability tests and iterate.\n• Contribute to brand & marketing visuals when needed.",
      qualification:
        "Diploma / Degree in Design. 1–4 years in product / UI-UX design with a strong portfolio.",
      benefits:
        "• Modern tools (Figma, plugins) provided\n• Remote / hybrid flexibility\n• Learning budget\n• Health insurance",
      skills: "Figma, UI Design, UX Research, Prototyping, Design Systems, Wireframing",
    },
  },
  {
    keywords: /marketing|seo|content|social\s*media|digital/i,
    template: {
      description:
        "We're hiring a Marketing Executive to plan and run campaigns across digital channels, grow qualified traffic, and turn visitors into leads and customers.",
      responsibilities:
        "• Plan and execute campaigns across SEO, social, email and ads.\n• Write briefs and coordinate content, design and dev.\n• Track KPIs (traffic, leads, CAC, ROAS) and report weekly.\n• A/B test landing pages and creatives to lift conversions.\n• Own the content calendar and social presence.",
      qualification:
        "Graduate / MBA in Marketing. 1–4 years in digital marketing.",
      benefits:
        "• Fixed CTC + performance bonus\n• Tools budget (SEO / analytics / design)\n• Remote / hybrid flexibility\n• Health insurance",
      skills: "SEO, Google Ads, Meta Ads, Analytics, Content, Email Marketing, Social Media",
    },
  },
  {
    keywords: /delivery|driver|rider|logistics|warehouse/i,
    template: {
      description:
        "We're hiring for a Delivery / Logistics role focused on safe, on-time deliveries and great customer experience at the doorstep.",
      responsibilities:
        "• Pick up and deliver orders across the assigned zone.\n• Follow the app for routes, cash collection and status updates.\n• Handle products with care and maintain vehicle hygiene.\n• Meet daily delivery targets and SLA.\n• Report issues to the hub manager promptly.",
      qualification: "10th pass and above. Valid driving license (2W/4W) as applicable.",
      benefits:
        "• Weekly / daily payouts + incentives\n• Fuel & maintenance support\n• Insurance cover\n• Flexible shifts",
      skills: "Driving, Navigation, Punctuality, Customer Service, Basic Smartphone",
    },
  },
];

export const TEMPLATE_SUGGESTIONS = [
  "Customer Support Executive",
  "Sales Executive",
  "HR Recruiter",
  "Data Entry Operator",
  "Telecaller",
  "Accountant",
  "Software Engineer",
  "UI/UX Designer",
  "Marketing Executive",
  "Delivery Executive",
];

export function getJobTemplate(title: string): JobTemplate | null {
  if (!title) return null;
  for (const t of TEMPLATES) if (t.keywords.test(title)) return t.template;
  return null;
}
