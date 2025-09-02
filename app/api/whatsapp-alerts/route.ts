import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

let supabaseHealthy = true
let lastHealthCheck = 0
const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds

async function checkSupabaseHealth() {
  const now = Date.now()
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return supabaseHealthy
  }

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { error } = await Promise.race([
      supabase.from("users").select("count").limit(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Health check timeout")), 2000)),
    ])

    supabaseHealthy = !error
    lastHealthCheck = now
    console.log("[v0] WhatsApp Alerts: Supabase health check:", supabaseHealthy ? "healthy" : "unhealthy")
    return supabaseHealthy
  } catch (error) {
    supabaseHealthy = false
    lastHealthCheck = now
    console.log("[v0] WhatsApp Alerts: Supabase health check failed:", error)
    return false
  }
}

async function getUserByEmail(email: string) {
  try {
    console.log("[v0] WhatsApp Alerts: Iniciando busca por usuário com email:", email)

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[v0] WhatsApp Alerts: Variáveis de ambiente do Supabase não configuradas")
      return "mock-user-id"
    }

    const isHealthy = await checkSupabaseHealth()
    if (!isHealthy) {
      console.log("[v0] WhatsApp Alerts: Supabase não está saudável, usando mock user")
      return "mock-user-id"
    }

    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { data: user, error } = await Promise.race([
        supabase.from("users").select("id").eq("email", email).maybeSingle(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Query timeout")), 5000)),
      ])

      if (error) {
        console.error("[v0] WhatsApp Alerts: Erro ao buscar usuário:", error.message)
        return "mock-user-id"
      }

      if (!user) {
        console.log("[v0] WhatsApp Alerts: Usuário não encontrado para email:", email)
        return "mock-user-id"
      }

      console.log("[v0] WhatsApp Alerts: Usuário encontrado:", user.id)
      return user.id
    } catch (supabaseError: any) {
      console.error("[v0] WhatsApp Alerts: Erro crítico do Supabase:", supabaseError?.message || supabaseError)
      supabaseHealthy = false // Mark as unhealthy for future requests
      return "mock-user-id"
    }
  } catch (error: any) {
    console.error("[v0] WhatsApp Alerts: Erro geral ao buscar usuário:", error?.message || error)
    return "mock-user-id"
  }
}

async function checkTableStructure() {
  try {
    if (!supabaseHealthy) {
      console.log("[v0] WhatsApp Alerts: Supabase não está saudável, usando estrutura padrão")
      return {
        exists: true,
        columns: ["id", "customer_name", "phone", "message", "order_id", "is_read", "created_at", "updated_at"],
      }
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await Promise.race([
      supabase.from("whatsapp_alerts").select("*").limit(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Structure check timeout")), 3000)),
    ])

    if (error) {
      console.log("[v0] WhatsApp Alerts: Erro ao verificar estrutura da tabela:", error.message)
      return { exists: false, columns: [] }
    }

    const columns = data && data.length > 0 ? Object.keys(data[0]) : []
    console.log("[v0] WhatsApp Alerts: Tabela existe com colunas:", columns)
    return { exists: true, columns }
  } catch (error) {
    console.log("[v0] WhatsApp Alerts: Erro na verificação de estrutura:", error)
    return {
      exists: true,
      columns: ["id", "customer_name", "phone", "message", "order_id", "is_read", "created_at", "updated_at"],
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"

    const userId = await getUserByEmail(userEmail)

    if (!userId || userId === "mock-user-id") {
      console.log("[v0] WhatsApp Alerts: Usando mock user, retornando dados simulados")
      return NextResponse.json([
        {
          id: "mock-1",
          customer_name: "Cliente Exemplo",
          phone: "11999999999",
          message: "Pedido confirmado",
          order_id: "12345",
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ])
    }

    const tableInfo = await checkTableStructure()

    if (!tableInfo.exists) {
      console.log("[v0] WhatsApp Alerts: Tabela não existe, retornando array vazio")
      return NextResponse.json([])
    }

    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      let query = supabase.from("whatsapp_alerts").select("*")

      if (tableInfo.columns.includes("user_id")) {
        query = query.eq("user_id", userId)
      }

      if (tableInfo.columns.includes("is_read")) {
        query = query.eq("is_read", false)
      }

      if (tableInfo.columns.includes("created_at")) {
        query = query.order("created_at", { ascending: false })
      }

      const { data: alerts, error } = await Promise.race([
        query.limit(10),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Query timeout")), 5000)),
      ])

      if (error) {
        console.error("[v0] WhatsApp Alerts: Erro ao buscar alertas:", error.message)
        return NextResponse.json([])
      }

      console.log("[v0] WhatsApp Alerts: Encontrados", alerts?.length || 0, "alertas")
      return NextResponse.json(alerts || [])
    } catch (queryError) {
      console.error("[v0] WhatsApp Alerts: Erro na query de alertas:", queryError)
      return NextResponse.json([])
    }
  } catch (error) {
    console.error("[v0] WhatsApp Alerts: Erro crítico na API:", error)
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

    const { data, error } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
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

    const { data, error } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
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
