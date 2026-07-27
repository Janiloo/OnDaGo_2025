/**
 * Sabako legal documents — Terms & Conditions and Privacy Policy.
 *
 * ⚠️ NOT LEGAL ADVICE. This is a thorough, good-faith template written for a
 * Philippine public-transport information & reporting app. Before you publish it
 * or accept real users, have it reviewed by a lawyer and fill in the four
 * placeholders in LEGAL below (operator entity, contact, DPO, effective date).
 *
 * The content is authored to match how Sabako actually works: it is an
 * information/relay platform, it does NOT operate vehicles or employ drivers,
 * drivers broadcast live location while on duty, commuters file reports routed
 * to operators, and personal data is handled under the Philippines' Data
 * Privacy Act of 2012 (RA 10173).
 */

/** One place to fill in before launch. Referenced throughout both documents. */
export const LEGAL = {
  /** Registered operator of the Sabako platform. */
  entity: "Avancena Technologies Inc.",
  /** General & privacy contact address. */
  contactEmail: "[support@sabako.app]",
  /** Data Protection Officer contact (required for a Personal Information Controller under RA 10173). */
  dpoEmail: "[dpo@sabako.app]",
  /** Date these documents take effect. */
  effectiveDate: "[Effective date]",
  jurisdiction: "the Republic of the Philippines",
};

export interface LegalSection {
  h: string;
  /** Each string is a paragraph. Use "• " prefixes for bullet lines. */
  p: string[];
}

export interface LegalDoc {
  title: string;
  /** Short line shown under the title. */
  updated: string;
  intro: string[];
  sections: LegalSection[];
}

export const TERMS: LegalDoc = {
  title: "Terms & Conditions",
  updated: `Effective ${LEGAL.effectiveDate}`,
  intro: [
    `These Terms & Conditions ("Terms") govern your access to and use of the Sabako mobile application and related services (together, the "Service"), provided by ${LEGAL.entity} ("Sabako", "we", "us", or "our").`,
    `By creating an account, checking the acceptance box, or otherwise using the Service, you confirm that you have read, understood, and agree to be bound by these Terms and by our Privacy Policy. If you do not agree, do not use the Service.`,
  ],
  sections: [
    {
      h: "1. What Sabako is (and is not)",
      p: [
        "Sabako is an information and reporting platform. It shows the approximate real-time location, occupancy, routes, and indicative fares of participating public utility vehicles (PUVs), and it lets commuters send reports to the operators that run those vehicles.",
        "Sabako is NOT a transport provider, common carrier, dispatcher, or booking service. We do not own, operate, maintain, insure, or control any vehicle. We do not employ, supervise, or direct any driver. Drivers and transport operators are independent third parties responsible for their own service, conduct, safety, and legal compliance.",
        "Nothing in the Service creates a contract of carriage between you and Sabako. Any transport you take is a matter solely between you and the operator or driver concerned.",
      ],
    },
    {
      h: "2. Definitions",
      p: [
        "• \"Commuter\" — a user who uses Sabako to view vehicles and file reports.",
        "• \"Driver\" — a user authorised by an Operator to broadcast a vehicle's live status while on duty.",
        "• \"Operator\" — a transport company or cooperative that manages vehicles, drivers, routes, and receives reports.",
        "• \"Content\" — any information you submit, including reports, descriptions, and profile details.",
      ],
    },
    {
      h: "3. Eligibility",
      p: [
        "You must be at least 18 years old, or the age of legal majority in your jurisdiction, to create an account. If you are a minor, you may only use the Service under the supervision and with the consent of a parent or legal guardian who agrees to these Terms on your behalf.",
        "By using the Service you represent that you have the legal capacity to enter into these Terms and that the information you provide is truthful and accurate.",
      ],
    },
    {
      h: "4. Your account",
      p: [
        "You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify us immediately of any unauthorised use.",
        "You agree to provide accurate, current, and complete information and to keep it updated. We may suspend or terminate accounts that contain false information or that are used in breach of these Terms.",
        "Driver accounts are provisioned and governed by the Operator that authorises them. Your relationship with that Operator (including duty, conduct, and disciplinary matters) is separate from these Terms.",
      ],
    },
    {
      h: "5. Location broadcasting (Drivers)",
      p: [
        "If you use a Driver account and go \"on duty\", the Service collects and broadcasts your device's location — including while the app is in the background — so commuters can see the vehicle's position and estimated arrival. Occupancy counts you enter are also shared.",
        "You control this: broadcasting only occurs while you are on duty, and you may end your shift at any time to stop it. You confirm you have the right and any necessary authorisation from your Operator to broadcast the vehicle's location.",
      ],
    },
    {
      h: "6. Reports and user content",
      p: [
        "Commuters may submit reports about a trip, vehicle, or operator. Reports are routed to, and reviewed by, the Operator they concern, and may be retained for records and safety purposes.",
        "You are solely responsible for your Content. You agree not to submit anything false, misleading, defamatory, harassing, obscene, or unlawful, and not to misidentify a vehicle, driver, or operator. Filing knowingly false reports may lead to suspension and may expose you to liability.",
        "You grant Sabako and the concerned Operator a non-exclusive, royalty-free licence to store, display, and process your Content for the purpose of operating the Service and handling your report. You retain ownership of your Content.",
      ],
    },
    {
      h: "7. Estimates, fares, and accuracy",
      p: [
        "Positions, occupancy, arrival estimates (ETAs), routes, and fares shown in the Service are indicative only. They depend on data from drivers and third parties, on connectivity, GPS accuracy, and traffic, and they may be delayed, incomplete, or wrong.",
        "Do not rely on the Service for safety-critical, time-critical, emergency, or navigation decisions. Fares displayed are references, not authoritative; the fare actually payable is set by the operator and applicable regulations.",
      ],
    },
    {
      h: "8. Acceptable use",
      p: [
        "You agree not to: (a) use the Service unlawfully or for any unlawful purpose; (b) interfere with, disrupt, or attempt to gain unauthorised access to the Service or its systems; (c) scrape, harvest, or resell data from the Service; (d) impersonate any person or entity; (e) upload malware or attempt to reverse-engineer the app except as permitted by law; or (f) use the Service to stalk, harass, endanger, or harm any person.",
      ],
    },
    {
      h: "9. Third-party services",
      p: [
        "The Service uses third-party components, including mapping and location providers. Your use of those features may be subject to the third party's own terms. We are not responsible for third-party services and do not endorse them.",
      ],
    },
    {
      h: "10. Intellectual property",
      p: [
        "The Service, including its software, design, brand, logo, and content (excluding your Content), is owned by Sabako or its licensors and is protected by law. We grant you a limited, personal, non-transferable, revocable licence to use the app for its intended purpose. No other rights are granted.",
      ],
    },
    {
      h: "11. Disclaimers",
      p: [
        "The Service is provided \"as is\" and \"as available\", without warranties of any kind, whether express or implied, including fitness for a particular purpose, accuracy, availability, or non-infringement, to the fullest extent permitted by law.",
        "We do not warrant that the Service will be uninterrupted, timely, secure, or error-free, or that any vehicle shown will arrive, operate, or be available.",
      ],
    },
    {
      h: "12. Limitation of liability",
      p: [
        "To the fullest extent permitted by law, Sabako and its officers, employees, and partners will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, income, or goodwill, arising from your use of (or inability to use) the Service.",
        "In particular, we are not liable for the acts, omissions, conduct, safety, delays, or service of any driver or operator, or for any injury, loss, or damage arising from any transport you take. Where liability cannot be excluded, it is limited to the maximum extent permitted by applicable law.",
      ],
    },
    {
      h: "13. Indemnification",
      p: [
        "You agree to indemnify and hold Sabako harmless from any claims, damages, losses, and expenses (including reasonable legal fees) arising out of your Content, your use of the Service, or your breach of these Terms or of any law or third-party right.",
      ],
    },
    {
      h: "14. Suspension and termination",
      p: [
        "You may stop using the Service and delete your account at any time from the app. We may suspend or terminate your access, with or without notice, if you breach these Terms, create risk or legal exposure, or if we discontinue the Service. Sections that by their nature should survive termination will survive.",
      ],
    },
    {
      h: "15. Changes",
      p: [
        "We may modify the Service or these Terms. If we make material changes, we will take reasonable steps to notify you, such as an in-app notice. Continued use after changes take effect constitutes acceptance of the updated Terms.",
      ],
    },
    {
      h: "16. Governing law",
      p: [
        `These Terms are governed by the laws of ${LEGAL.jurisdiction}, without regard to conflict-of-law rules. The courts of ${LEGAL.jurisdiction} have jurisdiction over any dispute, without prejudice to any mandatory consumer protections available to you.`,
      ],
    },
    {
      h: "17. Contact",
      p: [`Questions about these Terms can be sent to ${LEGAL.contactEmail}.`],
    },
  ],
};

export const PRIVACY: LegalDoc = {
  title: "Privacy Policy",
  updated: `Effective ${LEGAL.effectiveDate}`,
  intro: [
    `This Privacy Policy explains how ${LEGAL.entity} ("Sabako", "we", "us") collects, uses, discloses, and protects your personal information when you use the Sabako app and services (the "Service").`,
    `We act as a Personal Information Controller under the Philippines' Data Privacy Act of 2012 (Republic Act No. 10173), its Implementing Rules and Regulations, and issuances of the National Privacy Commission (NPC). We are committed to processing your data lawfully, fairly, and transparently.`,
  ],
  sections: [
    {
      h: "1. Information we collect",
      p: [
        "Account information you provide: your name, email address, mobile number, role (commuter, driver, or admin), and a securely stored password. For drivers, this includes the assigned vehicle plate/PUV number set by your operator.",
        "Reports you submit: the category, description, the operator and (optionally) plate you select, and any incident date, time, or location you add.",
        "Location information: for drivers who go on duty, we collect device location — including in the background — together with occupancy counts, to broadcast the vehicle's live status. For commuters, we may use your approximate device location to centre the map and show nearby vehicles; this is used on-device and is not stored as a location history by us.",
        "Technical information: basic device and app information (such as app version and platform) and log data needed to operate, secure, and troubleshoot the Service.",
      ],
    },
    {
      h: "2. How we use your information",
      p: [
        "• To create and manage your account and authenticate you.",
        "• To provide the core Service: showing real-time vehicle positions, occupancy, routes, ETAs, and fares.",
        "• To receive, route, and help operators act on the reports you file.",
        "• To keep the Service safe and reliable, prevent abuse and fraud, and enforce our Terms.",
        "• To produce aggregated, non-identifying operational analytics (for example, how many vehicles are active on a route).",
        "• To communicate with you about your account, security, and important service changes.",
      ],
    },
    {
      h: "3. Legal basis for processing",
      p: [
        "We process your personal information on one or more of the following bases under RA 10173: your consent (which you give when you register and agree to this Policy, and when you grant location permission); the performance of our agreement with you (to provide the Service you request); compliance with a legal obligation; and our legitimate interests in operating, securing, and improving the Service, balanced against your rights.",
        "You may withdraw consent (for example, by turning off location permission or deleting your account), though some features may then stop working.",
      ],
    },
    {
      h: "4. Location data, in detail",
      p: [
        "Driver broadcasting is strictly duty-based. Location is collected and shared only while a driver is on duty and stops when the shift ends. Drivers can end a shift at any time to stop broadcasting.",
        "Commuters can use the app without granting location permission; granting it only improves the map experience. You can change or revoke location permission at any time in your device settings.",
      ],
    },
    {
      h: "5. How we share information",
      p: [
        "With operators: reports you file are shared with the transport operator they concern so they can review and act on them. A driver's live vehicle status is shown to commuters using the app.",
        "With service providers: we use trusted providers for hosting, database, and mapping/location services who process data on our behalf under appropriate safeguards.",
        "For legal reasons: we may disclose information where required by law, regulation, legal process, or a lawful request by public authorities, or to protect the rights, safety, and property of users, the public, or Sabako.",
        "We do NOT sell your personal information.",
      ],
    },
    {
      h: "6. Data retention",
      p: [
        "We keep personal information only as long as necessary for the purposes described here, to comply with legal obligations, resolve disputes, and enforce our agreements. Reports may be retained by operators for their records and safety purposes. When data is no longer needed, we delete or anonymise it.",
      ],
    },
    {
      h: "7. Security",
      p: [
        "We use reasonable organisational, physical, and technical measures to protect personal information, including encryption in transit and hashing of passwords. No method of transmission or storage is completely secure, but we work to protect your data and to respond appropriately to any incident, including notifying you and the NPC where required by law.",
      ],
    },
    {
      h: "8. Your rights",
      p: [
        "Under RA 10173 you have the right to be informed; to access your personal data; to object to or withhold consent for processing; to rectify inaccurate data; to erase or block data under certain conditions; to data portability; to be indemnified for damages from unlawful processing; and to lodge a complaint with the National Privacy Commission (privacy.gov.ph).",
        `To exercise these rights, contact us at ${LEGAL.contactEmail}. You can also edit your profile and delete your account directly in the app.`,
      ],
    },
    {
      h: "9. Children's privacy",
      p: [
        "The Service is not directed to children under 18. We do not knowingly collect personal information from minors without the consent of a parent or guardian. If you believe a minor has provided us data without such consent, contact us and we will take appropriate steps.",
      ],
    },
    {
      h: "10. Third-party services",
      p: [
        "The Service relies on third-party mapping and location providers, and on hosting infrastructure. These parties process data under their own privacy terms. We encourage you to review the policies of any third-party service you interact with through the app.",
      ],
    },
    {
      h: "11. International transfers",
      p: [
        "Some service providers may process or store data on servers located outside the Philippines. Where this happens, we take steps intended to ensure your data continues to receive protection consistent with RA 10173.",
      ],
    },
    {
      h: "12. Changes to this Policy",
      p: [
        "We may update this Policy from time to time. Material changes will be notified in the app or by other reasonable means, and the \"Effective\" date above will be updated. Continued use after changes take effect indicates acceptance.",
      ],
    },
    {
      h: "13. Contact us",
      p: [
        `For privacy questions or to exercise your rights, contact us at ${LEGAL.contactEmail}. You may reach our Data Protection Officer at ${LEGAL.dpoEmail}.`,
      ],
    },
  ],
};

/**
 * The single agreement shown from the "Terms & Conditions" link: the Terms
 * followed by the full Privacy Policy as Part B, so users can read (and accept)
 * both in one place. The standalone PRIVACY doc above is still used by the
 * separate "Privacy Policy" consent link.
 */
export const COMBINED: LegalDoc = {
  title: "Terms & Conditions",
  updated: TERMS.updated,
  intro: [
    ...TERMS.intro,
    'This agreement has two parts: Part A — Terms & Conditions, and Part B — Privacy Policy. By creating an account you accept both.',
  ],
  sections: [
    { h: "Part A — Terms & Conditions", p: ["The following terms govern your access to and use of the Service."] },
    ...TERMS.sections,
    { h: "Part B — Privacy Policy", p: PRIVACY.intro },
    ...PRIVACY.sections,
  ],
};
