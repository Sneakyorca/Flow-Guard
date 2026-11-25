import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { OperatorEmail } from "@/components/legal";
import { PublicHeader } from "@/components/public-header";
import { LandingFooter } from "@/components/scanner";

export const metadata: Metadata = {
  title: "Help",
  description: "How to set up Oluso: add a flow, write steps that work, read a failure replay, and get alerts.",
};

const SECTIONS: Array<{ id: string; title: string; body: ReactNode }> = [
  {
    id: "what",
    title: "What Oluso does",
    body: (
      <p>Every hour, Oluso opens your website in a real browser and does what a customer would do: sign up, add to cart, check out. You describe each step in plain English. If a step stops working, you get a video of the run, the error, and a short explanation of what to check.</p>
    ),
  },
  {
    id: "first-flow",
    title: "Add your first flow",
    body: (
      <ol>
        <li><Link className="link" href="/signup">Create a free account</Link>, or <Link className="link" href="/login">log in</Link>.</li>
        <li>On <b>Monitors</b>, press <b>New flow</b>.</li>
        <li>Give it a name (for example “Guest checkout”) and the <b>start page</b>: the first address the browser should open.</li>
        <li>Write the steps, one action each. See <a className="link" href="#steps">Writing steps</a> below.</li>
        <li>Press <b>Create flow</b>, or <b>Save and run now</b> to see the first result in about 2–3 minutes.</li>
      </ol>
    ),
  },
  {
    id: "steps",
    title: "Writing steps",
    body: (
      <>
        <p>Write steps the way you’d explain the journey to a new teammate. Use the words that are actually on the button or field.</p>
        <ul>
          <li><b>Click:</b> <code>Click “Sign up”</code>, <code>Click the Active filter</code>, <code>Click “Add” for “Vitamin C serum”</code></li>
          <li><b>Type:</b> <code>Type “ada@example.com” into the email field</code>. Add <code>and press Enter</code> to submit.</li>
          <li><b>Go to a page:</b> <code>Go to /pricing</code> or a full address.</li>
          <li><b>Check text:</b> <code>Check that “Order confirmed” is visible</code></li>
          <li><b>Check the address:</b> <code>Check the URL contains /thank-you</code></li>
        </ul>
        <p><b>Fresh test details on every run.</b> Sign-up forms often reject an email they’ve already seen. Use <code>{"{{random_email}}"}</code>, <code>{"{{random_name}}"}</code>, <code>{"{{timestamp}}"}</code> or <code>{"{{random_number}}"}</code> and Oluso fills in a new value each time, for example <code>{"Type {{random_email}} into the email field"}</code>.</p>
        <p><b>Tips</b></p>
        <ul>
          <li>One action per step. Two short steps work better than one long one.</li>
          <li>End with a check (“Check that … is visible”), so a page that loads but shows an error still counts as a failure.</li>
          <li>Stop before anything that costs money or sends real messages: open checkout, but don’t pay.</li>
          <li>Only test websites you own or are allowed to test (see the <Link className="link" href="/terms#authorised">Terms</Link>).</li>
        </ul>
      </>
    ),
  },
  {
    id: "screen",
    title: "Phone or desktop",
    body: (
      <p>Pick <b>Mobile</b> (390 × 844, like an iPhone 15) if most of your customers shop on their phones, or <b>Desktop</b> (1440 × 900). Pages can look and behave differently at each size, so you can add the same journey twice, once for each.</p>
    ),
  },
  {
    id: "schedule",
    title: "How often it runs",
    body: (
      <ul>
        <li>Choose every hour, every 6 hours or daily. Hourly runs start a few minutes past the hour.</li>
        <li><b>Run now</b> on a flow starts an extra run straight away; the page updates by itself when the result arrives.</li>
        <li><b>Pause</b> stops scheduled runs without deleting anything. Run now still works while paused.</li>
      </ul>
    ),
  },
  {
    id: "failures",
    title: "When a run fails",
    body: (
      <>
        <ul>
          <li>A failed run is <b>run once more</b> straight away. If it passes the second time it’s marked <b>Flaky</b> and nobody is alerted. If it fails again, it’s a real failure.</li>
          <li>Open the run to see the <b>replay</b>: the video, which step failed, a plain-English explanation, a screenshot after every step, and the browser’s console and network errors.</li>
          <li><b>Copy share link</b> gives you a page you can send to a developer. They see that one run and nothing else from your account. You can switch public links off on <Link className="link" href="/alerts">Alerts</Link>.</li>
        </ul>
        <p>Common reasons a step fails: the button text changed (update the step), a popup or cookie banner covered it, or the page really is broken, which is what Oluso is there to catch.</p>
      </>
    ),
  },
  {
    id: "alerts",
    title: "Alerts",
    body: (
      <ul>
        <li><b>Slack:</b> in Slack, create an incoming webhook (api.slack.com/apps → your app → Incoming Webhooks), paste its address on <Link className="link" href="/alerts">Alerts</Link> and press <b>Send test message</b>.</li>
        <li><b>Email:</b> switch <b>Email me</b> on to get an email at your account address when a flow really fails.</li>
        <li>You’re only alerted for confirmed failures, never for flaky runs.</li>
      </ul>
    ),
  },
  {
    id: "scan",
    title: "Free site scan",
    body: (
      <p>Not sure where to start? Paste your address on the <Link className="link" href="/">home page</Link>. Oluso opens up to 15 of your pages on a phone-sized screen and reports dead links, pages that scroll sideways on a phone, and JavaScript errors. No account needed.</p>
    ),
  },
  {
    id: "data",
    title: "How long we keep things",
    body: (
      <ul>
        <li>Recordings and screenshots of passing runs: 7 days. Failed runs: 30 days.</li>
        <li>Run history: 90 days. Free scan reports: 30 days.</li>
        <li>Delete a flow from its page, or your whole account from <Link className="link" href="/settings">Settings</Link>. Both remove recordings straight away. Details are in the <Link className="link" href="/privacy">Privacy Policy</Link>.</li>
      </ul>
    ),
  },
  {
    id: "beta",
    title: "During the free beta",
    body: (
      <p>Oluso is free while in beta, with up to 25 flows per workspace and no card needed. It’s an extra pair of eyes, not a guarantee: keep testing your site yourself too.</p>
    ),
  },
  {
    id: "contact",
    title: "Still stuck?",
    body: <p>Email <OperatorEmail /> with the flow name and, if it’s about a run, its share link.</p>,
  },
];

export default function HelpPage() {
  return (
    <>
      <PublicHeader />
      <main className="legal">
        <h1>Help</h1>
        <div className="legal-intro"><p>Everything you need to set up Oluso and understand what it tells you. Five minutes to read.</p></div>
        <nav className="legal-toc" aria-label="Contents">
          <b>Contents</b>
          <ol>{SECTIONS.map((s) => <li key={s.id}><a className="link" href={`#${s.id}`}>{s.title}</a></li>)}</ol>
        </nav>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
            <h2 id={`${s.id}-h`}>{s.title}</h2>
            {s.body}
          </section>
        ))}
      </main>
      <LandingFooter />
    </>
  );
}
