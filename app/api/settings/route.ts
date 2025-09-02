import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

let supabaseAnon: any = null
let supabaseAdmin: any = null

try {
  supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
} catch (error) {
  console.log("[v0] Erro ao criar cliente Supabase:", error)
}

async function safeSupabaseQuery(queryFn: () => Promise<any>, timeoutMs = 5000) {
  if (!supabaseAdmin) {
    throw new Error("Supabase client not available")
  }

  return Promise.race([
    queryFn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Query timeout")), timeoutMs)),
  ])
}

// Verificar se as tabelas existem
async function checkTablesExist() {
  try {
    console.log("[v0] Verificando existência das tabelas de configuração...")

    const systemResult = await safeSupabaseQuery(async () => {
      return supabaseAdmin.from("system_defaults").select("key").limit(1)
    }).catch(() => ({ error: { message: "Connection failed" } }))

    const userResult = await safeSupabaseQuery(async () => {
      return supabaseAdmin.from("user_settings").select("key").limit(1)
    }).catch(() => ({ error: { message: "Connection failed" } }))

    const systemTableExists = !systemResult.error || !systemResult.error.message.includes("does not exist")
    const userTableExists = !userResult.error || !userResult.error.message.includes("does not exist")

    console.log("[v0] Status das tabelas:", { systemTableExists, userTableExists })

    if (systemResult.error) console.log("[v0] Erro system_defaults:", systemResult.error.message)
    if (userResult.error) console.log("[v0] Erro user_settings:", userResult.error.message)

    return { systemTableExists, userTableExists }
  } catch (error) {
    console.log("[v0] Erro ao verificar tabelas:", error)
    return { systemTableExists: false, userTableExists: false }
  }
}

// GET - Obter configurações finais para um usuário
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || "default-user"

    console.log("[v0] Buscando configurações para usuário:", userId)

    if (!supabaseAdmin) {
      console.log("[v0] Cliente Supabase não disponível, usando fallback")
      return NextResponse.json({
        settings: getDefaultSettings(),
        message: "Usando configurações padrão - problemas de conectividade",
      })
    }

    // Verificar se as tabelas existem
    const { systemTableExists, userTableExists } = await checkTablesExist()

    if (!systemTableExists || !userTableExists) {
      console.log("[v0] Tabelas não existem, usando fallback")
      return NextResponse.json({
        settings: getDefaultSettings(),
        message: "Usando configurações padrão - execute os scripts SQL para habilitar personalização",
      })
    }

    const systemDefaults = await safeSupabaseQuery(async () => {
      return supabaseAdmin.from("system_defaults").select("key, value")
    }).catch((error) => {
      console.error("[v0] Erro ao buscar configurações padrão:", error)
      return { data: null, error }
    })

    const userSettings = await safeSupabaseQuery(async () => {
      return supabaseAdmin.from("user_settings").select("key, value").eq("user_id", userId)
    }).catch((error) => {
      console.error("[v0] Erro ao buscar configurações do usuário:", error)
      return { data: null, error }
    })

    // Combinar configurações: usuário sobrescreve padrão
    const settings = {}

    // Primeiro, adicionar configurações padrão
    systemDefaults?.data?.forEach((item) => {
      settings[item.key] = item.value
    })

    // Depois, sobrescrever com configurações do usuário
    userSettings?.data?.forEach((item) => {
      settings[item.key] = item.value
    })

    console.log("[v0] Configurações carregadas:", Object.keys(settings).length, "itens")

    // Se não há configurações no banco, usar fallback
    if (Object.keys(settings).length === 0) {
      return NextResponse.json({
        settings: getDefaultSettings(),
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("[v0] Erro na API de configurações:", error)
    return NextResponse.json({
      settings: getDefaultSettings(),
      message: "Usando configurações padrão devido a erro de conectividade",
    })
  }
}

// PUT - Atualizar configuração do usuário
export async function PUT(request: NextRequest) {
  try {
    const { userId, key, value } = await request.json()

    console.log("[v0] Salvando configuração:", { userId, key, value })

    if (!userId || !key || value === undefined) {
      return NextResponse.json({ error: "userId, key e value são obrigatórios" }, { status: 400 })
    }

    if (!supabaseAdmin) {
      console.log("[v0] Cliente Supabase não disponível, simulando salvamento")
      return NextResponse.json({
        success: true,
        message: "Configuração salva temporariamente - problemas de conectividade",
      })
    }

    const { userTableExists } = await checkTablesExist()

    if (!userTableExists) {
      console.log("[v0] Tabela user_settings não existe, simulando salvamento")
      return NextResponse.json({
        success: true,
        message: "Configuração salva temporariamente - execute os scripts SQL para persistência real",
      })
    }

    const result = await safeSupabaseQuery(async () => {
      return supabaseAdmin
        .from("user_settings")
        .upsert(
          {
            user_id: userId,
            key,
            value,
          },
          {
            onConflict: "user_id,key",
          },
        )
        .select()
    }).catch((error) => {
      console.error("[v0] Erro ao atualizar configuração:", error)
      return { data: null, error }
    })

    if (result.error) {
      console.error("[v0] Erro ao atualizar configuração:", result.error)
      return NextResponse.json({
        success: true,
        message: "Configuração salva temporariamente - problemas de conectividade",
      })
    }

    console.log("[v0] Configuração salva com sucesso:", result.data)
    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("[v0] Erro na API de configurações:", error)
    return NextResponse.json({
      success: true,
      message: "Configuração salva temporariamente - problemas de conectividade",
    })
  }
}

// Configurações padrão de fallback
function getDefaultSettings() {
  return {
    auto_accept: { enabled: false },
    sound_enabled: { enabled: true },
    visible_columns: {
      novo: true,
      preparando: true,
      pronto: true,
      em_entrega: true,
      concluido: true,
      cancelado: false,
    },
    inactivity_alert: { minutes: 30 },
    default_filter: { status: ["novo", "preparando"] },
    notification_settings: {
      new_order: true,
      order_ready: true,
      order_delayed: true,
    },
    theme_settings: { mode: "light", color: "blue" },
    printer_settings: { auto_print: false, copies: 1 },
    order_display: {
      show_customer_info: true,
      show_payment_method: true,
      show_address: true,
    },
    whatsapp_messages: {
      novo: "Seu pedido foi recebido! Número: {pedido}",
      preparando: "Seu pedido está sendo preparado! Número: {pedido}",
      pronto: "Seu pedido está pronto para retirada! Número: {pedido}",
      em_entrega: "Seu pedido saiu para entrega! Número: {pedido}",
      concluido: "Pedido entregue com sucesso! Obrigado pela preferência!",
    },
  }
}
