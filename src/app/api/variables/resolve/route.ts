import { NextResponse } from "next/server";
import { getVariableServer } from "@/lib/variables-action";

type VariableResolveRequest = {
  name?: string;
};

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const body = rawBody.trim().length > 0 ? (JSON.parse(rawBody) as VariableResolveRequest) : {};
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (name.length === 0) {
      return NextResponse.json({ value: null });
    }

    const value = await getVariableServer<unknown>(name);
    return NextResponse.json({ value: value ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve variable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}