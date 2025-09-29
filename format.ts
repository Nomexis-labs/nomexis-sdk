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

/**
 * 格式化数量（Size、Volume 等）- 使用较少小数位
 */
export function formatSize(size: number, options: Intl.NumberFormatOptions = {}): string {
  if (!Number.isFinite(size)) return "—"
  const decimals = size >= 1000 ? 2 : size >= 1 ? 4 : 6
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0, // 数量可以不显示尾部 0
    ...options,
  }).format(size)
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, options: Intl.NumberFormatOptions = {}): string {
  if (!Number.isFinite(value)) return "—"
  const sign = value >= 0 ? "+" : ""
  return `${sign}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    ...options,
  }).format(value)}%`
}

/**
 * 格式化紧凑数字 (1.23B, 3.45M, 5.67K) - 保留 2 位小数
 */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—"
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

/**
 * 获取 LightweightCharts 的 priceFormat 配置
 * 用于 K 线图自动精度
 */
export function getChartPriceFormat(price: number): { precision: number; minMove: number } {
  const decimals = getPriceDecimals(price)
  return {
    precision: decimals,
    minMove: Math.pow(10, -decimals),
  }
}