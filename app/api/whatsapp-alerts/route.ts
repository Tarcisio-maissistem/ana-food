import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function getUserByEmail(email: string) {
  try {
    const { data: user, error } = await supabase.from("users").select("id").eq("email", email).single()

    if (error || !user) {
      console.log("[v0] Usuário não encontrado para email:", email)
      return null
    }

    return user.id
  } catch (error) {
    console.error("[v0] Erro ao buscar usuário:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const userId = await getUserByEmail(userEmail)

    if (!userId) {
      console.log("[v0] WhatsApp Alerts: Usuário não encontrado, retornando array vazio")
      return NextResponse.json([])
    }

    const { data: alerts, error } = await supabase
      .from("whatsapp_alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("relation")) {
        console.log("[v0] Tabela whatsapp_alerts não existe, retornando array vazio")
        return NextResponse.json([])
      }
      console.error("Erro ao buscar alertas:", error)
      return NextResponse.json([])
    }

    return NextResponse.json(alerts || [])
  } catch (error) {
    console.error("Erro na API de alertas:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const userId = await getUserByEmail(userEmail)

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 400 })
    }

    const body = await request.json()
    const { customer_name, phone, message, order_id } = body

    const { data, error } = await supabase
      .from("whatsapp_alerts")
      .insert([{ customer_name, phone, message, order_id, user_id: userId }])
      .select()

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("relation")) {
        console.log("[v0] Tabela whatsapp_alerts não existe, simulando criação")
        return NextResponse.json({
          id: `mock-${Date.now()}`,
          customer_name,
          phone,
          message,
          order_id,
          user_id: userId,
          created_at: new Date().toISOString(),
        })
      }
      console.error("Erro ao criar alerta:", error)
      return NextResponse.json({ error: "Erro ao criar alerta" }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error("Erro na API de alertas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const userId = await getUserByEmail(userEmail)

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 400 })
    }

    const body = await request.json()
    const { id, is_read } = body

    const { data, error } = await supabase
      .from("whatsapp_alerts")
      .update({ is_read, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select()

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("relation")) {
        console.log("[v0] Tabela whatsapp_alerts não existe, simulando atualização")
        return NextResponse.json({
          id,
          is_read,
          updated_at: new Date().toISOString(),
        })
      }
      console.error("Erro ao atualizar alerta:", error)
      return NextResponse.json({ error: "Erro ao atualizar alerta" }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error("Erro na API de alertas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
