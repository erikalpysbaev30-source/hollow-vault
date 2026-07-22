import { NextResponse } from "next/server";

import { adaptiveRoomsEnabled, adaptiveRoomsModel } from "@/lib/server/openai/client";

export const runtime = "nodejs";
export const maxDuration = 5;
export const dynamic = "force-dynamic";

export function GET() {
  const configured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const enabled = adaptiveRoomsEnabled();

  return NextResponse.json({
    status: "ok",
    service: "hollow-vault",
    adaptiveRooms: {
      enabled,
      configured,
      model: adaptiveRoomsModel(),
    },
    adaptiveReinforcements: {
      enabled,
      configured,
    },
  });
}
