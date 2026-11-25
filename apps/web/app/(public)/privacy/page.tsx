import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Ph, type LegalSection } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What FlowGuard collects, why, who processes it, how long it is kept, and your rights under the Nigeria Data Protection Act 2023 and the GDPR.",
};

// Template written in plain English. Not legal advice: see docs/legal/README.md before launch.
// Retention periods here must match the code: apps/worker/src/cleanup.ts (run by run-due).
const sections: LegalSection[] = [
  {
    id: "who",
    title: "Who is responsible",
    body: (
      <>
        <p><Ph>Company legal name</Ph>, <Ph>Registered address</Ph> (“we”) runs FlowGuard. Contact us about privacy at <Ph>Contact email</Ph>.</p>
        <p>We are the <b>data controller</b> for your account information. For personal data that FlowGuard captures from the websites <i>you</i> ask it to test (see section 3), <b>you</b> are the controller and we act as your <b>processor</b>, processing it only to run FlowGuard for you.</p>
      </>
    ),
  },
  {
    id: "account",
    title: "Information about you",
    body: (
      <ul>
        <li><b>Account:</b> your email address, a securely hashed password, and sign-in records (time, IP address, browser) kept by our authentication provider.</li>
        <li><b>Workspace settings:</b> workspace name, your flows (names, start URLs, steps), schedule, and alert settings including a Slack webhook URL if you add one.</li>
        <li><b>Technical logs:</b> our hosting and scheduling providers keep short-lived request and job logs (IP address, pages requested, errors) to keep the service running and secure.</li>
        <li><b>Free scan:</b> the URL you entered and a one-way hash of your IP address (used only to limit abuse; we don’t store the IP itself).</li>
        <li>We don’t use advertising or tracking cookies. We use only the cookies needed to keep you signed in.</li>
      </ul>
    ),
  },
  {
    id: "captured",
    title: "What FlowGuard records from websites you test",
    body: (
      <>
        <p>Each run opens the website you named and follows your steps. We store:</p>
        <ul>
          <li>a <b>video</b> of the browser window and <b>screenshots</b> after each step;</li>
          <li>a <b>simplified outline of each page</b> (visible buttons, links, fields, headings and their text);</li>
          <li>the browser <b>console log</b> (errors and warnings) and <b>failed network requests</b> (address, status, short error text);</li>
          <li>the result of each step and how long it took.</li>
        </ul>
        <p>These can contain <b>personal data of the tested site’s users or staff</b> if the site shows it (for example a name in a page header, an order list, or an email address in an error message). Please test with dedicated test accounts and avoid steps that open real customers’ data.</p>
      </>
    ),
  },
  {
    id: "why",
    title: "Why we use it, and our legal basis",
    body: (
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Purpose</th><th scope="col">Legal basis (NDPA 2023 s.25 / GDPR art. 6)</th></tr></thead>
          <tbody>
            <tr><td>Create and run your account; run your flows and scans; send alerts you set up</td><td>Performance of our contract with you</td></tr>
            <tr><td>Process data captured from sites you test</td><td>On your instructions, as your processor (your own lawful basis applies)</td></tr>
            <tr><td>Keep FlowGuard secure, prevent abuse, fix problems</td><td>Legitimate interests (a working, safe service)</td></tr>
            <tr><td>Email you about important changes to the service or these policies</td><td>Contract and legitimate interests</td></tr>
            <tr><td>Comply with the law and respond to lawful requests</td><td>Legal obligation</td></tr>
          </tbody>
        </table>
        <p>We don’t sell personal data, use it for advertising, or make decisions about you based solely on automated processing that have legal effects on you.</p>
      </div>
    ),
  },
  {
    id: "processors",
    title: "Who processes data for us",
    body: (
      <>
        <p>We use these service providers. Each only gets what it needs for its job.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Provider</th><th scope="col">What for</th><th scope="col">What it receives</th><th scope="col">Where</th></tr></thead>
            <tbody>
              <tr><td>Supabase</td><td>Database, sign-in, file storage</td><td>Everything in sections 2 and 3</td><td>European Union (our project’s region)</td></tr>
              <tr><td>GitHub (Microsoft) Actions</td><td>Runs the browser that visits sites on a schedule</td><td>Your flows; recordings while a run is in progress (debug copies deleted after 3 days); job logs</td><td>United States</td></tr>
              <tr><td>Vercel</td><td>Hosts the website and app</td><td>Requests to the app, technical logs</td><td>United States and global edge network</td></tr>
              <tr><td>Google (Gemini API)</td><td>Works out which element each step means</td><td>The step text and the simplified page outline for that step</td><td>United States</td></tr>
              <tr><td>Anthropic (Claude API)</td><td>Same as above, used first when configured</td><td>The step text and the simplified page outline for that step</td><td>United States</td></tr>
              <tr><td>Slack</td><td>Alerts, only if you add a webhook</td><td>Flow name, site, short failure summary, replay link</td><td>United States</td></tr>
              <tr><td>Brevo</td><td>Alert emails, only if email alerts are switched on</td><td>Your email address, flow name, failure summary, replay link</td><td>European Union</td></tr>
            </tbody>
          </table>
        </div>
        <p><b>About the AI providers:</b> page outlines can include text shown on the tested page. We send them only to resolve your steps. While FlowGuard uses the free tier of the Gemini API, Google’s terms allow it to use that content to improve its products, including human review. Don’t put sensitive data in steps or test pages that display it. We will update this policy if we move to a paid tier with different terms.</p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "International transfers",
    body: <p>Our database is in the EU, and some providers above are in the United States. Where personal data leaves Nigeria, the EU or the UK, we rely on the safeguards the law allows: adequacy decisions, the European Commission’s Standard Contractual Clauses (or the UK addendum) in our providers’ data processing terms, and for transfers from Nigeria the bases in Part VIII of the Nigeria Data Protection Act 2023. You can ask us for a copy of the relevant safeguards.</p>,
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Data</th><th scope="col">Kept for</th></tr></thead>
          <tbody>
            <tr><td>Videos, screenshots and diagnostics of <b>passing</b> runs</td><td>7 days, then deleted automatically</td></tr>
            <tr><td>Videos, screenshots and diagnostics of <b>failed</b> runs</td><td>30 days, then deleted automatically</td></tr>
            <tr><td>Run records (pass/fail, step results, console and network log text)</td><td>90 days, then deleted automatically</td></tr>
            <tr><td>Free scan reports and recordings</td><td>30 days</td></tr>
            <tr><td>Debug copies of runs on GitHub Actions</td><td>3 days</td></tr>
            <tr><td>Account, workspace and flows</td><td>Until you delete them or your account</td></tr>
            <tr><td>Provider backups and logs</td><td>Up to <Ph>Backup retention, e.g. 30 days</Ph> after deletion, then overwritten</td></tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>Under the Nigeria Data Protection Act 2023 and, where it applies, the EU or UK GDPR, you can ask us to:</p>
        <ul>
          <li>tell you what personal data we hold about you and give you a copy (access and portability);</li>
          <li>correct it;</li>
          <li>delete it. You can delete everything yourself in <b>Settings → Delete account</b>; it takes effect immediately;</li>
          <li>restrict or object to how we use it, and withdraw consent where we rely on consent.</li>
        </ul>
        <p>Email <Ph>Contact email</Ph>. We reply within 30 days, and may ask you to confirm it’s you. If a request is about data captured from someone else’s website, we’ll pass it to the account holder who controls it and help them respond.</p>
        <p>You can complain to the <b>Nigeria Data Protection Commission</b> (ndpc.gov.ng), or, in the EU or UK, to your local data protection authority. We’d appreciate the chance to fix things first.</p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: <p>Data is encrypted in transit (HTTPS) and at rest by our providers. Access to workspace data is limited by database rules so each account only sees its own data. Recordings are in private storage and shown through short-lived signed links. Replay links use long random tokens, and you can switch public links off. No system is perfectly secure; if a breach is likely to put you at risk, we’ll tell you and the regulator as the law requires (within 72 hours of becoming aware, under both the NDPA and the GDPR).</p>,
  },
  {
    id: "children",
    title: "Children",
    body: <p>FlowGuard is for businesses and is not meant for anyone under 18. We don’t knowingly collect children’s data.</p>,
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: <p>We’ll update this page when what we do changes, and email account holders about significant changes before they apply. The date at the top shows the latest version. See also our <Link className="link" href="/terms">Terms of Service</Link>.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      other={{ href: "/terms", label: "Terms of Service" }}
      intro={
        <>
          <p><b>The short version.</b> We keep your email and your flows so FlowGuard can run them. When it runs, it records the website you chose: a video, screenshots and error logs, which can include whatever that site shows. Passing-run recordings are deleted after 7 days, failures after 30. Steps and page outlines are sent to AI providers to work out what to click. Our database is in the EU. You can delete everything from Settings at any time.</p>
        </>
      }
      sections={sections}
    />
  );
}
