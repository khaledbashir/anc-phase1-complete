import React from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen min-w-0 bg-background text-foreground overflow-x-hidden">
            <div className="flex-1 flex flex-col min-w-0 relative overflow-x-hidden">
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
