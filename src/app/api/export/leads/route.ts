import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, requireAdmin } from "@/lib/deal-server";

function escapeCsv(value: string | null | undefined) {
  return `"${(value || "").replace(/"/g, "\"\"")}"`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const { data: leads } = await supabase
    .from("leads")
    .select("id, listing_id, requirement_id, from_user_id, to_user_id, lead_type, lead_status, contact_name, contact_email, contact_phone, preferred_channel, created_at")
    .order("created_at", { ascending: false });

  const rows = [
    ["id", "listing_id", "requirement_id", "from_user_id", "to_user_id", "lead_type", "lead_status", "contact_name", "contact_email", "contact_phone", "preferred_channel", "created_at"].join(","),
    ...(leads || []).map((lead) =>
      [
        lead.id,
        lead.listing_id || "",
        lead.requirement_id || "",
        lead.from_user_id,
        lead.to_user_id,
        lead.lead_type,
        lead.lead_status,
        escapeCsv(lead.contact_name),
        escapeCsv(lead.contact_email),
        escapeCsv(lead.contact_phone),
        lead.preferred_channel,
        lead.created_at,
      ].join(",")
    ),
  ].join("\n");

  return new NextResponse(rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=deal-exchange-leads.csv",
    },
  });
}

