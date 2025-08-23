import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function PUT(request: NextRequest) {
  try {
    const userEmail = request.headers.get("x-user-email")
    if (!userEmail) {
      return NextResponse.json({ error: "User email required" }, { status: 401 })
    }

    const { subdomain, customDomain } = await request.json()

    // Get user and company
    const { data: user } = await supabase.from("users").select("id").eq("email", userEmail).single()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { data: company } = await supabase
      .from("companies")
      .select("id, subdomain, custom_domain")
      .eq("user_id", user.id)
      .single()

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const updateData: any = {}

    // Update subdomain if provided
    if (subdomain && subdomain !== company.subdomain) {
      // Check availability
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("subdomain", subdomain)
        .neq("id", company.id)
        .single()

      if (existing) {
        return NextResponse.json({ error: "Subdomain already taken" }, { status: 400 })
      }

      updateData.subdomain = subdomain
      updateData.slug = subdomain
    }

    // Update custom domain if provided
    if (customDomain !== undefined) {
      if (customDomain && customDomain !== company.custom_domain) {
        // Check if custom domain is already taken
        const { data: existing } = await supabase
          .from("companies")
          .select("id")
          .eq("custom_domain", customDomain)
          .neq("id", company.id)
          .single()

        if (existing) {
          return NextResponse.json({ error: "Custom domain already taken" }, { status: 400 })
        }

        updateData.custom_domain = customDomain
        updateData.domain_verified = false
        updateData.domain_verification_token = crypto.randomUUID()
      } else if (customDomain === "") {
        updateData.custom_domain = null
        updateData.domain_verified = false
        updateData.domain_verification_token = null
      }
    }

    // Update company
    const { data: updatedCompany, error } = await supabase
      .from("companies")
      .update(updateData)
      .eq("id", company.id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Company subdomain update error:", error)
      return NextResponse.json({ error: "Failed to update company" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      company: updatedCompany,
    })
  } catch (error) {
    console.error("[v0] Company subdomain update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
