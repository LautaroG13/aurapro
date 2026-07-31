import { NextResponse } from "next/server";

// Usado por render.yaml (healthCheckPath) para saber si el contenedor
// del frontend está sirviendo -- no depende del backend, solo confirma
// que el proceso de Next.js responde.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
