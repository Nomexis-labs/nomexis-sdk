export const stableQuotes = new Set(["USD", "USDT", "USDC"])

export function splitMarket(marketId: string) {
  const [baseRaw = "BTC", quoteRaw = "USD"] = marketId.toUpperCase().split("-")
  return { base: baseRaw, quote: quoteRaw }
}


// Final cleanup