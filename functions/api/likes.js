const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

export async function onRequest({ request, env }) {
  // El nombre de la vinculación se conserva tal como aparece en el panel de Cloudflare.
  const db = env.DB;
  if (!db) return json({ error: "No se encontró la vinculación D1. Revisa el nombre de variable en Cloudflare." }, 500);

  if (request.method === "GET") {
    const url = new URL(request.url);
    const reflection = url.searchParams.get("reflection");
    const voter = url.searchParams.get("voter");
    if (!reflection || !voter) return json({ error: "Faltan parámetros." }, 400);
    const count = await db.prepare("SELECT COUNT(*) AS count FROM reflection_votes WHERE reflection_slug = ?").bind(reflection).first();
    const liked = await db.prepare("SELECT 1 AS liked FROM reflection_votes WHERE reflection_slug = ? AND voter_id = ?").bind(reflection, voter).first();
    return json({ count: count?.count ?? 0, liked: Boolean(liked) });
  }

  if (request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "JSON inválido." }, 400); }
    const { reflection, voter } = body || {};
    if (typeof reflection !== "string" || typeof voter !== "string" || !reflection || !voter || reflection.length > 100 || voter.length > 120) return json({ error: "Datos no válidos." }, 400);
    await db.prepare("INSERT OR IGNORE INTO reflection_votes (reflection_slug, voter_id) VALUES (?, ?)").bind(reflection, voter).run();
    const liked = await db.prepare("SELECT 1 AS liked FROM reflection_votes WHERE reflection_slug = ? AND voter_id = ?").bind(reflection, voter).first();
    const count = await db.prepare("SELECT COUNT(*) AS count FROM reflection_votes WHERE reflection_slug = ?").bind(reflection).first();
    return json({ count: count?.count ?? 0, liked: Boolean(liked) });
  }
  return new Response("Método no permitido", { status: 405, headers: { Allow: "GET, POST" } });
}
