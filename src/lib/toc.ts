import GithubSlugger from 'github-slugger';

export interface TocItem {
  level: number;
  text: string;
  slug: string;
}

export function extractToc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const lines = markdown.split('\n');
  const items: TocItem[] = [];

  let inCodeBlock = false;
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,2})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*|__|~~|`/g, '').trim();
      items.push({ level, text, slug: slugger.slug(text) });
    }
  }

  return items;
}
