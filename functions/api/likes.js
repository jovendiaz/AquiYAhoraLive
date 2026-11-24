const ALLOWED_REFLECTIONS = new Set(["el-mundo", "el-arte-de-detenernos"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  }
});

function validInput(reflection, voter) {
  return typeof reflection === "string"
    && ALLOWED_REFLECTIONS.has(reflection)
    && typeof voter === "string"
    && UUID_PATTERN.test(voter);
}

export async function onRequest({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: "Servicio temporalmente no disponible." }, 503);

  const url = new URL(request.url);

  if (request.method === "GET") {
    const reflection = url.searchParams.get("reflection");
    const voter = url.searchParams.get("voter");
    if (!validInput(reflection, voter)) return json({ error: "Solicitud no válida." }, 400);

    try {
      const count = await db.prepare(
        "SELECT COUNT(*) AS count FROM reflection_votes WHERE reflection_slug = ?"
      ).bind(reflection).first();
      const liked = await db.prepare(
        "SELECT 1 AS liked FROM reflection_votes WHERE reflection_slug = ? AND voter_id = ?"
      ).bind(reflection, voter).first();

      return json({ count: count?.count ?? 0, liked: Boolean(liked) });
    } catch {
      return json({ error: "No fue posible consultar el contador." }, 500);
    }
  }

  if (request.method === "POST") {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return json({ error: "Formato no válido." }, 415);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 1024) return json({ error: "Solicitud demasiado grande." }, 413);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Solicitud no válida." }, 400);
    }

    const { reflection, voter } = body || {};
    if (!validInput(reflection, voter)) return json({ error: "Solicitud no válida." }, 400);

    try {
      await db.prepare(
        "INSERT OR IGNORE INTO reflection_votes (reflection_slug, voter_id) VALUES (?, ?)"
      ).bind(reflection, voter).run();

      const liked = await db.prepare(
        "SELECT 1 AS liked FROM reflection_votes WHERE reflection_slug = ? AND voter_id = ?"
      ).bind(reflection, voter).first();
      const count = await db.prepare(
        "SELECT COUNT(*) AS count FROM reflection_votes WHERE reflection_slug = ?"
      ).bind(reflection).first();

      return json({ count: count?.count ?? 0, liked: Boolean(liked) });
    } catch {
      return json({ error: "No fue posible guardar tu participación." }, 500);
    }
  }

  return json({ error: "Método no permitido." }, 405);
}
