import { logEvent } from "../telemetry";
import type { WikiArticle, WikiKnowledgeBase } from "../transmutation/transmutation-types";

export interface WikiBridgeConfig {
  domain: string;
  max_articles?: number;
  max_tokens_per_article?: number;
  cache_ttl_hours?: number;
  language?: "en" | "uk" | "ru";
  generateArticleTitles?: (params: {
    domain: string;
    language: "en" | "uk" | "ru";
    maxArticles: number;
  }) => Promise<string[]>;
  scoreArticleRelevance?: (params: {
    domain: string;
    article: Pick<WikiArticle, "title" | "summary" | "tags">;
    language: "en" | "uk" | "ru";
  }) => Promise<number>;
}

type WikiCacheEntry = {
  knowledge: WikiKnowledgeBase;
  cacheKey: string;
};

type WikipediaSummaryResponse = {
  title?: string;
  extract?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
};

const DEFAULT_MAX_ARTICLES = 12;
const DEFAULT_MAX_SUMMARY_CHARS = 800;
const DEFAULT_CACHE_TTL_HOURS = 24;
const DEFAULT_LANGUAGE: "en" | "uk" | "ru" = "en";
const WIKI_RELEVANCE_THRESHOLD = 0.4;
const wikiCache = new Map<string, WikiCacheEntry>();

export function getWikiCacheKey(domain: string, language: "en" | "uk" | "ru" = DEFAULT_LANGUAGE): string {
  return `wiki:${normalizeDomain(domain)}:${language}`;
}

export function getCachedWikiKnowledge(
  domain: string,
  language: "en" | "uk" | "ru" = DEFAULT_LANGUAGE,
): WikiKnowledgeBase | null {
  const key = getWikiCacheKey(domain, language);
  const cached = wikiCache.get(key);
  if (!cached) return null;
  if (Date.parse(cached.knowledge.cache_valid_until) <= Date.now()) {
    wikiCache.delete(key);
    return null;
  }
  return cached.knowledge;
}

export function clearWikiBridgeCache(): void {
  wikiCache.clear();
}

export async function bootstrapWikiKnowledge(config: WikiBridgeConfig): Promise<WikiKnowledgeBase | null> {
  const domain = config.domain.trim();
  if (domain.length === 0) return null;

  const language = config.language ?? DEFAULT_LANGUAGE;
  const maxArticles = Math.max(1, Math.min(DEFAULT_MAX_ARTICLES, config.max_articles ?? DEFAULT_MAX_ARTICLES));
  const summaryChars = Math.max(120, config.max_tokens_per_article ?? DEFAULT_MAX_SUMMARY_CHARS);
  const ttlHours = Math.max(1, config.cache_ttl_hours ?? DEFAULT_CACHE_TTL_HOURS);
  const cacheKey = getWikiCacheKey(domain, language);
  const cached = getCachedWikiKnowledge(domain, language);
  if (cached) {
    logEvent("wiki_bridge_cache_hit", { domain, language, cacheKey, articleCount: cached.articles.length });
    return cached;
  }

  try {
    const titles = await generateArticleTitles({
      domain,
      language,
      maxArticles,
      generateArticleTitles: config.generateArticleTitles,
    });
    const uniqueTitles = dedupeTitles(titles).slice(0, maxArticles);
    const fetched = await Promise.all(
      uniqueTitles.map((title) => fetchWikipediaSummary(title, language, summaryChars)),
    );
    const scored = await Promise.all(
      fetched
        .filter((article): article is WikiArticle => article != null)
        .map(async (article) => {
          const relevance = await scoreArticleRelevance({
            domain,
            article,
            language,
            scoreArticleRelevance: config.scoreArticleRelevance,
          });
          return {
            ...article,
            relevance_score: clamp01(relevance),
          } satisfies WikiArticle;
        }),
    );
    const articles = scored
      .filter((article) => article.relevance_score >= WIKI_RELEVANCE_THRESHOLD)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, maxArticles);

    if (articles.length === 0) {
      logEvent("wiki_bridge_bootstrap_empty", { domain, language, cacheKey });
      return null;
    }

    const bootstrappedAt = new Date().toISOString();
    const cacheValidUntil = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    const knowledge: WikiKnowledgeBase = {
      domain,
      articles,
      core_concepts: extractCoreConcepts(articles).slice(0, 10),
      domain_vocabulary: extractDomainVocabulary(domain, articles).slice(0, 24),
      bootstrapped_at: bootstrappedAt,
      cache_valid_until: cacheValidUntil,
    };

    wikiCache.set(cacheKey, { knowledge, cacheKey });
    logEvent("wiki_bridge_bootstrap_success", {
      domain,
      language,
      cacheKey,
      articleCount: knowledge.articles.length,
      concepts: knowledge.core_concepts.length,
      vocabulary: knowledge.domain_vocabulary.length,
    });
    return knowledge;
  } catch (error) {
    logEvent("wiki_bridge_bootstrap_failed", {
      domain,
      language,
      cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function generateArticleTitles(params: {
  domain: string;
  language: "en" | "uk" | "ru";
  maxArticles: number;
  generateArticleTitles?: WikiBridgeConfig["generateArticleTitles"];
}): Promise<string[]> {
  if (params.generateArticleTitles) {
    const titles = await params.generateArticleTitles({
      domain: params.domain,
      language: params.language,
      maxArticles: params.maxArticles,
    });
    if (Array.isArray(titles) && titles.length > 0) {
      return titles.filter((title): title is string => typeof title === "string" && title.trim().length > 0);
    }
  }
  return heuristicTitlesForDomain(params.domain, params.maxArticles);
}

async function scoreArticleRelevance(params: {
  domain: string;
  article: Pick<WikiArticle, "title" | "summary" | "tags">;
  language: "en" | "uk" | "ru";
  scoreArticleRelevance?: WikiBridgeConfig["scoreArticleRelevance"];
}): Promise<number> {
  if (params.scoreArticleRelevance) {
    const score = await params.scoreArticleRelevance({
      domain: params.domain,
      article: params.article,
      language: params.language,
    });
    if (Number.isFinite(score)) {
      return score;
    }
  }
  return heuristicRelevanceScore(params.domain, params.article);
}

async function fetchWikipediaSummary(
  title: string,
  language: "en" | "uk" | "ru",
  maxSummaryChars: number,
): Promise<WikiArticle | null> {
  const url = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as WikipediaSummaryResponse;
  const articleTitle = payload.title?.trim();
  const extract = payload.extract?.trim();
  const pageUrl = payload.content_urls?.desktop?.page?.trim();
  if (!articleTitle || !extract || !pageUrl) {
    return null;
  }
  const summary = trimSummary(extract, maxSummaryChars);
  return {
    title: articleTitle,
    url: pageUrl,
    summary,
    relevance_score: 0,
    tags: extractTags(articleTitle, summary),
  };
}

function heuristicTitlesForDomain(domain: string, maxArticles: number): string[] {
  const normalized = normalizeDomain(domain);
  const baseTokens = domain
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  const common = [
    domain,
    `${domain} industry`,
    `${domain} management`,
    `${domain} operations`,
    `${domain} regulation`,
    `${domain} risk management`,
    `${domain} economics`,
    `${domain} technology`,
    `${domain} services`,
    `${domain} terminology`,
    `${domain} strategy`,
    `${domain} governance`,
  ];
  if (normalized.includes("bank")) {
    common.unshift(
      "Bank",
      "Commercial bank",
      "Central bank",
      "Financial regulation",
      "Risk management",
      "Basel III",
      "Credit risk",
      "Fractional-reserve banking",
      "Financial services",
      "Investment banking",
      "Monetary policy",
      "Compliance"
    );
  }
  for (const token of baseTokens) {
    common.push(token);
  }
  return dedupeTitles(common).slice(0, maxArticles);
}

function heuristicRelevanceScore(domain: string, article: Pick<WikiArticle, "title" | "summary" | "tags">): number {
  const domainTerms = tokenize(domain);
  const articleTerms = new Set([
    ...tokenize(article.title),
    ...tokenize(article.summary),
    ...article.tags.flatMap((tag) => tokenize(tag)),
  ]);
  if (domainTerms.length === 0) {
    return 0.5;
  }
  let overlap = 0;
  for (const term of domainTerms) {
    if (articleTerms.has(term)) overlap += 1;
  }
  const lexical = overlap / domainTerms.length;
  const titleBoost = tokenize(article.title).some((term) => domainTerms.includes(term)) ? 0.25 : 0;
  const tagBoost = article.tags.length > 0 ? Math.min(0.2, article.tags.length * 0.04) : 0;
  return Math.min(1, lexical + titleBoost + tagBoost);
}

function extractCoreConcepts(articles: WikiArticle[]): string[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    for (const token of tokenize(`${article.title} ${article.summary}`)) {
      if (token.length < 4) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([token]) => token)
    .slice(0, 10);
}

function extractDomainVocabulary(domain: string, articles: WikiArticle[]): string[] {
  const phrases = new Set<string>();
  phrases.add(domain.trim());
  for (const article of articles) {
    phrases.add(article.title);
    for (const tag of article.tags) {
      if (tag.length >= 4) {
        phrases.add(tag);
      }
    }
  }
  return Array.from(phrases).slice(0, 24);
}

function extractTags(title: string, summary: string): string[] {
  const merged = `${title} ${summary}`;
  const terms = tokenize(merged);
  const unique = new Set<string>();
  for (const term of terms) {
    if (term.length < 4) continue;
    unique.add(term);
    if (unique.size >= 8) break;
  }
  return Array.from(unique);
}

function trimSummary(summary: string, maxSummaryChars: number): string {
  if (summary.length <= maxSummaryChars) return summary;
  return `${summary.slice(0, Math.max(0, maxSummaryChars - 1)).trimEnd()}…`;
}

function dedupeTitles(titles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rawTitle of titles) {
    const title = rawTitle.trim();
    if (title.length === 0) continue;
    const normalized = title.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(title);
  }
  return out;
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
