import Link from "next/link";
import type { ReactNode } from "react";
import { OPERATOR } from "@/lib/operator";
import { PublicHeader } from "./public-header";
import { LandingFooter } from "./scanner";

export interface LegalSection { id: string; title: string; body: ReactNode }

/** Placeholder the owner must fill in before launch; highlighted so it can't be missed. */
export function Ph({ children }: { children: ReactNode }) {
  return <mark className="ph">[{children}]</mark>;
}

// Operator details from lib/operator.ts, or a placeholder while they're empty.
export const OperatorName = () => (OPERATOR.name ? <>{OPERATOR.name}</> : <Ph>Your full name (trading as Oluso)</Ph>);
export const OperatorPlace = () => (OPERATOR.place ? <>{OPERATOR.place}</> : <Ph>City, country</Ph>);
export const OperatorEmail = () =>
  OPERATOR.email ? <a className="link" href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a> : <Ph>Contact email</Ph>;

/** Plain page for /terms and /privacy: wordmark, contents list, sections, footer. */
export function LegalPage({ title, intro, sections, other }: { title: string; intro: ReactNode; sections: LegalSection[]; other: { href: string; label: string } }) {
  return (
    <>
      <PublicHeader extra={other} />
      <main className="legal">
        <h1>{title}</h1>
        <p className="legal-meta">Effective 25 November 2026 · Last updated 25 November 2026</p>
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
