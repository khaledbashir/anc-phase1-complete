"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SalesforceIntegration from "@/app/components/settings/SalesforceIntegration";
import { Settings, Database, Key, Webhook } from "lucide-react";

/**
 * Settings Page
 * 
 * Admin configuration page for system integrations and settings.
 * Currently includes Salesforce integration configuration.
 */
export default function SettingsPage() {
    return (
        <div className="container mx-auto py-8 px-6 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                    <Settings className="w-6 h-6" />
                    Settings
                </h1>
                <p className="text-sm text-muted-foreground">
                    Configure system integrations and preferences
                </p>
            </div>

            <Tabs defaultValue="integrations" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="integrations" className="flex items-center gap-2">
                        <Webhook className="w-4 h-4" />
                        Integrations
                    </TabsTrigger>
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        General
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="integrations" className="space-y-6">
                    <SalesforceIntegration />
                </TabsContent>

                <TabsContent value="general" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="w-5 h-5" />
                                General Settings
                            </CardTitle>
                            <CardDescription>
                                System-wide configuration options
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                General settings coming soon...
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
