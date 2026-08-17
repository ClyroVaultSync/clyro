'use client';

import { useCallback } from 'react';
import LineSidebar from './LineSidebar';
import ScrollProgress from './ScrollProgress';
import { PageHeader } from './ui/PageHeader';
import { Alert } from './ui/Alert';
import { siteConfig } from '../lib/site-config';
import type { LegalBlock, LegalDocument } from '../content/legal/types';

/** Matches --color-accent in globals.css. LineSidebar takes a colour string
 * rather than reading a CSS variable, so it can't consume the token directly. */
const ACCENT = '#8b5cf6';

function Block({ block }: { block: LegalBlock }) {
  if (block.kind === 'p') {
    return <p className="text-sm leading-relaxed text-body">{block.text}</p>;
  }

  if (block.kind === 'list') {
    return (
      <ul className="flex flex-col gap-2 pl-5">
        {block.items.map(item => (
          <li key={item} className="list-disc text-sm leading-relaxed text-body marker:text-accent">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return <Alert isVisible variant={block.variant} title={block.title} description={block.text} />;
}

export default function LegalPage({ doc }: { doc: LegalDocument }) {
  const scrollToSection = useCallback(
    (index: number) => {
      const section = doc.sections[index];
      if (!section) return;
      document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [doc.sections]
  );

  const formattedDate = new Date(doc.lastUpdated).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div>
      <ScrollProgress />

      <PageHeader title={doc.title} subtitle={doc.subtitle} />

      <div className="mb-8 flex flex-wrap items-center gap-3 text-xs text-body/70">
        <span>Last updated {formattedDate}</span>
        <span aria-hidden="true">·</span>
        <span>
          Plain-language summary of how Clyro actually works — not legal advice. Have it reviewed before
          relying on it.
        </span>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
        {/* Hidden below lg: a proximity-driven rail needs a pointer and room to
            shift horizontally, and neither exists on a phone. The headings
            themselves remain the navigation there. */}
        <aside className="hidden shrink-0 lg:sticky lg:top-24 lg:block">
          <LineSidebar
            items={doc.sections.map(section => section.title)}
            accentColor={ACCENT}
            textColor="#a39c97"
            markerColor="#4a4340"
            markerLength={36}
            maxShift={12}
            itemGap={16}
            fontSize={0.85}
            proximityRadius={80}
            onItemClick={scrollToSection}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-10">
          {doc.sections.map((section, index) => (
            // scroll-mt clears the fixed progress bar and gives the heading air
            // when jumped to from the table of contents.
            <section key={section.id} id={section.id} className="flex scroll-mt-24 flex-col gap-4">
              <h2 className="flex items-baseline gap-3 text-lg font-semibold text-heading">
                <span className="font-mono text-xs text-body/60">{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </h2>
              {section.blocks.map((block, blockIndex) => (
                <Block key={blockIndex} block={block} />
              ))}
            </section>
          ))}

          <section className="flex scroll-mt-24 flex-col gap-4 border-t border-border pt-8">
            <h2 className="text-lg font-semibold text-heading">Questions</h2>
            <p className="text-sm leading-relaxed text-body">
              Clyro has no support inbox because it has no accounts to support. Everything is public:
              open an issue on{' '}
              <a
                href={siteConfig.issuesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-heading underline underline-offset-2 hover:text-accent"
              >
                GitHub
              </a>
              , or read the source at{' '}
              <a
                href={siteConfig.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-heading underline underline-offset-2 hover:text-accent"
              >
                {siteConfig.githubUrl.replace('https://', '')}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
