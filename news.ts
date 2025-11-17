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
    case "zh":
    case "zh-cn":
    case "zh-hans":
      return "中文";
    case "zh-tw":
    case "zh-hant":
      return "繁體中文";
    case "ja":
      return "日本語";
    case "ko":
      return "한국어";
    default:
      return language.toUpperCase();
  }
}


// Updated: 2026-03-09