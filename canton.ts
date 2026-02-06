import { JsonRpcProvider, Wallet } from "ethers"

type NomexisSignerConfig = {
  rpcUrl: string
  chainId?: number
  privateKey: string
}

function loadConfig(): NomexisSignerConfig {
  const rpcUrl = process.env.Nomexis_RPC_URL ?? process.env.Nomexis_TESTNET_RPC_URL
  const privateKey = process.env.Nomexis_PRIVATE_KEY ?? process.env.Nomexis_DEPLOYER_KEY
  const chainIdRaw = process.env.Nomexis_CHAIN_ID ?? process.env.Nomexis_TESTNET_CHAIN_ID

  if (!rpcUrl) {
    throw new Error("Nomexis_RPC_URL or Nomexis_TESTNET_RPC_URL is not set")
  }

  if (!privateKey) {
    throw new Error("Nomexis_PRIVATE_KEY or Nomexis_DEPLOYER_KEY is not set")
  }

  const chainId = chainIdRaw ? Number(chainIdRaw) : undefined
  if (chainIdRaw && Number.isNaN(chainId)) {
    throw new Error("Nomexis_CHAIN_ID must be a number")
  }

  return { rpcUrl, chainId, privateKey }
}

export function createNomexisSigner() {
  const { rpcUrl, chainId, privateKey } = loadConfig()

  const provider = new JsonRpcProvider(rpcUrl, chainId)
  const wallet = new Wallet(privateKey, provider)

  return wallet
}

export function getNomexisConfig() {
  return loadConfig()
}
