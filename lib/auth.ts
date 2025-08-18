import jwt from "jsonwebtoken"
import crypto from "crypto"
import type { NextRequest } from "next/server"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

let cachedAccessSecret: string | null = null
let cachedRefreshSecret: string | null = null

function generateSecret(): string {
  return crypto.randomBytes(64).toString("hex")
}

function getAccessSecret(): string {
  if (process.env.ACCESS_SECRET) {
    return process.env.ACCESS_SECRET
  }

  if (!cachedAccessSecret) {
    cachedAccessSecret = generateSecret()
    console.log("[v0] Access secret gerado automaticamente")
  }

  return cachedAccessSecret
}

function getRefreshSecret(): string {
  if (process.env.REFRESH_SECRET) {
    return process.env.REFRESH_SECRET
  }

  if (!cachedRefreshSecret) {
    cachedRefreshSecret = generateSecret()
    console.log("[v0] Refresh secret gerado automaticamente")
  }

  return cachedRefreshSecret
}

export function generateAccessToken(user: AuthUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      type: "access",
    },
    getAccessSecret(),
    { expiresIn: "30m" },
  )
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    {
      sub: userId,
      type: "refresh",
    },
    getRefreshSecret(),
    { expiresIn: "7d" },
  )
}

export function verifyAccessToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, getAccessSecret()) as any

    if (payload.type !== "access") {
      return null
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    }
  } catch (error) {
    return null
  }
}

export function verifyRefreshToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getRefreshSecret()) as any

    if (payload.type !== "refresh") {
      return null
    }

    return payload.sub
  } catch (error) {
    return null
  }
}

export function getAuthUser(request: NextRequest): AuthUser | null {
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyAccessToken(token)
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const accessToken = localStorage.getItem("accessToken")

  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  // Se access token expirou, tenta renovar
  if (response.status === 401) {
    const refreshResponse = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })

    if (refreshResponse.ok) {
      const { accessToken: newAccessToken } = await refreshResponse.json()
      localStorage.setItem("accessToken", newAccessToken)

      // Refaz a requisição original
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newAccessToken}`,
          "Content-Type": "application/json",
        },
      })
    } else {
      // Refresh token expirado, redirecionar para login
      localStorage.clear()
      window.location.href = "/login"
      throw new Error("Sessão expirada")
    }
  }

  return response
}
