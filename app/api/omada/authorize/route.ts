import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/sessionStore";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      console.warn("[omada/authorize] Missing token in request body");
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 400 }
      );
    }

    console.log("[omada/authorize] Received authorize request", { token });

    const session = sessionStore.findByToken(token);

    if (!session) {
      console.warn("[omada/authorize] Session not found", { token });
      return NextResponse.json(
        { success: false, error: "Invalid or unverified session" },
        { status: 400 }
      );
    }

    if (session.status !== "VERIFIED") {
      console.warn("[omada/authorize] Session not in VERIFIED state", {
        token,
        status: session.status,
      });
      return NextResponse.json(
        { success: false, error: "Invalid or unverified session" },
        { status: 400 }
      );
    }

    sessionStore.updateStatus(session.id, "AUTHORIZING");

    const clientMac = session.clientMac;
    const apMac = session.apMac;
    const ssidName = session.ssid;
    const site = session.site;

    console.log("[omada/authorize] Forwarding to relay", {
      clientMac,
      apMac,
      ssid: ssidName,
      site,
    });

    let relayRes;
    try {
      relayRes = await fetch(
        `${process.env.RELAY_URL}/relay/omada-auth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.RELAY_API_KEY || "",
          },
          body: JSON.stringify({
            clientMac,
            apMac,
            ssid: ssidName,
            site,
          }),
        }
      );
    } catch (networkError: any) {
      console.error("[omada/authorize] Relay network error:", networkError.message);
      sessionStore.updateStatus(session.id, "FAILED", {
        failureReason: "Relay unreachable",
      });
      return NextResponse.json(
        { success: false, error: `Relay unreachable: ${networkError.message}` },
        { status: 502 }
      );
    }

    let relayBody;
    try {
      relayBody = await relayRes.json();
    } catch {
      relayBody = null;
    }

    console.log("[omada/authorize] Relay response", {
      status: relayRes.status,
      body: relayBody,
    });

    if (!relayRes.ok || !relayBody?.success) {
      const reason = relayBody?.error || `Relay returned status ${relayRes.status}`;
      sessionStore.updateStatus(session.id, "FAILED", {
        failureReason: reason,
      });
      return NextResponse.json(
        { success: false, error: reason },
        { status: 502 }
      );
    }

    sessionStore.updateStatus(session.id, "AUTHORIZED");

    console.log("[omada/authorize] Client authorized successfully", { token });

    return NextResponse.json({
      success: true,
      data: relayBody.data,
    });
  } catch (error: any) {
    console.error("[omada/authorize] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
