export type NewsType = "article" | "flash"
export type NewsMode = "all" | "articles" | "flashes"

export type NewsArticle = {
  id: string
  title: string
  url: string
  source: string
  publishedAt: string
  language: string
  type: NewsType
  summary?: string | null
};

export function languageLabel(language: string): string {
  switch (language) {
    case "en":
      return "English";