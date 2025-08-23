import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Reserved subdomains that cannot be used
const RESERVED_SUBDOMAINS = [
  "admin",
  "api",
  "www",
  "app",
  "mail",
  "ftp",
  "blog",
  "shop",
  "store",
  "support",
  "help",
  "docs",
  "dev",
  "test",
  "staging",
  "cdn",
  "assets",
  "static",
  "media",
  "images",
  "files",
  "dashboard",
  "panel",
  "control",
  "manage",
  "system",
  "root",
  "server",
  "host",
  "domain",
  "subdomain",
]

function normalizeSubdomain(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
}

function generateAlternatives(subdomain: string): string[] {
  const alternatives = []

  // Add numbers
  for (let i = 1; i <= 5; i++) {
    alternatives.push(`${subdomain}${i}`)
    alternatives.push(`${subdomain}-${i}`)
  }

  // Add common suffixes
  const suffixes = ["delivery", "food", "menu", "restaurant", "cafe"]
  suffixes.forEach((suffix) => {
    alternatives.push(`${subdomain}-${suffix}`)
  })

  return alternatives
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const value = searchParams.get("value")

    if (!value) {
      return NextResponse.json({ error: "Value parameter is required" }, { status: 400 })
    }

    const normalizedSubdomain = normalizeSubdomain(value)

    // Check if it's a reserved subdomain
    if (RESERVED_SUBDOMAINS.includes(normalizedSubdomain)) {
      const alternatives = generateAlternatives(normalizedSubdomain)
      return NextResponse.json({
        available: false,
        normalized: normalizedSubdomain,
        reason: "reserved",
        suggestions: alternatives.slice(0, 3),
      })
    }

    // Check if subdomain already exists
    const { data: existing, error } = await supabase
      .from("companies")
      .select("id")
      .eq("subdomain", normalizedSubdomain)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("[v0] Subdomain availability check error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (existing) {
      const alternatives = generateAlternatives(normalizedSubdomain)

      // Check which alternatives are available
      const availableAlternatives = []
      for (const alt of alternatives) {
        const { data } = await supabase.from("companies").select("id").eq("subdomain", alt).single()

        if (!data && !RESERVED_SUBDOMAINS.includes(alt)) {
          availableAlternatives.push(alt)
        }

        if (availableAlternatives.length >= 3) break
      }

      return NextResponse.json({
        available: false,
        normalized: normalizedSubdomain,
        reason: "taken",
        suggestions: availableAlternatives,
      })
    }

    return NextResponse.json({
      available: true,
      normalized: normalizedSubdomain,
    })
  } catch (error) {
    console.error("[v0] Subdomain availability error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
