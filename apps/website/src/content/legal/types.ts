/**
 * Content model for the legal pages (/privacy, /terms, /security).
 *
 * Deliberately plain data rather than JSX: the copy on these pages needs review
 * and editing by people who shouldn't have to touch layout code, and keeping it
 * serialisable means the three pages can share one renderer (LegalPage.tsx).
 */

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  /** Rendered with the shared Alert primitive — for the points that matter most. */
  | { kind: 'note'; variant: 'neutral' | 'warning'; title: string; text: string };

export interface LegalSection {
  /** Anchor id; also what the table of contents links to. */
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  /** ISO date, rendered as "Last updated". */
  lastUpdated: string;
  sections: LegalSection[];
}
