/**
 * Community content rules: no trade calls, no price targets, no abuse.
 *
 * This file is the single source of truth. The browser runs it for instant feedback, and
 * scripts/build-sql.ts copies the same patterns into the database function `content_violation`,
 * which is what actually enforces them (a client can always be bypassed).
 *
 * Patterns are written in the subset of regex shared by JavaScript and PostgreSQL (no \b, no
 * look-around), matched case-insensitively. Word edges use B / E below instead of \b.
 */

export type RuleCode = "trade_call" | "price_target" | "abuse";

export interface Rule {
  code: RuleCode;
  /** Shown to the member. */
  message: string;
  /** Abuse is matched after swapping common look-alike characters (f*ck, sh1t, @ss). */
  normalize?: boolean;
  patterns: string[];
}

const B = "(^|[^a-z0-9])";
const E = "($|[^a-z0-9])";
const CUR = "(rs\\.?|inr|usd|₹|\\$)?";
const CUR_REQ = "(rs\\.?|inr|usd|₹|\\$)";

export const RULES: Rule[] = [
  {
    code: "trade_call",
    message: "Buy/sell calls and tips aren't allowed. Share your reasoning and ask questions instead.",
    patterns: [
      // "buy now", "sell at", "short below" ...
      `${B}(buy|sell|short|accumulate|exit)\\s+(now|today|tomorrow|immediately|asap|on dips?|at|above|below|around|near|before)${E}`,
      // "you should buy", "time to sell", "must buy", "don't sell", "go long" ...
      `${B}(should|must|need to|have to|time to|go|please|pls|better|do not|don't|dont|advise to|advice to|recommend to|suggest to)\\s+(buy|sell|short)${E}`,
      // "strong buy", "buy call", "sell signal", "buy rating" ...
      `${B}(strong\\s+)?(buy|sell)\\s+(call|calls|signal|signals|tip|tips|rating|recommendation|alert|zone|level|side)${E}`,
      `${B}(i|we)\\s+(recommend|suggest|advise)\\s+(buying|selling|shorting|you)${E}`,
      `${B}(intraday|btst|stbt|swing|positional|stock|option|options|trading)\\s+(tip|tips|call|calls)${E}`,
      `${B}(free|paid|premium|vip)\\s+(tips|calls|signals)${E}`,
      `${B}(tip|call|signal)s?\\s+(of the day|for tomorrow|for today|available)${E}`,
      `${B}join\\s+(my|our|the)?\\s*(telegram|whatsapp)`,
      `${B}(guaranteed|assured)\\s+(profit|profits|returns?|gains?)${E}`,
      `${B}sure[- ]?shot${E}`,
      `${B}100\\s*%\\s*(profit|returns?|accuracy|guaranteed)`,
      `${B}risk[- ]?free\\s+(profit|returns?)`,
      `${B}double\\s+your\\s+money${E}`,
      `${B}multibagger\\s+(tip|tips|pick|picks|call|calls)${E}`,
    ],
  },
  {
    code: "price_target",
    message: "Price targets, entry and stop-loss levels aren't allowed. Discuss the business, not a trade.",
    patterns: [
      // "target 2500", "tgt: 150", "target ₹3,000" (a bare "target 12%" is fine: only 3+ digits or a currency sign count)
      `${B}(target|targets|tgt|tp[0-9]?)\\s*(price|level|zone)?\\s*[:=@-]?\\s*${CUR_REQ}\\s*[0-9]`,
      `${B}(target|targets|tgt|tp[0-9]?)\\s*(price|level|zone)?\\s*[:=@-]?\\s*[0-9]{3,}`,
      `${B}(price\\s+target|target\\s+price)\\s*(of|at|is|for|to|[:=@-])?\\s*${CUR_REQ}\\s*[0-9]`,
      `${B}(price\\s+target|target\\s+price)\\s*(of|at|is|for|to|[:=@-])?\\s*[0-9]{3,}`,
      `${B}(stop[- ]?loss|stoploss|sl|entry|cmp)\\s*(price|level|zone)?\\s*[:=@-]?\\s*${CUR}\\s*[0-9]{2,}`,
      `${B}(entry|exit)\\s+(price|level|zone)\\s*(of|at|is|[:=@-])?\\s*${CUR}\\s*[0-9]{2,}`,
    ],
  },
  {
    code: "abuse",
    message: "Please keep it respectful. Abusive or insulting language isn't allowed.",
    normalize: true,
    patterns: [
      `${B}(fuck|fucker|fucking|fck|fuk|fuc|sht|btch|ahole|shit|shitty|bitch|bastard|asshole|arsehole|dickhead|cunt|slut|whore|motherfucker|bullshit|piss off|douche|douchebag|prick|wanker)${E}`,
      `${B}(nigger|nigga|faggot|fag|kike|chink|paki|spic|tranny|retard|retarded)${E}`,
      `${B}(madarchod|maderchod|bhenchod|behenchod|benchod|chutiya|chutiye|chutia|gandu|gaandu|bhosdi|bhosdike|bhosdika|harami|haramkhor|haramzada|randi|lund|loda|lauda|kutta|kutti|kamina|kamini|saala kutta)${E}`,
      `${B}(you|u|ur|youre|you're|you are|u r)\\s+(an?\\s+)?(idiot|moron|stupid|dumb|fool|clown|loser|scum|trash|pathetic|useless|jerk)${E}`,
      `${B}(kill|rape|murder|hang|shoot)\\s+(you|u|yourself|him|her|them)${E}`,
      `${B}(go\\s+die|kys|kill yourself)${E}`,
    ],
  },
];

const LOOKALIKES: Record<string, string> = { "@": "a", $: "s", "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "!": "i", "*": "" };

/** The database applies the same swap: translate(lower(t), LOOKALIKE_FROM, LOOKALIKE_TO). */
export const LOOKALIKE_FROM = "@$01345!*"; // "*" has no counterpart, so it is simply removed
export const LOOKALIKE_TO = "asoieasi";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => LOOKALIKES[ch] ?? ch)
    .join("");
}

const compiled = RULES.map((r) => ({ rule: r, res: r.patterns.map((p) => new RegExp(p, "i")) }));

export interface Violation {
  code: RuleCode;
  message: string;
}

/** Returns the first rule the text breaks, or null when it is fine. */
export function checkContent(...texts: (string | undefined | null)[]): Violation | null {
  const text = texts.filter(Boolean).join("\n");
  if (!text.trim()) return null;
  const folded = normalize(text);
  for (const { rule, res } of compiled) {
    const subject = rule.normalize ? folded : text;
    if (res.some((re) => re.test(subject))) return { code: rule.code, message: rule.message };
  }
  return null;
}
