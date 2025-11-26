export function getWalletAddress(user: unknown) {
  if (!user || typeof user !== "object") {
    return undefined
  }

  const walletAddress = (user as { wallet?: { address?: unknown } | null }).wallet?.address
  if (typeof walletAddress === "string" && walletAddress.length > 0) {
    return walletAddress
  }

  const linkedAccounts = (user as { linkedAccounts?: unknown[] | null }).linkedAccounts
  for (const account of linkedAccounts ?? []) {
    const address = (account as { address?: unknown } | null | undefined)?.address
    if (typeof address === "string" && address.length > 0) {
      return address
    }
  }

  return undefined
}

