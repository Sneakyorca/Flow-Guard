import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "./shell";
import { LandingFooter } from "./scanner";

export interface LegalSection { id: string; title: string; body: ReactNode }

/** Placeholder the owner must fill in before launch; highlighted so it can't be missed. */
export function Ph({ children }: { children: ReactNode }) {
  return <mark className="ph">[{children}]</mark>;
}

/** Plain page for /terms and /privacy: wordmark, contents list, sections, footer. */
export function LegalPage({ title, intro, sections, other }: { title: string; intro: ReactNode; sections: LegalSection[]; other: { href: string; label: string } }) {
  return (
    <>
      <header className="landing-top">
        <Link href="/" aria-label="FlowGuard home"><Wordmark beta={false} /></Link>
        <Link className="btn ghost" href={other.href}>{other.label}</Link>
      </header>
      <main className="legal">
        <h1>{title}</h1>
        <p className="legal-meta">Effective <Ph>Effective date</Ph> · Last updated <Ph>Effective date</Ph></p>
        <div className="legal-intro">{intro}</div>
        <nav className="legal-toc" aria-label="Contents">
          <b>Contents</b>
          <ol>{sections.map((s) => <li key={s.id}><a className="link" href={`#${s.id}`}>{s.title}</a></li>)}</ol>
        </nav>
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
            <h2 id={`${s.id}-h`}>{i + 1}. {s.title}</h2>
            {s.body}
          </section>
        ))}
      </main>
      <LandingFooter />
    </>
  );
}
