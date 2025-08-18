import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: Buscando usuário por email")

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    console.log("[v0] Consultando usuário no banco:", email)

    const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single()

    if (error) {
      console.log("[v0] Usuário não encontrado:", error.message)
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    console.log("[v0] Usuário encontrado:", user.id)

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name || user.nome_completo || "Usuário",
      company_name: user.company_name || user.nome_fantasia,
    })
  } catch (error) {
    console.error("[v0] Erro na API get-user-by-email:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
