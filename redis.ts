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