import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { email, userId, nomeCompleto } = await request.json()

    const confirmationToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

    const supabase = createClient()

    const { error: tokenError } = await supabase.from("email_confirmations").insert({
      user_id: userId,
      token: confirmationToken,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    })

    if (tokenError) {
      console.error("[v0] Erro ao salvar token:", tokenError)
      throw new Error("Erro ao gerar token de confirmação")
    }

    const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/confirm-email?token=${confirmationToken}`

    console.log("[v0] Email de confirmação seria enviado para:", email)
    console.log("[v0] Link de confirmação:", confirmationUrl)
    console.log("[v0] Nome:", nomeCompleto)

    // TODO: Integrar com serviço de email real (SendGrid, Resend, etc.)

    return NextResponse.json({
      message: "Email de confirmação enviado com sucesso",
      // Em desenvolvimento, retorna o link para facilitar testes
      ...(process.env.NODE_ENV === "development" && { confirmationUrl }),
    })
  } catch (error: any) {
    console.error("[v0] Erro ao enviar email de confirmação:", error)
    return NextResponse.json({ error: "Erro ao enviar email de confirmação" }, { status: 500 })
  }
}
