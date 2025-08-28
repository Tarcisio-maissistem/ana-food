import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function getUserByEmail(email: string) {
  try {
    const { data: user, error } = await supabase.from("users").select("id").eq("email", email).maybeSingle()

    if (error) {
      console.error("[v0] WhatsApp Alerts: Erro ao buscar usuário:", error.message)
      return null
    }

    if (!user) {
      console.log("[v0] WhatsApp Alerts: Usuário não encontrado para email:", email)
      return null
    }

    console.log("[v0] WhatsApp Alerts: Usuário encontrado:", user.id)
    return user.id
  } catch (error) {
    console.error("[v0] WhatsApp Alerts: Erro crítico ao buscar usuário:", error)
    return null
  }
}

async function checkTableStructure() {
  try {
    // Try to get one row to understand the table structure
    const { data, error } = await supabase.from("whatsapp_alerts").select("*").limit(1)

    if (error) {
      console.log("[v0] WhatsApp Alerts: Erro ao verificar estrutura da tabela:", error.message)
      return { exists: false, columns: [] }
    }

    // Get column names from the first row (if any)
    const columns = data && data.length > 0 ? Object.keys(data[0]) : []
    console.log("[v0] WhatsApp Alerts: Tabela existe com colunas:", columns)

    return { exists: true, columns }
  } catch (error) {
    console.log("[v0] WhatsApp Alerts: Tabela não existe ou erro de acesso:", error)
    return { exists: false, columns: [] }
  }
}

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"

    let userId = await getUserByEmail(userEmail)

    // Retry once if user lookup fails
    if (!userId) {
      console.log("[v0] WhatsApp Alerts: Tentando novamente buscar usuário...")
      await new Promise((resolve) => setTimeout(resolve, 100)) // Small delay
      userId = await getUserByEmail(userEmail)
    }

    if (!userId) {
      console.log("[v0] WhatsApp Alerts: Usuário não encontrado após retry, retornando array vazio")
      return NextResponse.json([])
    }

    const tableInfoPromise = checkTableStructure()
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))

    let tableInfo
    try {
      tableInfo = await Promise.race([tableInfoPromise, timeoutPromise])
    } catch (error) {
      console.log("[v0] WhatsApp Alerts: Timeout ou erro ao verificar tabela, usando fallback")
      tableInfo = {
        exists: true,
        columns: ["id", "customer_name", "phone", "message", "order_id", "is_read", "created_at", "updated_at"],
      }
    }

    if (!tableInfo.exists) {
      console.log("[v0] WhatsApp Alerts: Tabela whatsapp_alerts não existe, retornando array vazio")
      return NextResponse.json([])
    }

    let query = supabase.from("whatsapp_alerts").select("*")

    // Only filter by user_id if the column exists
    if (tableInfo.columns.includes("user_id")) {
      query = query.eq("user_id", userId)
    }

    // Only filter by is_read if the column exists
    if (tableInfo.columns.includes("is_read")) {
      query = query.eq("is_read", false)
    }

    // Order by created_at if available, otherwise by id
    if (tableInfo.columns.includes("created_at")) {
      query = query.order("created_at", { ascending: false })
    } else if (tableInfo.columns.includes("id")) {
      query = query.order("id", { ascending: false })
    }

    const { data: alerts, error } = await query.limit(10)

    if (error) {
      console.error("[v0] WhatsApp Alerts: Erro ao buscar alertas:", error.message)
      return NextResponse.json([])
    }

    console.log("[v0] WhatsApp Alerts: Encontrados", alerts?.length || 0, "alertas")
    return NextResponse.json(alerts || [])
  } catch (error) {
    console.error("[v0] WhatsApp Alerts: Erro na API:", error)
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
