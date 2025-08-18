import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { createClient } from "@supabase/supabase-js"
import { generateAccessToken, generateRefreshToken, type AuthUser } from "@/lib/auth"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log("[v0] Tentativa de login para:", email)

    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 })
    }

    // Buscar usuário no banco
    const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single()

    if (error) {
      console.log("[v0] Erro ao buscar usuário:", error)
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }

    if (!user) {
      console.log("[v0] Usuário não encontrado")
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }

    console.log("[v0] Usuário encontrado:", { id: user.id, email: user.email, name: user.name })

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      console.log("[v0] Senha inválida")
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name || user.nome_completo || user.nome_responsavel || "Usuário",
      role: user.role || "user",
    }

    const accessToken = generateAccessToken(authUser)
    const refreshToken = generateRefreshToken(user.id)

    console.log("[v0] Tokens gerados com sucesso")

    // Criar resposta com cookie
    const response = NextResponse.json({
      accessToken,
      user: authUser,
    })

    // Definir refresh token como cookie HTTP-only
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: "/",
    })

    console.log("[v0] Login realizado com sucesso para:", email)
    return response
  } catch (error) {
    console.error("[v0] Erro no login:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
