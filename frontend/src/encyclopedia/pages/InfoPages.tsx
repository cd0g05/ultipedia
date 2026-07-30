// Footer stub pages (About / Contact / Privacy) — one InfoPage template,
// three thin exports, mirroring how Section.tsx serves five sections. Real
// copy (privacy policy, contact form) replaces these bodies later; the routes
// exist now so the mockup's footer links never 404.

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { pageTitle, Seo } from "../seo/Seo";

function InfoPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-8 px-6 py-24">
      <Seo title={pageTitle(title)} description={description} />
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-film-accentPink">
        {eyebrow}
      </p>
      <h1 className="font-heading text-4xl uppercase leading-tight tracking-tight text-zinc-900 lg:text-5xl">
        {title}
      </h1>
      <div className="max-w-lg space-y-4 text-lg text-zinc-600">{children}</div>
      <Link
        to="/"
        className="border border-film-border bg-film-panel px-6 py-3 font-mono text-sm uppercase tracking-wider text-zinc-900 transition-colors hover:border-zinc-400"
      >
        Back to Home
      </Link>
    </div>
  );
}

export function About() {
  return (
    <InfoPage
      eyebrow="About"
      title="About Ultipedia"
      description="Ultipedia is a free encyclopedia of ultimate frisbee drills, strategies, formations, plays, and skills — built by coaches, for coaches."
    >
      <p>
        Ultipedia is a free encyclopedia of ultimate frisbee drills,
        strategies, formations, plays, and skills — built for coaches and
        captains who don&apos;t have a playbook yet.
      </p>
      <p>
        Everything here is contributed by the community. If you run a drill
        worth sharing,{" "}
        <Link to="/contribute" className="text-film-accentPink underline">
          submit it
        </Link>{" "}
        and we&apos;ll add it to the encyclopedia.
      </p>
    </InfoPage>
  );
}

export function Contact() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="Get in touch"
      description="Questions, corrections, or ideas for Ultipedia? Get in touch."
    >
      <p>
        Have a question, a correction, or an idea? We&apos;d love to hear from
        you. A contact form is coming soon — in the meantime, the best way to
        contribute is to{" "}
        <Link to="/contribute" className="text-film-accentPink underline">
          submit a drill
        </Link>
        .
      </p>
    </InfoPage>
  );
}

export function Privacy() {
  return (
    <InfoPage
      eyebrow="Privacy"
      title="Privacy"
      description="How Ultipedia handles your data: no accounts, no tracking, no ads."
    >
      <p>
        Ultipedia doesn&apos;t require an account, doesn&apos;t track you
        across the web, and doesn&apos;t sell anything. Drill submissions are
        published with only the attribution you choose to provide.
      </p>
      <p>A full privacy policy will live here before any of that changes.</p>
    </InfoPage>
  );
}
