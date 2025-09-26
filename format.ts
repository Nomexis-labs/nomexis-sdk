/**
 * 统一价格格式化工具
 * 确保所有代币（包括低单价代币如 dYdX）都能正确显示足够精度
 */

/**
 * 根据价格量级自动计算小数位数
 * - >= $1000: 2 位 (BTC ~$71,606.50)
 * - >= $1: 4 位 (ETH ~$2,251.85)
 * - >= $0.01: 6 位 (dYdX ~$0.524100)
 * - < $0.01: 8 位 (极端低价币)
 */
export function getPriceDecimals(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 2
  if (price >= 1000) return 2
  if (price >= 1) return 4
  if (price >= 0.01) return 6
  return 8
}

/**
 * 格式化价格 - 用于 OrderBook、RecentTrades、MarketSelector 等
 */
export function formatPrice(price: number, options: Intl.NumberFormatOptions = {}): string {
  if (!Number.isFinite(price)) return "—"
  const decimals = getPriceDecimals(price)
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
    ...options,
  }).format(price)
}

/**
 * 格式化货币（带 $ 符号）
 */
export function formatCurrency(value: number, options: Intl.NumberFormatOptions = {}): string {
  if (!Number.isFinite(value)) return "—"
  const decimals = getPriceDecimals(value)
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
    ...options,
  }).format(value)
}
