export type SourceLink = { label: string; url: string };
export type Passage = { book: string; chapter: number; verse?: number; endVerse?: number };
export type PassageTarget = Passage & { start?: number; end?: number; note?: number; connection?: string };
export type StudyConnection = {
  id: string;
  title: string;
  kind: 'quotation' | 'fulfilment' | 'echo' | 'typology' | 'theme';
  summary: string;
  passages: (Passage & { verse: number; label: string })[];
  sources: SourceLink[];
};
export type BookIntroduction = { book: string; summary: string; sources: SourceLink[] };
export type ChapterStudy = { introduction: BookIntroduction | null; connections: StudyConnection[] };
