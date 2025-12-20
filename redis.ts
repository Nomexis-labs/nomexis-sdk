"use server"

import tls from "tls"
import net from "net"

type RedisSocket = tls.TLSSocket | net.Socket

type PendingCommand = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

type ParsedResponse = {
  value: unknown
  rest: Buffer
  isError: boolean
}

let connectionPromise: Promise<RedisConnection | null> | null = null

class RedisConnection {
  private socket: RedisSocket
  private buffer: Buffer = Buffer.alloc(0)
  private queue: PendingCommand[] = []
  private healthy = true

  constructor(socket: RedisSocket) {
    this.socket = socket
    socket.on("data", (chunk) => this.handleData(chunk))
    socket.on("error", (error) => {
      this.healthy = false
      this.flushError(error)
    })
    socket.on("close", () => {
      this.healthy = false
      this.flushError(new Error("Redis connection closed"))
    })
  }

  isHealthy() {
    return this.healthy
  }

  private flushError(error: Error) {
    while (this.queue.length) {
      const pending = this.queue.shift()
      pending?.reject(error)
    }
  }

  private handleData(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    while (true) {
      const parsed = parseRESP(this.buffer)
      if (!parsed) {
        break
      }
      this.buffer = parsed.rest
      const pending = this.queue.shift()
      if (pending) {
        if (parsed.isError) {
          pending.reject(parsed.value)
        } else {
          pending.resolve(parsed.value)
        }
      }
    }
  }

  sendCommand(args: string[]): Promise<unknown> {
    if (!this.isHealthy()) {
      return Promise.reject(new Error("Redis connection unavailable"))
    }

    const payload = encodeCommand(args)

    return new Promise<unknown>((resolve, reject) => {
      this.queue.push({ resolve, reject })
      this.socket.write(payload, (err) => {
        if (err) {
          reject(err)
        }
      })
    })
  }
}

function parseRESP(buffer: Buffer): ParsedResponse | null {
  if (buffer.length === 0) {
    return null
  }

  const prefix = buffer[0]
  const restBuffer = buffer.subarray(1)

  const readLine = (buf: Buffer): { line: string; rest: Buffer } | null => {
    const idx = buf.indexOf("\r\n")
    if (idx === -1) return null
    const line = buf.subarray(0, idx).toString()
    const rest = buf.subarray(idx + 2)
    return { line, rest }
  }

  switch (prefix) {
    case "+".charCodeAt(0): {
      const result = readLine(restBuffer)
      if (!result) return null
      return { value: result.line, rest: result.rest, isError: false }
    }
    case "-".charCodeAt(0): {
      const result = readLine(restBuffer)
      if (!result) return null
      return { value: new Error(result.line), rest: result.rest, isError: true }
    }
    case ":".charCodeAt(0): {
      const result = readLine(restBuffer)
      if (!result) return null
      return { value: Number(result.line), rest: result.rest, isError: false }
    }
    case "$".charCodeAt(0): {
      const result = readLine(restBuffer)
      if (!result) return null
      const length = Number(result.line)
      if (length === -1) {
        return { value: null, rest: result.rest, isError: false }
      }
      if (result.rest.length < length + 2) {
        return null
      }
      const value = result.rest.subarray(0, length).toString()
      const rest = result.rest.subarray(length + 2)
      return { value, rest, isError: false }
    }
    case "*".charCodeAt(0): {
      const result = readLine(restBuffer)
      if (!result) return null
      const count = Number(result.line)
      if (count === -1) {
        return { value: null, rest: result.rest, isError: false }
      }
      let rest = result.rest
      const items: unknown[] = []
      for (let i = 0; i < count; i += 1) {
        const parsedItem = parseRESP(rest)
        if (!parsedItem) return null
        items.push(parsedItem.value)
        rest = parsedItem.rest
      }
      return { value: items, rest, isError: false }
    }
    default:
      return null
  }
}

function encodeCommand(args: string[]): Buffer {
  const parts = [`*${args.length}\r\n`]
  for (const arg of args) {
    const byteLength = Buffer.byteLength(arg)
    parts.push(`$${byteLength}\r\n${arg}\r\n`)
  }
  return Buffer.from(parts.join(""))
}

function normaliseRedisUrl(raw: string) {
  let candidate = raw.trim()
  if (!candidate) {
    throw new Error("Empty Redis connection string")
  }

  if (candidate.startsWith("redis-cli")) {
    const parts = candidate.split(/\s+/)
    const match = parts.find((part) => part.startsWith("redis://") || part.startsWith("rediss://"))
    if (match) {
      candidate = match
    }
  }

  if (!candidate.startsWith("redis://") && !candidate.startsWith("rediss://")) {
    throw new Error(`Invalid Redis URL: ${candidate}`)
  }

  return candidate
}

function parseRedisUrl(urlStr: string) {
  const url = new URL(normaliseRedisUrl(urlStr))
  const host = url.hostname
  const port = Number(url.port || (url.protocol === "rediss:" ? 6380 : 6379))
  const password = url.password || undefined
  const isTls = url.protocol === "rediss:"
  return { host, port, password, isTls }
}

async function createConnection(): Promise<RedisConnection | null> {
  const url = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING
  if (!url) {
    return null
  }

  const { host, port, password, isTls } = parseRedisUrl(url)

  const socket: RedisSocket = isTls
    ? tls.connect({ host, port, rejectUnauthorized: false })
    : net.connect({ host, port })

  return await new Promise<RedisConnection | null>((resolve, reject) => {
    const onError = (error: Error) => {
      socket.destroy()
      reject(error)
    }

    socket.once("error", onError)

    const onConnect = async () => {
      socket.removeListener("error", onError)
      if (isTls) {
        socket.removeListener("secureConnect", onConnect)
      } else {
        socket.removeListener("connect", onConnect)
      }

      const connection = new RedisConnection(socket)
      if (password) {
        try {
          await connection.sendCommand(["AUTH", password])
        } catch (error) {
          socket.destroy()
          reject(error instanceof Error ? error : new Error("Redis authentication failed"))
          return
        }
      }
      resolve(connection)
    }

    if (isTls) {
      socket.once("secureConnect", onConnect)
    } else {
      socket.once("connect", onConnect)
    }
  })
}

async function getConnection(): Promise<RedisConnection | null> {
  if (!connectionPromise) {
    connectionPromise = createConnection().catch((error) => {
      console.warn("Failed to initialise Redis", error)
      return null
    })
  }
  const connection = await connectionPromise

  if (connection && !connection.isHealthy()) {
    connectionPromise = createConnection().catch((error) => {
      console.warn("Failed to reinitialise Redis", error)
      return null
    })
    return await connectionPromise
  }

  return connection
}

export async function redisGet(key: string): Promise<string | null> {
  const connection = await getConnection()
  if (!connection) return null
  const value = await connection.sendCommand(["GET", key])
  return typeof value === "string" ? value : null
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const connection = await getConnection()
  if (!connection) return
  const args = ["SET", key, value]
  if (ttlSeconds && ttlSeconds > 0) {
    args.push("EX", ttlSeconds.toString())
  }
  await connection.sendCommand(args)
}

export async function redisDel(key: string): Promise<void> {
  const connection = await getConnection()
  if (!connection) return
  await connection.sendCommand(["DEL", key])