"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "PENDING" | "VERIFYING" | "VERIFIED" | "AUTHORIZING" | "AUTHORIZED" | "FAILED";

export default function PortalPage() {
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState("/");
  const [verifying, setVerifying] = useState(false);
  const [polling, setPolling] = useState(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<Status | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const clientMac = searchParams.get("clientMac") || "";
    const apMac = searchParams.get("apMac") || "";
    const ssid = searchParams.get("ssid") || "";
    const site = searchParams.get("site") || "";
    const urlRedirect = searchParams.get("redirectUrl");

    fetch("/api/portal/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientMac, apMac, ssid, site, redirectUrl: urlRedirect }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          setError(json.error || "Failed to create session.");
          setLoading(false);
          return;
        }
        setToken(json.data.token);
        setRedirectUrl(json.data.redirectUrl || "/");
        setLoading(false);
      })
      .catch((err) => {
        console.error("[portal] Init error:", err);
        setError("Network error. Please try again.");
        setLoading(false);
      });
  }, [searchParams]);

  const handleVerify = useCallback(async () => {
    if (!token) return;
    setVerifying(true);
    setVerifyMessage(null);
    setFailureReason(null);

    try {
      const res = await fetch("/api/portal/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();

      if (json.success) {
        setVerifying(false);
        setPolling(true);
      } else {
        setVerifying(false);
        setVerifyMessage(json.error || "Verification failed. Try again.");
      }
    } catch (err) {
      console.error("[portal] Verify error:", err);
      setVerifying(false);
      setVerifyMessage("Network error. Please try again.");
    }
  }, [token]);

  useEffect(() => {
    if (!polling || !token) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/session/${token}`);
        const json = await res.json();
        if (!json.success) {
          console.warn("[portal] Poll returned error:", json.error);
          return;
        }
        const data = json.data;
        setCurrentStatus(data.status);

        if (data.status === "AUTHORIZED") {
          if (pollRef.current) clearInterval(pollRef.current);
          setPolling(false);
          setRedirecting(true);
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 1000);
        }

        if (data.status === "FAILED") {
          if (pollRef.current) clearInterval(pollRef.current);
          setPolling(false);
          setFailureReason(data.failureReason || "Verification failed.");
        }
      } catch (err) {
        console.error("[portal] Poll error:", err);
      }
    };

    poll();
    pollRef.current = setInterval(poll, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [polling, token, redirectUrl]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-red-600">Connection Error</h1>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-gray-600">Connecting to portal...</p>
        </div>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-green-50 p-4">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-green-600">Access Granted</h1>
          <p className="text-gray-700">Redirecting you to the internet...</p>
        </div>
      </div>
    );
  }

  if (failureReason) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-red-600">Verification Failed</h1>
          <p className="text-gray-700">{failureReason}</p>
          <p className="mt-4 text-sm text-gray-500">Please reconnect to WiFi and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">WiFi Access</h1>

        <p className="mb-6 text-gray-600">
          Welcome! Follow our Facebook page to get internet access.
        </p>

        <a
          href={process.env.NEXT_PUBLIC_FACEBOOK_PAGE_URL || "https://facebook.com"}
          target="_blank"
          rel="noopener noreferrer"
          className={`mb-4 block w-full rounded-lg px-6 py-3 font-medium text-white transition ${
            verifying || polling
              ? "cursor-not-allowed bg-blue-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Open Facebook Page
        </a>

        <button
          onClick={handleVerify}
          disabled={verifying || polling || !token}
          className={`w-full rounded-lg px-6 py-3 font-medium text-white transition ${
            verifying || polling || !token
              ? "cursor-not-allowed bg-gray-400"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {verifying ? "Checking..." : "I have followed! Check my access"}
        </button>

        {verifyMessage && (
          <p className="mt-4 text-sm text-amber-600">{verifyMessage}</p>
        )}

        <div className="mt-6 rounded-lg bg-gray-50 p-3">
          <p className="text-sm text-gray-500">
            Status:{" "}
            <span className="font-medium text-gray-700">
              {currentStatus || "PENDING"}
            </span>
          </p>
          {(polling || verifying) && (
            <p className="mt-1 text-xs text-gray-400">
              {polling
                ? "Checking verification status..."
                : "Processing your request..."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
