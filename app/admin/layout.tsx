import DashboardSidebar from "@/app/components/layout/DashboardSidebar";
import React from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen min-w-0 bg-background text-foreground overflow-x-hidden">
            <DashboardSidebar />
            <div className="flex-1 flex flex-col min-w-0 relative ml-16 md:ml-20 overflow-x-hidden">
                {/* Admin Header */}
                <header className="h-14 border-b border-border flex items-center px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="text-sm font-medium text-muted-foreground">Admin Console</div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
