import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, OperatorEmail, OperatorName, OperatorPlace, type LegalSection } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using Oluso: what it does, what you may test with it, and the limits of a free beta.",
};

// Template written in plain English. Not legal advice: see docs/legal/README.md before launch.
const sections: LegalSection[] = [
  {
    id: "who",
    title: "Who we are and what these terms cover",
    body: (
      <>
        <p>Oluso is run by <OperatorName />, of <OperatorPlace /> (“we”, “us”). These terms are the agreement between us and you, the person or organisation using Oluso (“you”). If you use Oluso for a company, you confirm you’re allowed to accept these terms for it.</p>
        <p>By creating an account or using Oluso you agree to these terms and to our <Link className="link" href="/privacy">Privacy Policy</Link>. If you don’t agree, don’t use Oluso.</p>
      </>
    ),
  },
  {
    id: "service",
    title: "What Oluso does",
    body: (
      <>
        <p>You describe a journey on a website (for example “click Sign up, type an email, check the dashboard loads”). Oluso opens that website in an automated browser on a schedule, tries to follow your steps, and records what happened: a video, screenshots, the browser console and failed network requests. When a run fails it can alert you by Slack or email and give you a link to the recording.</p>
        <p>To work out which button or field each step means, Oluso sends the text of your steps together with a simplified outline of the page (visible buttons, links, fields and headings) to third-party AI services. These are listed in the Privacy Policy.</p>
        <p>The free instant scan visits up to 15 pages of a website you enter and checks for broken links, layout problems on phones and JavaScript errors.</p>
      </>
    ),
  },
  {
    id: "beta",
    title: "Free beta: no warranty",
    body: (
      <>
        <p>Oluso is in <b>free beta</b>. It is provided <b>“as is” and “as available”</b>, without warranties of any kind, whether express or implied, including fitness for a particular purpose, accuracy and uninterrupted availability, to the extent the law allows.</p>
        <p>In particular: runs can be late or skipped (they rely on free scheduling by GitHub Actions); the AI can pick the wrong element, so a run can fail when your site is fine, or pass when it isn’t; and alerts can be delayed or not delivered. <b>Oluso is a helpful extra check, not a guarantee that your site works.</b> Don’t rely on it as your only safeguard for anything critical.</p>
        <p>We may change, limit or stop features, or end the beta, at any time. We’ll give reasonable notice of anything that removes your data.</p>
      </>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <ul>
        <li>You must be at least 18, give a real email address, and keep your password private.</li>
        <li>You’re responsible for what happens under your account. Tell us at <OperatorEmail /> if you think someone else has accessed it.</li>
        <li>One person or organisation per account; don’t create accounts to get around limits.</li>
      </ul>
    ),
  },
  {
    id: "authorised",
    title: "Only test websites you’re allowed to test",
    body: (
      <>
        <p>You may only point Oluso at websites that <b>you own or control, or that you have the owner’s permission to test</b> in this way (for example, a client who has asked you to monitor their shop). If someone asks, you must be able to show that permission. The free scan may be used on any public website only to the limited extent it is offered (a light, one-off check of public pages).</p>
        <p>Automated visits can trigger a site’s security systems, create test orders, accounts or emails, and use the site’s resources. You are responsible for those effects on the sites you choose, and for making sure your steps don’t break the rules of those sites or of any payment provider.</p>
      </>
    ),
  },
  {
    id: "use",
    title: "Acceptable use",
    body: (
      <>
        <p>You must not use Oluso to:</p>
        <ul>
          <li><b>Load-test or stress-test</b> a site, or send traffic intended to slow it down or take it offline.</li>
          <li><b>Scrape</b> or harvest content or personal data from sites.</li>
          <li><b>Credential stuffing</b> or any login attempts with accounts that aren’t yours or your test accounts; guessing passwords; or getting around CAPTCHAs, rate limits, paywalls or other access controls.</li>
          <li>Test sites you don’t own or aren’t authorised to test (see section 5).</li>
          <li>Make real payments with real cards or bank details. Use the payment provider’s test mode, or stop at the payment screen.</li>
          <li>Put real passwords, card numbers, government ID numbers or other sensitive personal data into your steps. Steps are stored and sent to AI providers; use test accounts and placeholders such as <code>{"{{random_email}}"}</code>.</li>
          <li>Break the law, infringe anyone’s rights, distribute malware, or attack, probe or disrupt Oluso or the services it relies on.</li>
          <li>Resell or give others access to Oluso as your own service without our written permission.</li>
        </ul>
        <p>We may limit how often flows run and how many you have, and may pause flows that look like they break these rules.</p>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content and recordings",
    body: (
      <>
        <p>“Your content” means your flows and steps and everything Oluso records while running them: videos, screenshots, page outlines, console and network logs. You keep all rights in it. You give us permission to store, process and display it, and to send it to our service providers, only as needed to run Oluso for you.</p>
        <p>Recordings show whatever the tested website shows, which can include personal data of that site’s users. For that data you decide what we collect (by choosing the site and steps), so you are responsible for having a lawful basis to collect it. We handle it as described in the Privacy Policy and delete it on the schedule there.</p>
        <p><b>Replay links are public by default:</b> anyone with a run’s link can watch it. You can switch this off in Alerts. Only share links with people who should see them.</p>
      </>
    ),
  },
  {
    id: "ours",
    title: "Our service",
    body: <p>Oluso’s software, design and brand belong to us or our licensors. You may use them only to use Oluso. Parts of Oluso’s code are published on GitHub under their own licence; that licence applies to the code, not to your account. If you send us feedback, we may use it without owing you anything.</p>,
  },
  {
    id: "third",
    title: "Other companies’ services",
    body: <p>Oluso relies on other providers (hosting, database, scheduling, AI, Slack, email) and on the websites you test. We aren’t responsible for their availability or what they do, beyond choosing and instructing them with reasonable care. Your use of Slack and other connected services is also governed by their own terms.</p>,
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p>To the extent the law allows:</p>
        <ul>
          <li>We are not liable for indirect or consequential loss, or for loss of profits, sales, revenue, data, goodwill or business opportunity, including sales lost because Oluso didn’t detect or report a problem on your site.</li>
          <li>Our total liability to you for all claims about Oluso in any 12 months is limited to the greater of the amount you paid us in those 12 months and USD 50 (or the same value in Naira). During the free beta you pay nothing.</li>
        </ul>
        <p>Nothing in these terms limits liability that can’t be limited by law, such as for death or personal injury caused by negligence, or for fraud. If you are a consumer, you also keep the rights consumer law gives you.</p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "If someone makes a claim because of how you used Oluso",
    body: <p>If a third party (for example, the owner of a site you tested without permission) makes a claim against us because you broke these terms or the law, you agree to cover our reasonable costs and losses from that claim.</p>,
  },
  {
    id: "termination",
    title: "Ending your account",
    body: (
      <>
        <p>You can stop using Oluso at any time, and delete your account and all its data from <b>Settings → Delete account</b>.</p>
        <p>We may suspend or close your account, or pause specific flows, if you break these terms, if your use creates a risk for others or for us, or if we are required to by law. Where reasonable we’ll tell you first and give you a chance to fix the problem. When an account is closed we delete its data as described in the Privacy Policy.</p>
        <p>Sections 7 (your content), 10 (liability), 11 (claims) and 14 (law) continue after the account ends.</p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: <p>We may update these terms. For changes that matter, we’ll email account holders or show a notice in the app at least 14 days before they apply, unless a change is needed sooner for legal or security reasons. If you keep using Oluso after that, the new terms apply. If you don’t agree, delete your account before then.</p>,
  },
  {
    id: "law",
    title: "Law and disputes",
    body: <p>These terms are governed by the laws of the Federal Republic of Nigeria, and disputes go to the courts of Lagos State, Nigeria, unless the law where you live as a consumer gives you the right to use your local courts. Before going to court, please email us so we can try to sort it out.</p>,
  },
  {
    id: "contact",
    title: "Contact",
    body: <p>Questions about these terms: <OperatorEmail />, or write to <OperatorName />, <OperatorPlace />.</p>,
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      other={{ href: "/privacy", label: "Privacy Policy" }}
      intro={
        <>
          <p><b>The short version.</b> Oluso visits websites you name, in an automated browser, and records what happens. Only use it on sites you own or are allowed to test. Don’t use it to load-test, scrape or break into anything. It’s a free beta with no guarantees, so treat it as an extra pair of eyes, not a promise that your site works.</p>
          <p>The full terms follow. They’re written to be read, not just agreed to.</p>
        </>
      }
      sections={sections}
    />
  );
}
