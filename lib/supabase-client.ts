import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://easypanel.anafood.vip"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU3MTI3NjAwLCJleHAiOjE5MTQ4OTQwMDB9.pfZCgBgmThjNip3x5FXRxh3IIYiz49oBKFNjq1eRkmI"
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NTcxMjc2MDAsImV4cCI6MTkxNDg5NDAwMH0.o21U8KzWA-QoSQnoc7XCblbsz61v7FC7dv9heUOaPQE"

// Cliente para operações do lado do cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Cliente para operações administrativas (server-side)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Função para testar conectividade
export async function testConnection() {
  try {
    console.log("[v0] Testando conexão Supabase...")

    const { data, error } = await supabaseAdmin.from("users").select("count").limit(1)

    if (error) {
      console.log("[v0] Erro na conexão:", error.message)
      return false
    }

    console.log("[v0] Conexão Supabase: OK")
    return true
  } catch (err) {
    console.log("[v0] Erro na conexão:", err.message)
    return false
  }
}
