import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getEnv } from "@/src/infrastructure/config/env";
import { saveGmailConnection } from "@/src/infrastructure/db/repositories-prospect";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.compose";

export async function GET(request: Request) {
  const env = getEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("scout_gmail_oauth_state")?.value;
  cookieStore.delete("scout_gmail_oauth_state");
  if (oauthError) return NextResponse.json({ error: "Gmail authorization was declined." }, { status: 400 });
  if (!state || !expectedState || state !== expectedState) return NextResponse.json({ error: "Invalid Gmail OAuth state." }, { status: 400 });
  if (!code) return NextResponse.json({ error: "Gmail OAuth code missing." }, { status: 400 });
  if (env.APP_ENV === "production") return NextResponse.json({ error: "Gmail OAuth requires an authenticated owner boundary before production use." }, { status: 403 });
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET) return NextResponse.json({ error: "Gmail OAuth is not configured." }, { status: 503 });

  const redirectUri = env.GOOGLE_REDIRECT_URI ?? `${env.APP_BASE_URL.replace(/\/$/, "")}/api/gmail/callback`;
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GMAIL_CLIENT_ID,
        client_secret: env.GMAIL_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(env.GMAIL_TIMEOUT_MS),
    });
    if (!response.ok) return NextResponse.json({ error: "Gmail token exchange failed." }, { status: 502 });
    const tokens = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
    if (!tokens.access_token) return NextResponse.json({ error: "Gmail token exchange returned no access token." }, { status: 502 });
    const scope = tokens.scope ?? GMAIL_SCOPE;
    if (!scope.split(/\s+/).includes(GMAIL_SCOPE)) return NextResponse.json({ error: "Gmail compose permission was not granted." }, { status: 502 });
    await saveGmailConnection({
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenExpiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
      scope,
    });
    return NextResponse.redirect(new URL("/settings?gmail=connected", env.APP_BASE_URL));
  } catch {
    return NextResponse.json({ error: "Gmail token exchange failed." }, { status: 502 });
  }
}
