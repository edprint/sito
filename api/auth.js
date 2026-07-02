// OAuth GitHub per Sveltia/Decap CMS — passo 1: reindirizza a GitHub.
// Serverless function su Vercel. Richiede le env: GITHUB_CLIENT_ID.
import crypto from "node:crypto";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send("Configurazione mancante: GITHUB_CLIENT_ID");
    return;
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const redirectUri = `${proto}://${host}/api/callback`;

  // state anti-CSRF salvato in cookie e verificato nel callback
  const state = crypto.randomBytes(16).toString("hex");
  res.setHeader(
    "Set-Cookie",
    `oauth_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo,user",
    state,
    allow_signup: "false",
  });

  res.writeHead(302, { Location: `${AUTHORIZE_URL}?${params.toString()}` });
  res.end();
}
