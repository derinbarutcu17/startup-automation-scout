import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getEnv } from "@/src/infrastructure/config/env";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.compose";

export async function GET() {
  const env = getEnv();
  if (env.GMAIL_PROVIDER !== "google") return NextResponse.json({ error: "Set GMAIL_PROVIDER=google before connecting Gmail." }, { status: 409 });
  if (env.APP_ENV === "production") return NextResponse.json({ error: "Gmail OAuth requires an authenticated owner boundary before production use." }, { status: 403 });
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET) return NextResponse.json({ error: "GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET are required." }, { status: 503 });
  const redirectUri = env.GOOGLE_REDIRECT_URI ?? `${env.APP_BASE_URL.replace(/\/$/, "")}/api/gmail/callback`;
  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("scout_gmail_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: redirectUri.startsWith("https://"),
    path: "/api/gmail",
    maxAge: 10 * 60,
  });
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", env.GMAIL_CLIENT_ID);
  authorization.searchParams.set("redirect_uri", redirectUri);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", GMAIL_SCOPE);
  authorization.searchParams.set("access_type", "offline");
  authorization.searchParams.set("prompt", "consent");
  authorization.searchParams.set("state", state);
  return NextResponse.redirect(authorization);
}
