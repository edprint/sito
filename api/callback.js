// OAuth GitHub per Sveltia/Decap CMS — passo 2: scambia il code con un token
// e lo consegna al pannello via postMessage (handshake Netlify/Decap).
// Richiede le env: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET.
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const PROVIDER = "github";

function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(v.join("="));
  }
  return out;
}

function page(status, content) {
  const payload = JSON.stringify(content).replace(/</g, "\\u003c");
  return `<!doctype html><html><body><script>
(function () {
  function receiveMessage(e) {
    window.opener.postMessage(
      'authorization:${PROVIDER}:${status}:${payload}',
      e.origin
    );
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:${PROVIDER}', '*');
})();
</script></body></html>`;
}

export default async function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const url = new URL(req.url, `https://${req.headers.host}`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookies(req.headers.cookie);

  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!code || !state || state !== cookies.oauth_state) {
    res.status(400).send(page("error", { error: "State non valido" }));
    return;
  }

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await tokenRes.json();

    if (data.access_token) {
      res.status(200).send(page("success", { token: data.access_token, provider: PROVIDER }));
    } else {
      res
        .status(401)
        .send(page("error", { error: data.error_description || "Token non ricevuto" }));
    }
  } catch (err) {
    res.status(500).send(page("error", { error: String(err) }));
  }
}
