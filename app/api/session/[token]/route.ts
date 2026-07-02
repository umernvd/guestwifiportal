import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/sessionStore";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const session = sessionStore.findByToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: session.status,
        expiresAt: session.expiresAt,
        failureReason: session.failureReason || null,
      },
    });
  } catch (error) {
    console.error("[session/status] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
