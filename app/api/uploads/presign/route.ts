import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createSignedUpload,
  isAllowedImageType,
  MAX_UPLOAD_BYTES,
} from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  kind: z.enum(["brand-logo", "product-image"]),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  scopeId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!isAllowedImageType(parsed.data.contentType)) {
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 415 },
    );
  }
  if (parsed.data.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_UPLOAD_BYTES} bytes)` },
      { status: 413 },
    );
  }

  const wantedId = session.activeWorkspaceId;
  const membership = wantedId
    ? await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: { userId: session.user.id, workspaceId: wantedId },
        },
        select: { workspaceId: true },
      })
    : await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        select: { workspaceId: true },
      });

  if (!membership) {
    return NextResponse.json({ error: "No workspace" }, { status: 403 });
  }
  const workspaceId = membership.workspaceId;

  try {
    const result = await createSignedUpload({
      workspaceId,
      kind: parsed.data.kind,
      contentType: parsed.data.contentType,
      scopeId: parsed.data.scopeId,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("presign failed", err);
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 500 },
    );
  }
}
