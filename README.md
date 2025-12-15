# Nomexis SDK

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

TypeScript utilities and API clients for building on Nomexis.

## Overview

This SDK provides type-safe utilities for interacting with the Nomexis perpetual derivatives platform. It includes formatting helpers, market utilities, and API client abstractions.

## Installation

Clone the repository:

```bash
git clone https://github.com/Nomexis-labs/nomexis-sdk.git
cd nomexis-sdk
pnpm install
```

Or copy the `src/` directory into your project.

## Features

- **Price Formatting** — Auto-adjust decimal precision based on price magnitude
- **Market Utilities** — Market ID parsing and quote token handling
- **API Types** — TypeScript definitions for Nomexis API responses
- **Wallet Helpers** — Address extraction and validation utilities

## Quick Start

```typescript
import { formatPrice, getPriceDecimals, splitMarket } from 'nomexis-sdk'

// Auto-format price with correct decimals
formatPrice(71234.56)  // "$71,234.57"
formatPrice(0.5241)   // "$0.524100"

// Get recommended decimals for a price
getPriceDecimals(50000)  // 2
getPriceDecimals(0.05)   // 6

// Parse market ID
const { base, quote } = splitMarket('BTC-USDC')  // { base: 'BTC', quote: 'USDC' }
```

## Project Structure

```
nomexis-sdk/
├── src/
│   ├── format.ts       # Price and size formatting
│   ├── markets.ts      # Market parsing utilities
│   ├── utils.ts        # General utilities
│   ├── privy.ts        # Wallet address helpers
│   ├── redis.ts        # Redis client utilities
│   ├── supabase.ts     # Supabase client helpers
│   └── index.ts        # Main exports
├── package.json
├── tsconfig.json
└── README.md
```

## Modules

### `format.ts`

Price and size formatting with automatic precision detection:

```typescript
import { formatPrice, formatSize, getPriceDecimals } from 'nomexis-sdk'

// Price formatting
formatPrice(price: number): string

// Size formatting
formatSize(size: number, decimals: number): string

// Get decimals by price magnitude
getPriceDecimals(price: number): number
```

### `markets.ts`

Market identification utilities:

```typescript
import { splitMarket, stableQuotes } from 'nomexis-sdk'

// Split market ID
splitMarket('ETH-USDC')  // { base: 'ETH', quote: 'USDC' }

// Known stable quote tokens
stableQuotes  // Set { 'USD', 'USDT', 'USDC' }
```

### `privy.ts`

Wallet address extraction from Privy user objects:

```typescript
import { getWalletAddress } from 'nomexis-sdk'

const address = getWalletAddress(user)  // Returns wallet address or undefined
```

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## Usage with Nomexis Web

This SDK is used internally by `nomexis-web`. Import directly:

```typescript
import { formatPrice } from '@/lib/format'
```

## License

MIT License — see [LICENSE](./LICENSE).

## Related Repositories

- [nomexis-web](https://github.com/Nomexis-labs/nomexis-web) — Trading frontend
- [nomexis-contracts](https://github.com/Nomexis-labs/nomexis-contracts) — Smart contracts
- [nomexis-docs](https://github.com/Nomexis-labs/nomexis-docs) — Documentation

---

Built for the [Canton Network](https://canton.network) ecosystem.