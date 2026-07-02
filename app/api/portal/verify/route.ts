import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/sessionStore";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 400 }
      );
    }

    const session = sessionStore.findByToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    sessionStore.updateStatus(session.id, "VERIFYING");

    const fanCountUrl = new URL("/api/graph/fan-count", request.url);
    let fanRes: Response;
    try {
      fanRes = await fetch(fanCountUrl);
    } catch (fetchErr: any) {
      console.error("[portal/verify] Fan-count network error:", fetchErr.message);
      sessionStore.updateStatus(session.id, "FAILED", {
        failureReason: "Fan-count API unreachable",
      });
      return NextResponse.json(
        { success: false, error: "Fan-count API unreachable" },
        { status: 502 }
      );
    }

    const fanData = await fanRes.json();

    if (!fanData.success) {
      console.error("[portal/verify] Fan-count API error:", fanData.error);
      sessionStore.updateStatus(session.id, "FAILED", {
        failureReason: fanData.error || "Fan-count check failed",
      });
      return NextResponse.json(
        { success: false, error: fanData.error || "Verification failed" },
        { status: 502 }
      );
    }

    const currentCount = fanData.count;
    const threshold = session.initialFollowerCount;

    console.log("[portal/verify] Comparing follower count", {
      currentCount,
      initialCount: session.initialFollowerCount,
      threshold,
      passes: currentCount > threshold,
    });

    if (currentCount <= threshold) {
      return NextResponse.json({
        success: false,
        error: "Follower count not increased yet",
      });
    }

    sessionStore.updateStatus(session.id, "VERIFIED");

    try {
      const omadaUrl = new URL("/api/omada/authorize", request.url);
      const omadaRes = await fetch(omadaUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.id }),
      });
      console.log("[portal/verify] Omada authorize response:", omadaRes.status);
    } catch (omadaErr: any) {
      console.error("[portal/verify] Omada bridge call failed:", omadaErr.message);
    }

    return NextResponse.json({
      success: true,
      status: "AUTHORIZING",
    });
  } catch (error: any) {
    console.error("[portal/verify] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
