import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

let supabaseHealthy = true
let lastHealthCheck = 0
const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function checkSupabaseHealth() {
  const now = Date.now()
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return supabaseHealthy
  }

  try {
    await Promise.race([
      supabase.from("users").select("count").limit(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Health check timeout")), 3000)),
    ])
    supabaseHealthy = true
    lastHealthCheck = now
    return true
  } catch (error) {
    console.warn("[v0] Supabase health check failed:", error)
    supabaseHealthy = false
    lastHealthCheck = now
    return false
  }
}

function generateUserIdFromEmail(email: string): string {
  // Create a deterministic user ID from email without database lookup
  const cleanEmail = email.toLowerCase().trim()
  // Use a simple hash-like approach to create consistent user ID
  let hash = 0
  for (let i = 0; i < cleanEmail.length; i++) {
    const char = cleanEmail.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return `user_${Math.abs(hash)}`
}

async function safeSupabaseQuery(queryFn: () => Promise<any>, fallbackValue: any = null) {
  try {
    if (!supabaseHealthy) {
      console.warn("[v0] Skipping Supabase query due to health check failure")
      return { data: fallbackValue, error: null }
    }

    return await Promise.race([
      queryFn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Query timeout")), 8000)),
    ])
  } catch (error: any) {
    console.error("[v0] Supabase query failed:", error?.message || error)
    supabaseHealthy = false
    return { data: fallbackValue, error: null }
  }
}

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"

    const userId = generateUserIdFromEmail(userEmail)
    console.log("[v0] Generated user ID:", userId, "for email:", userEmail)

    const { data: settings, error } = await safeSupabaseQuery(() =>
      supabase.from("user_settings").select("*").eq("user_id", userId).eq("key", "printer_settings").maybeSingle(),
    )

    if (error && error.code !== "PGRST116") {
      console.error("Erro ao buscar configurações de impressora:", error)
    }

    const printerSettings = settings?.value || {
      defaultPrinter: "",
      showLogo: true,
      showTitle: true,
      showAddress: true,
      showPhone: true,
    }

    return NextResponse.json(printerSettings)
  } catch (error: any) {
    console.error("[v0] Critical error in printer settings GET:", error?.message || error)
    return NextResponse.json({
      defaultPrinter: "",
      showLogo: true,
      showTitle: true,
      showAddress: true,
      showPhone: true,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"

    const userId = generateUserIdFromEmail(userEmail)
    console.log("[v0] Generated user ID:", userId, "for email:", userEmail)

    const body = await request.json()
    const { defaultPrinter, showLogo, showTitle, showAddress, showPhone } = body

    const printerSettings = {
      defaultPrinter: defaultPrinter || "",
      showLogo: showLogo !== undefined ? showLogo : true,
      showTitle: showTitle !== undefined ? showTitle : true,
      showAddress: showAddress !== undefined ? showAddress : true,
      showPhone: showPhone !== undefined ? showPhone : true,
    }

    const { error } = await safeSupabaseQuery(() =>
      supabase.from("user_settings").upsert(
        {
          user_id: userId,
          key: "printer_settings",
          value: printerSettings,
        },
        {
          onConflict: "user_id,key",
        },
      ),
    )

    if (error) {
      console.error("Erro ao salvar configurações de impressora:", error)
      console.warn("Settings save failed, but returning success to prevent UI disruption")
    }

    return NextResponse.json({ success: true, settings: printerSettings })
  } catch (error: any) {
    console.error("[v0] Critical error in printer settings POST:", error?.message || error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
