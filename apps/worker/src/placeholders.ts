/**
 * Fresh test data for every run, so an hourly signup flow doesn't fail with
 * "email already registered". Written in steps as {{name}}; resolved once per run
 * attempt, so the same value is used in every step of that attempt.
 *
 *   {{random_email}}  fg+1732540000123@example.com   (FLOWGUARD_TEST_EMAIL_DOMAIN changes the domain,
 *                                                     FLOWGUARD_TEST_EMAIL_USER the part before "+")
 *   {{random_name}}   e.g. "Ada Okafor"
 *   {{timestamp}}     milliseconds since 1970, e.g. 1732540000123
 *   {{random_number}} 6 digits
 */
const FIRST = ["Ada", "Chidi", "Amara", "Tunde", "Zainab", "Kofi", "Wanjiru", "Thabo", "Ngozi", "Femi", "Aisha", "Kwame"];
const LAST = ["Okafor", "Adeyemi", "Mensah", "Odhiambo", "Nkosi", "Bello", "Eze", "Abubakar", "Owusu", "Kamau"];

export function makePlaceholderValues(now = Date.now(), rand = Math.random): Record<string, string> {
  const domain = process.env.FLOWGUARD_TEST_EMAIL_DOMAIN || "example.com";
  const user = process.env.FLOWGUARD_TEST_EMAIL_USER || "fg";
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  return {
    random_email: `${user}+${now}@${domain}`,
    random_name: `${pick(FIRST)} ${pick(LAST)}`,
    timestamp: String(now),
    random_number: String(Math.floor(100000 + rand() * 900000)),
  };
}

/** Replace {{name}} (spaces allowed inside the braces, case-insensitive). Unknown names are left as written. */
export function fillPlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (whole, name: string) => values[name.toLowerCase()] ?? whole);
}
