export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "",
};

export const APP_CONFIG = {
  appName: "Deal Exchange Platform",
  whatsappPrefix: process.env.NEXT_PUBLIC_WHATSAPP_PREFIX || "https://wa.me/",
};
