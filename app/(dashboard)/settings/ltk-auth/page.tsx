"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Copy, Save, ExternalLink, RefreshCw } from "lucide-react";

type ShopMyStatus = "loading" | "ok" | "not_configured" | "error";

export default function LtkAuthPage() {
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shopmyStatus, setShopmyStatus] = useState<ShopMyStatus>("loading");
  const [shopmyMessage, setShopmyMessage] = useState("");

  const checkShopMy = useCallback(() => {
    setShopmyStatus("loading");
    fetch("/api/v1/settings/shopmy-session")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setShopmyStatus("ok");
          setShopmyMessage(d.message ?? "Session OK");
        } else if (d.message?.includes("not set")) {
          setShopmyStatus("not_configured");
          setShopmyMessage(d.message ?? "Not configured");
        } else {
          setShopmyStatus("error");
          setShopmyMessage(d.message ?? "Login failed");
        }
      })
      .catch(() => {
        setShopmyStatus("error");
        setShopmyMessage("Request failed");
      });
  }, []);

  useEffect(() => {
    checkShopMy();
  }, [checkShopMy]);

  const extractionScript = `(function(){const c=document.cookie.split(';').filter(x=>x.includes('auth')||x.includes('token')||x.includes('ltk')).map(x=>x.trim());c.forEach(x=>console.log(x));const l=Object.keys(localStorage).filter(k=>k.includes('auth')||k.includes('token'));l.forEach(k=>console.log(k+'='+localStorage.getItem(k)));return c.length>0||l.length>0?'Found tokens - check console':'No tokens found';})();`;

  const copyScript = () => {
    navigator.clipboard.writeText(extractionScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveToken = () => {
    if (!token.trim()) return;
    
    // Save to localStorage (client-side only)
    localStorage.setItem("ltk_auth_token", token);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">LTK Authentication</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          ShopMy API (programmatic) and browser token extraction for LTK
        </p>
      </div>

      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">ShopMy API (programmatic)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Set <code className="bg-muted px-1 rounded text-xs">SHOPMY_EMAIL</code> and{" "}
          <code className="bg-muted px-1 rounded text-xs">SHOPMY_PASSWORD</code> in your <code className="bg-muted px-1 rounded text-xs">.env</code> to use the apiv3.shopmy.us session API.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {shopmyStatus === "loading" && (
            <Badge variant="secondary">Checking…</Badge>
          )}
          {shopmyStatus === "ok" && (
            <Badge className="bg-green-600 hover:bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden /> Session OK
            </Badge>
          )}
          {shopmyStatus === "not_configured" && (
            <Badge variant="secondary">
              <AlertCircle className="h-3 w-3 mr-1" aria-hidden /> Not configured
            </Badge>
          )}
          {shopmyStatus === "error" && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              <AlertCircle className="h-3 w-3 mr-1" aria-hidden /> {shopmyMessage}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={checkShopMy} aria-label="Recheck ShopMy session">
            <RefreshCw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Browser token (fallback)</h3>
            <p className="text-sm text-muted-foreground mb-3">For creator.shopltk.com and api-gateway.shopltk.com scraping.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>
                  Open{" "}
                  <a
                    href="https://creator.shopltk.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline font-medium inline-flex items-center gap-1"
                  >
                    creator.shopltk.com
                    <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  in a new tab
                </li>
                <li>Make sure you're logged in</li>
                <li>Press <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">F12</kbd> or <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Cmd+Option+I</kbd> to open DevTools</li>
                <li>Click the <strong>Console</strong> tab</li>
                <li>Click the button below to copy the extraction script</li>
                <li>Paste it in the console and press Enter</li>
                <li>Copy any tokens that appear in the console</li>
              </ol>
            </div>

            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto mb-4">
              <pre className="whitespace-pre-wrap break-all">{extractionScript}</pre>
            </div>

            <Button onClick={copyScript} className="w-full">
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Script Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Extraction Script
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">Step 2: Paste Token</h3>
            <p className="text-sm text-gray-600 mb-4">
              Paste the token you copied from the console (looks like: <code className="bg-gray-100 px-1 rounded">auth._id_token.auth0=eyJ...</code>)
            </p>
            <div className="space-y-3">
              <Input
                placeholder="Paste your LTK auth token here..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-sm"
              />
              <Button onClick={saveToken} className="w-full" disabled={!token.trim()}>
                <Save className="h-4 w-4 mr-2" />
                Save Token
              </Button>
              {saved && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Token saved! It will be used for automated scraping.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gray-50">
        <h3 className="font-semibold mb-2">How It Works</h3>
        <p className="text-sm text-gray-600 mb-2">
          Once you save your token, it will be stored securely in your browser and used automatically
          when running LTK scraping scripts. The token allows the system to access LTK's API on your behalf.
        </p>
        <p className="text-xs text-gray-500 mt-3">
          <strong>Note:</strong> Tokens are stored locally in your browser. They're not sent to our servers
          unless you explicitly use them in API calls.
        </p>
      </Card>
    </div>
  );
}
