import { NextResponse } from "next/server";

type EnvironmentName = "production" | "preview" | "development";

export const dynamic = "force-dynamic";

const prefixSecret = (value?: string) => (value ? value.slice(0, 50) : "");

const getEnvironment = (): EnvironmentName => {
  const vercelEnv = process.env.VERCEL_ENV;

  if (vercelEnv === "production" || vercelEnv === "preview" || vercelEnv === "development") {
    return vercelEnv;
  }

  return process.env.NODE_ENV === "production" ? "production" : "development";
};

const getSupabaseProjectRef = (supabaseUrl: string) => {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    return hostname.endsWith(".supabase.co") ? hostname.split(".")[0] || "" : "";
  } catch {
    return "";
  }
};

// REMOVE BEFORE PRODUCTION RELEASE
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const debugInfo = {
    environment: getEnvironment(),
    supabaseUrl,
    supabaseProjectRef: getSupabaseProjectRef(supabaseUrl),
    anonKeyPrefix: prefixSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKeyPrefix: prefixSecret(process.env.SUPABASE_SERVICE_ROLE_KEY),
    vercelEnv: process.env.VERCEL_ENV || "",
    vercelBranch: process.env.VERCEL_GIT_COMMIT_REF || "",
    nodeEnv: process.env.NODE_ENV || "",
  };

  console.log("Environment Debug", debugInfo);

  return NextResponse.json(debugInfo, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
