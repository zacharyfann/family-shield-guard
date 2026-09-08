export type RiskLevel = "high" | "medium" | "safe";

export type AnalysisResult = {
  risk: RiskLevel;
  headline: string;
  evidence: string[];
  unverifiable: string[];
  doNot: string[];
  nextSteps: string[];
};

type Signal = { test: RegExp; weight: number; note: string };

const SIGNALS: Signal[] = [
  { test: /\b(zelle|venmo|cash ?app|wire transfer|western union|money ?gram)\b/i, weight: 3, note: "Asks for money through a payment app or wire transfer, which is nearly impossible to reverse." },
  { test: /\b(gift ?card|itunes card|google play card|steam card)\b/i, weight: 4, note: "Mentions gift cards as payment — a method legitimate companies and agencies never use." },
  { test: /\b(bitcoin|crypto|usdt|btc|wallet address)\b/i, weight: 3, note: "Requests cryptocurrency, a common untraceable scam payment channel." },
  { test: /\b(urgent|immediately|within \d+ (hours|minutes)|act now|final notice|last warning|expires today)\b/i, weight: 2, note: "Uses urgency and deadlines to rush a decision before it can be checked." },
  { test: /\b(suspend(ed)?|locked|deactivat(e|ed)|closed|terminate(d)?|legal action|arrest|warrant)\b/i, weight: 2, note: "Threatens account suspension or legal consequences to create fear." },
  { test: /\b(verify|confirm|update|re-?activate)\b.{0,30}\b(account|identity|payment|details|information|ssn|social security)\b/i, weight: 3, note: "Asks you to verify or confirm personal or account details through a message." },
  { test: /\b(one ?time|verification|security) code\b|\b\d{6}\b.{0,20}\bcode\b/i, weight: 4, note: "Requests a one-time or verification code. Sharing that code hands over access to your account." },
  { test: /\b(password|pin|ssn|social security|routing number|account number|cvv|card number)\b/i, weight: 4, note: "Asks for credentials or full financial details that no legitimate contact requests by message." },
  { test: /(bit\.ly|tinyurl|t\.co|is\.gd|cutt\.ly|rb\.gy|shorturl)/i, weight: 3, note: "Contains a shortened link that hides the real destination." },
  { test: /https?:\/\/[^\s]*(-|\.)(secure|verify|login|account|update|support)[^\s]*/i, weight: 2, note: "Contains a link built to look like a login or support page." },
  { test: /\bhttps?:\/\/[^\s]*\.(ru|top|xyz|icu|tk|zip|cn|click)\b/i, weight: 3, note: "Links to an unusual web address that does not match a known company domain." },
  { test: /\b(deposit|overpay|refund).{0,40}(check|cheque)\b|\b(check|cheque).{0,40}\b(deposit|forward|send back)\b/i, weight: 4, note: "Involves depositing a check and sending money back — a classic overpayment scam." },
  { test: /\b(no interview|start (today|immediately)|earn \$?\d{3,}|weekly pay|work from home)\b/i, weight: 3, note: "Promises high or easy pay with little screening, typical of fake job offers." },
  { test: /\b(sight ?unseen|out of (the )?country|can'?t (meet|show)|overseas|missionary|deployed)\b/i, weight: 3, note: "The other party cannot meet in person, a common excuse in rental and marketplace scams." },
  { test: /\b(irs|social security administration|medicare|amazon|apple|paypal|usps|fedex|bank of america|chase|wells fargo)\b/i, weight: 1, note: "Impersonates a well-known agency, bank, or brand people are likely to trust." },
  { test: /\b(don'?t tell|keep this (between|confidential)|do not discuss|secret)\b/i, weight: 4, note: "Asks you to keep the request secret — a strong sign of a scam in progress." },
  { test: /\b(prize|won|winner|lottery|inheritance|grant|refund owed|unclaimed)\b/i, weight: 3, note: "Claims money is owed or won, which is used to get personal details." },
  { test: /\b(hi mom|hi dad|this is your (son|daughter|grand(son|daughter))|new number)\b/i, weight: 4, note: "Claims to be a family member from a new number — a family-impersonation scam pattern." },
];

const CATEGORY_HINTS: Record<string, string[]> = {
  sms: ["Text messages can show any sender name or number; the display is not proof of who sent it."],
  email: ["The display name in an email can be faked. The real sending address is often hidden on phones."],
  job: ["Job offers made entirely over text or chat, with no verifiable company presence, are high risk."],
  rental: ["Listings can be copied from real properties with only the contact details changed."],
  payment: ["Payment app transfers are treated like cash. Once sent, banks usually cannot get the money back."],
  other: ["Unsolicited requests are easy to fake and hard to trace back to a real person."],
};

export function analyzeMessage(content: string, category: string): AnalysisResult {
  const text = content.trim();
  let score = 0;
  const evidence: string[] = [];

  for (const signal of SIGNALS) {
    if (signal.test.test(text)) {
      score += signal.weight;
      evidence.push(signal.note);
    }
  }

  if (/\bhttps?:\/\//i.test(text)) {
    score += 1;
    evidence.push("Includes a link. Links in unexpected messages are the most common way accounts get taken over.");
  }

  const risk: RiskLevel = score >= 6 ? "high" : score >= 2 ? "medium" : "safe";

  const headline =
    risk === "high"
      ? "Strong scam patterns found. Do not respond or send anything."
      : risk === "medium"
        ? "Some warning signs found. Verify before you act."
        : "No common scam patterns found, but treat unexpected requests carefully.";

  if (evidence.length === 0) {
    evidence.push("No known scam wording, payment demands, or suspicious links were detected in what you pasted.");
  }

  const unverifiable = [
    "Whether the phone number, email address, or sender name really belongs to who it claims.",
    "Whether any linked website is genuine, since a page can copy a real company exactly.",
    ...(CATEGORY_HINTS[category] ?? CATEGORY_HINTS["other"]!),
    "Anything that was said in a phone call, or details that were not pasted here.",
  ];

  const doNot =
    risk === "safe"
      ? [
          "Do not send money or share account details just because a message looks polished.",
          "Do not reuse a phone number or link from the message itself to check whether it is real.",
        ]
      : [
          "Do not click any link or open any attachment in the message.",
          "Do not send money, gift cards, or cryptocurrency, and do not deposit a check for someone else.",
          "Do not share passwords, one-time codes, Social Security numbers, or full card details.",
          "Do not call back the number in the message, even if it sounds official.",
          "Do not let anyone pressure you into deciding right now.",
        ];

  const nextSteps = [
    "Look up the company, bank, or agency yourself — use the number on your card, bill, or their official website.",
    "If it claims to be a relative in trouble, hang up and call that person on the number you already have saved.",
    "Ask one other person in the family to read it before anyone replies.",
    risk === "high"
      ? "Block and delete the sender, then report it at reportfraud.ftc.gov."
      : "Keep the message but do not reply until you have confirmed it independently.",
  ];

  return { risk, headline, evidence, unverifiable, doNot, nextSteps };
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  high: "High Risk",
  medium: "Caution / Medium Risk",
  safe: "Likely Safe",
};

export function buildShareText(result: AnalysisResult, category: string): string {
  return [
    `FamilyShield check: ${RISK_LABEL[result.risk]} (${category})`,
    result.headline,
    "",
    "Warning signs:",
    ...result.evidence.slice(0, 3).map((e) => `- ${e}`),
    "",
    "What NOT to do:",
    ...result.doNot.slice(0, 3).map((e) => `- ${e}`),
    "",
    "Verify by contacting the company yourself using an official number you look up.",
  ].join("\n");
}
