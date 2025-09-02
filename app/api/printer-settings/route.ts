import { type NextRequest, NextResponse } from "next/server"

let supabase: any = null
let supabaseInitialized = false

async function initializeSupabase() {
  if (supabaseInitialized) return supabase

  try {
    const { createClient } = await import("@supabase/supabase-js")
    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    supabaseInitialized = true
    console.log("[v0] Supabase client initialized successfully")
    return supabase
  } catch (error) {
    console.error("[v0] Failed to initialize Supabase client:", error)
    supabaseInitialized = false
    return null
  }
}

let supabaseHealthy = true
let lastHealthCheck = 0
const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds

async function checkSupabaseHealth() {
  const now = Date.now()
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return supabaseHealthy
  }

  try {
    const client = await initializeSupabase()
    if (!client) {
      supabaseHealthy = false
      return false
    }

    await Promise.race([
      client.from("users").select("count").limit(1),
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

    const client = await initializeSupabase()
    if (!client) {
      console.warn("[v0] Supabase client not available, using fallback")
      return { data: fallbackValue, error: null }
    }

    const result = await Promise.race([
      queryFn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Query timeout")), 8000)),
    ])

    return result
  } catch (error: any) {
    console.error("[v0] Supabase query failed:", error?.message || error)
    supabaseHealthy = false
    return { data: fallbackValue, error: null }
  }
}

const DEFAULT_PRINTER_SETTINGS = {
  defaultPrinter: "",
  showLogo: true,
  showTitle: true,
  showAddress: true,
  showPhone: true,
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Printer settings GET request started")

    const userEmail = request.headers.get("x-user-email") || "tarcisiorp16@gmail.com"
    const userId = generateUserIdFromEmail(userEmail)
    console.log("[v0] Generated user ID:", userId, "for email:", userEmail)

    let printerSettings = DEFAULT_PRINTER_SETTINGS

    try {
      const client = await initializeSupabase()
      if (client && supabaseHealthy) {
        const { data: settings, error } = await safeSupabaseQuery(() =>
          client.from("user_settings").select("*").eq("user_id", userId).eq("key", "printer_settings").maybeSingle(),
        )

        if (settings?.value) {
          printerSettings = { ...DEFAULT_PRINTER_SETTINGS, ...settings.value }
          console.log("[v0] Loaded printer settings from database")
        } else {
          console.log("[v0] No printer settings found, using defaults")
        }
      } else {
        console.log("[v0] Supabase unavailable, using default settings")
      }
    } catch (dbError) {
      console.error("[v0] Database operation failed, using defaults:", dbError)
    }

    console.log("[v0] Returning printer settings:", printerSettings)
    return NextResponse.json(printerSettings)
  } catch (error: any) {
    console.error("[v0] Critical error in printer settings GET:", error?.message || error)
    return NextResponse.json(DEFAULT_PRINTER_SETTINGS)
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Printer settings POST request started")

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

    try {
      const client = await initializeSupabase()
      if (client && supabaseHealthy) {
        const { error } = await safeSupabaseQuery(() =>
          client.from("user_settings").upsert(
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
        } else {
          console.log("[v0] Printer settings saved successfully")
        }
      } else {
        console.warn("[v0] Supabase unavailable, settings not persisted")
      }
    } catch (saveError) {
      console.error("[v0] Save operation failed:", saveError)
    }

    console.log("[v0] Returning success response with settings:", printerSettings)
    return NextResponse.json({ success: true, settings: printerSettings })
  } catch (error: any) {
    console.error("[v0] Critical error in printer settings POST:", error?.message || error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
