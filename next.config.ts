import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "placeholder-key",
  },
  experimental: {
    // Backstop for any Server Action still carrying a file body.
    serverActions: { bodySizeLimit: "4mb" },
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
