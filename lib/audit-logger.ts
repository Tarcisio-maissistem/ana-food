import { createClient } from "@supabase/supabase-js"

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("[v0] Missing Supabase environment variables:", {
    url: !!supabaseUrl,
    key: !!supabaseKey,
  })
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export interface AuditLogData {
  userId: string
  companyId: string
  tableName: string
  recordId?: string
  actionType: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "ONBOARDING_START" | "ONBOARDING_COMPLETE"
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  requestUrl?: string
}

export class AuditLogger {
  static async log(data: AuditLogData) {
    try {
      if (!supabase) {
        console.warn("[v0] Supabase client not available, skipping audit log")
        return
      }

      console.log("[v0] Audit Log:", data.actionType, data.tableName, data.recordId)

      let recordIdValue = data.recordId

      // Check if recordId is a UUID format but column expects bigint
      if (data.recordId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.recordId)) {
        // If it's a UUID format, try to insert it as-is first
        // If that fails, we'll handle it in the catch block
        recordIdValue = data.recordId
      }

      const auditData = {
        user_id: data.userId,
        company_id: data.companyId,
        table_name: data.tableName,
        record_id: recordIdValue,
        action_type: data.actionType,
        old_values: data.oldValues,
        new_values: data.newValues,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        session_id: data.sessionId,
        request_url: data.requestUrl,
        created_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("audit_logs").insert(auditData)

      if (error) {
        if (error.message?.includes("invalid input syntax for type bigint") && data.recordId) {
          console.warn("[v0] Audit Log: record_id column expects bigint, retrying without record_id")
          const { error: retryError } = await supabase.from("audit_logs").insert({
            ...auditData,
            record_id: null, // Skip record_id to avoid type mismatch
          })

          if (retryError) {
            console.error("[v0] Audit Log Retry Error:", retryError)
          }
        } else {
          console.error("[v0] Audit Log Error:", error)
        }
        // Don't throw error to avoid breaking main operations
      }
    } catch (error) {
      console.error("[v0] Audit Log Exception:", error)
      // Fail silently to not impact main functionality
    }
  }

  static async logUserAction(
    userId: string,
    companyId: string,
    action: AuditLogData["actionType"],
    tableName: string,
    recordId?: string,
    oldValues?: any,
    newValues?: any,
    request?: Request,
  ) {
    const ipAddress = request?.headers.get("x-forwarded-for") || request?.headers.get("x-real-ip") || "unknown"

    const userAgent = request?.headers.get("user-agent") || "unknown"
    const requestUrl = request?.url || "unknown"

    await this.log({
      userId,
      companyId,
      tableName,
      recordId,
      actionType: action,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      requestUrl,
    })
  }
}
