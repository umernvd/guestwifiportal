import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/sessionStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { clientMac, apMac, ssid, site, redirectUrl } = body;

    if (!clientMac || !apMac || !ssid) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[portal/init] Dev mode: missing params, using fallback values");
        clientMac = clientMac || "AA:BB:CC:DD:EE:FF";
        apMac = apMac || "11:22:33:44:55:66";
        ssid = ssid || "TestWiFi";
        site = site || "Default";
        redirectUrl = redirectUrl || "https://google.com";
      } else {
        return NextResponse.json(
          { success: false, error: "Missing required fields: clientMac, apMac, ssid" },
          { status: 400 }
        );
      }
    }

    const session = sessionStore.createSession({
      clientMac,
      apMac,
      ssid,
      site: site || "",
      redirectUrl: redirectUrl || "/",
    });

    try {
      const fanCountUrl = new URL("/api/graph/fan-count", request.url);
      const fanRes = await fetch(fanCountUrl);
      const fanData = await fanRes.json();
      if (fanData.success) {
        sessionStore.updateStatus(session.id, session.status, {
          initialFollowerCount: fanData.count,
        });
        console.log(`[portal/init] Captured initial follower count: ${fanData.count}`);
      }
    } catch (err: any) {
      console.warn(`[portal/init] Could not fetch initial follower count: ${err.message}`);
    }

    console.log(`[portal/init] Session created: ${session.id}`);

    return NextResponse.json({
      success: true,
      data: {
        token: session.id,
        expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
        redirectUrl: session.redirectUrl,
      },
    });
  } catch (error) {
    console.error("[portal/init] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
