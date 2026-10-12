import { getEventEndsAt } from "@/lib/db/queries";

// The IDE's clock polls this, so an organiser starting, extending or clearing
// the timer reaches every open tab without a reload.
export const dynamic = "force-dynamic";

export async function GET() {
  const endsAt = await getEventEndsAt();
  return Response.json({ endsAt: endsAt ? endsAt.toISOString() : null }, { headers: { "Cache-Control": "no-store" } });
}
