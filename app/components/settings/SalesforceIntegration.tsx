"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { SalesforceClient, type SalesforceConnectionStatus } from "@/lib/salesforce/client";

/**
 * Salesforce Integration Settings Component
 * 
 * Phase 2.2.4: Configuration UI for Salesforce CRM integration.
 * Allows Admin to configure OAuth credentials and enable opportunity sync.
 * 
 * Branding: Uses French Blue (#0A52EF) and Work Sans font per ANC Identity Guidelines.
 */
export function SalesforceIntegration() {
    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [showSecret, setShowSecret] = useState(false);
    const [enableSync, setEnableSync] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<SalesforceConnectionStatus | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Load saved configuration
    useEffect(() => {
        // TODO: Load from database or localStorage
        const savedClientId = localStorage.getItem("salesforce_client_id") || "";
        const savedClientSecret = localStorage.getItem("salesforce_client_secret") || "";
        const savedEnableSync = localStorage.getItem("salesforce_enable_sync") === "true";

        setClientId(savedClientId);
        setClientSecret(savedClientSecret);
        setEnableSync(savedEnableSync);
    }, []);

    // Test connection
    const handleTestConnection = async () => {
        if (!clientId || !clientSecret) {
            setConnectionStatus({
                success: false,
                message: "Please enter Client ID and Client Secret first",
            });
            return;
        }

        setIsTesting(true);
        setConnectionStatus(null);

        try {
            const client = new SalesforceClient({
                clientId,
                clientSecret,
                apiVersion: "v58.0",
            });

            const result = await client.testConnection();
            setConnectionStatus(result);
        } catch (error: any) {
            setConnectionStatus({
                success: false,
                message: error?.message || "Connection test failed",
            });
        } finally {
            setIsTesting(false);
        }
    };

    // Save configuration
    const handleSave = async () => {
        setIsSaving(true);

        try {
            // TODO: Save to database via API
            localStorage.setItem("salesforce_client_id", clientId);
            localStorage.setItem("salesforce_client_secret", clientSecret);
            localStorage.setItem("salesforce_enable_sync", enableSync.toString());

            // Call API to save configuration
            const response = await fetch("/api/settings/salesforce", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId,
                    clientSecret,
                    enableSync,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save configuration");
            }

            // Show success message
            setConnectionStatus({
                success: true,
                message: "Configuration saved successfully",
            });
        } catch (error: any) {
            setConnectionStatus({
                success: false,
                message: error?.message || "Failed to save configuration",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Get webhook URL
    const webhookUrl = typeof window !== "undefined" 
        ? `${window.location.origin}/api/integrations/salesforce/webhook`
        : "";

    return (
        <Card className="border-border bg-card">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            Salesforce CRM Integration
                        </CardTitle>
                        <CardDescription className="mt-2 text-sm text-muted-foreground">
                            Connect ANC Studio to Salesforce to automatically create proposals from opportunities and sync proposal status updates.
                        </CardDescription>
                    </div>
                    <Badge
                        variant={connectionStatus?.success ? "default" : "outline"}
                        className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            connectionStatus?.success
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border"
                        )}
                    >
                        {connectionStatus?.success ? (
                            <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Connected
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Disconnected
                            </>
                        )}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* OAuth Credentials */}
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="client-id" className="text-sm font-semibold text-foreground mb-2 block">
                            Client ID (Consumer Key)
                        </Label>
                        <Input
                            id="client-id"
                            type="text"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder="Enter Salesforce Connected App Client ID"
                            className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Found in Salesforce Setup → App Manager → Your Connected App
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="client-secret" className="text-sm font-semibold text-foreground mb-2 block">
                            Client Secret (Consumer Secret)
                        </Label>
                        <div className="relative">
                            <Input
                                id="client-secret"
                                type={showSecret ? "text" : "password"}
                                value={clientSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                placeholder="Enter Salesforce Connected App Client Secret"
                                className="font-mono text-sm pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSecret(!showSecret)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Keep this secret secure. It's used for OAuth authentication.
                        </p>
                    </div>
                </div>

                {/* Connection Test */}
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleTestConnection}
                        disabled={isTesting || !clientId || !clientSecret}
                        className="bg-[#0A52EF] hover:bg-[#0A52EF]/90 text-white font-semibold"
                        style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                        {isTesting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Testing...
                            </>
                        ) : (
                            "Test Connection"
                        )}
                    </Button>

                    {connectionStatus && (
                        <div className={cn(
                            "flex items-center gap-2 text-sm",
                            connectionStatus.success ? "text-emerald-600" : "text-amber-600"
                        )}>
                            {connectionStatus.success ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <AlertCircle className="w-4 h-4" />
                            )}
                            <span>{connectionStatus.message}</span>
                        </div>
                    )}
                </div>

                {/* Sync Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                    <div className="flex-1">
                        <Label htmlFor="enable-sync" className="text-sm font-semibold text-foreground cursor-pointer">
                            Enable Opportunity Sync
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                            Automatically create proposals when opportunities are created in Salesforce, and sync proposal status updates back to Salesforce.
                        </p>
                    </div>
                    <Switch
                        id="enable-sync"
                        checked={enableSync}
                        onCheckedChange={setEnableSync}
                        disabled={!connectionStatus?.success}
                    />
                </div>

                {/* Webhook URL Display */}
                {enableSync && (
                    <div className="p-4 rounded-lg border border-border bg-muted/10">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Webhook URL (for Salesforce Configuration)
                        </Label>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-background border border-border rounded text-xs font-mono text-foreground break-all">
                                {webhookUrl}
                            </code>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(webhookUrl);
                                }}
                                className="shrink-0"
                            >
                                Copy
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Add this URL to your Salesforce Connected App's "Callback URL" field in Salesforce Setup.
                        </p>
                    </div>
                )}

                {/* Field Mapping Info */}
                <div className="p-4 rounded-lg border border-border bg-blue-50/50 dark:bg-blue-950/20">
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#0A52EF]" />
                        Field Mapping
                    </h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p>• Salesforce Opportunity → ANC Proposal: Name, Account, Amount</p>
                        <p>• ANC Proposal Status → Salesforce Stage: DRAFT → Prospecting, SIGNED → Closed Won</p>
                        <p>• Proposal PDF attachments sync to Opportunity Files</p>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-border">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !clientId || !clientSecret}
                        className="bg-[#0A52EF] hover:bg-[#0A52EF]/90 text-white font-semibold px-6"
                        style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Configuration"
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default SalesforceIntegration;
