// Script para testar conectividade com Supabase
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://easypanel.anafood.vip"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU3MTI3NjAwLCJleHAiOjE5MTQ4OTQwMDB9.pfZCgBgmThjNip3x5FXRxh3IIYiz49oBKFNjq1eRkmI"
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NTcxMjc2MDAsImV4cCI6MTkxNDg5NDAwMH0.o21U8KzWA-QoSQnoc7XCblbsz61v7FC7dv9heUOaPQE"

async function testSupabaseConnection() {
  console.log("[v0] Iniciando teste de conectividade Supabase...")
  console.log("[v0] URL:", supabaseUrl)

  try {
    // Teste com cliente anônimo
    console.log("[v0] Testando cliente anônimo...")
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)

    const { data: anonTest, error: anonError } = await anonClient.from("users").select("count").limit(1)

    if (anonError) {
      console.log("[v0] Erro cliente anônimo:", anonError.message)
    } else {
      console.log("[v0] Cliente anônimo: OK")
    }

    // Teste com service role
    console.log("[v0] Testando service role...")
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: serviceTest, error: serviceError } = await serviceClient.from("users").select("count").limit(1)

    if (serviceError) {
      console.log("[v0] Erro service role:", serviceError.message)
    } else {
      console.log("[v0] Service role: OK")
    }

    // Teste de tabelas principais
    console.log("[v0] Testando tabelas principais...")
    const tables = ["users", "companies", "orders", "products", "categories"]

    for (const table of tables) {
      try {
        const { data, error } = await serviceClient.from(table).select("*").limit(1)

        if (error) {
          console.log(`[v0] Tabela ${table}: ERRO -`, error.message)
        } else {
          console.log(`[v0] Tabela ${table}: OK (${data?.length || 0} registros encontrados)`)
        }
      } catch (err) {
        console.log(`[v0] Tabela ${table}: ERRO -`, err.message)
      }
    }

    // Teste de inserção
    console.log("[v0] Testando inserção de dados...")
    const { data: insertTest, error: insertError } = await serviceClient
      .from("audit_logs")
      .insert({
        table_name: "test",
        operation: "connection_test",
        old_data: null,
        new_data: { test: true },
        user_id: "system",
      })
      .select()

    if (insertError) {
      console.log("[v0] Erro na inserção:", insertError.message)
    } else {
      console.log("[v0] Inserção: OK")
    }

    console.log("[v0] Teste de conectividade concluído!")
  } catch (error) {
    console.log("[v0] Erro geral:", error.message)
  }
}

// Executar teste
testSupabaseConnection()
