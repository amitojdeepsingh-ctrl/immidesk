import entries, { type KbEntry } from "./entries";

interface SearchResult {
  entry: KbEntry;
  score: number;
  highlights: string[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function scoreEntry(entry: KbEntry, queryTokens: string[], rawQuery: string): SearchResult {
  const titleTokens = tokenize(entry.title);
  const contentTokens = tokenize(entry.content);
  const keywordTokens = entry.keywords.flatMap(tokenize);
  const allTokens = new Set([...titleTokens, ...contentTokens, ...keywordTokens]);

  let score = 0;
  const matchedTokens = new Set<string>();

  for (const qt of queryTokens) {
    for (const et of allTokens) {
      if (et.includes(qt) || qt.includes(et)) {
        score += 3;
        matchedTokens.add(qt);
        break;
      }
    }
  }

  for (const kw of entry.keywords) {
    const kwLower = kw.toLowerCase();
    if (rawQuery.toLowerCase().includes(kwLower)) {
      score += 10;
      matchedTokens.add(kw);
    }
  }

  if (rawQuery.toLowerCase().includes(entry.category.toLowerCase())) {
    score += 5;
  }

  const highlights: string[] = [];
  for (const sentence of entry.content.split(".").slice(0, 3)) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    const hasMatch = queryTokens.some((qt) => lower.includes(qt));
    if (hasMatch) {
      highlights.push(trimmed.length > 200 ? trimmed.slice(0, 200) + "..." : trimmed);
    }
  }

  return { entry, score, highlights };
}

export function searchKnowledgeBase(query: string, limit = 5): SearchResult[] {
  if (!query.trim()) return [];

  const rawQuery = query.trim();
  const queryTokens = tokenize(rawQuery);

  const scored = entries
    .map((entry) => scoreEntry(entry, queryTokens, rawQuery))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
