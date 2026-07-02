import { NextResponse } from "next/server";

let mockCounter = 100;

export async function GET() {
  try {
    if (process.env.MOCK_FOLLOWERS === "true") {
      mockCounter++;
      console.log("[graph/fan-count] Mock mode active, returning", mockCounter);
      return NextResponse.json({ success: true, count: mockCounter });
    }

    console.log("[graph/fan-count] Fetching live follower count");

    const pageId = process.env.META_PAGE_ID;
    const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { success: false, error: "META_PAGE_ID or META_PAGE_ACCESS_TOKEN is not set" },
        { status: 500 }
      );
    }

    const url = `https://graph.facebook.com/v20.0/${pageId}?fields=followers_count`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[graph/fan-count] Facebook API error:", res.status, errBody);
      return NextResponse.json(
        { success: false, error: `Facebook API returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    console.log("[graph/fan-count] Live count:", data.followers_count);

    return NextResponse.json({ success: true, count: data.followers_count });
  } catch (error: any) {
    console.error("[graph/fan-count] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
