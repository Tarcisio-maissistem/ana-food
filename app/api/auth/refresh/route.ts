import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ sub: userId, type: "access" }, process.env.ACCESS_SECRET!, { expiresIn: "30m" })

  const refreshToken = jwt.sign({ sub: userId, type: "refresh" }, process.env.REFRESH_SECRET!, { expiresIn: "7d" })

  return { accessToken, refreshToken }
}

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token não encontrado" }, { status: 401 })
    }

    // Verificar refresh token
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET!) as any

    if (payload.type !== "refresh") {
      return NextResponse.json({ error: "Token inválido" }, { status: 403 })
    }

    // Buscar usuário para verificar se ainda existe
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", payload.sub)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 })
    }

    // Gerar novos tokens
    const tokens = generateTokens(user.id)

    // Criar resposta
    const response = NextResponse.json({
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })

    // Atualizar refresh token no cookie
    response.cookies.set("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Erro no refresh:", error)
    return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 403 })
  }
}
