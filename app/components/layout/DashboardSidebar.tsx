"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    LayoutGrid,
    FileText,
    Users,
    Workflow,
    Settings,
    SlidersHorizontal,
    DollarSign,
    Package,
    Calculator,
    X,
    PanelLeftOpen,
    PanelLeftClose,
    UserCircle,
    Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainMenuItems = [
    { icon: LayoutGrid, label: "Projects", href: "/projects" },
    { icon: FileText, label: "Templates", href: "/templates", soon: true },
];

const toolsMenuItems = [
    { icon: SlidersHorizontal, label: "PDF Filter", href: "/tools/pdf-filter" },
    { icon: Calculator, label: "Estimator", href: "/estimator" },
];

const settingsMenuItems = [
    { icon: UserCircle, label: "Profile", href: "/settings/profile", adminOnly: false },
    { icon: Bell, label: "Notifications", href: "/settings/notifications", adminOnly: false },
    { icon: Users, label: "Team", href: "/admin/users", adminOnly: false },
];

const adminMenuItems = [
    { icon: Package, label: "Product Catalog", href: "/admin/products" },
    { icon: DollarSign, label: "Rate Card", href: "/admin/rate-card" },
    { icon: Workflow, label: "Pricing Logic", href: "/admin/pricing-logic", beta: true },
];

export default function DashboardSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isNavExpanded, setIsNavExpanded] = useState(false);
    const [mounted, setMounted] = useState(false);

    const isAdmin = mounted ? session?.user?.authRole === "admin" : false;

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setIsNavExpanded(false);
    }, [pathname]);

    return (
        <>
            <aside className="h-screen w-16 md:w-20 border-r border-border bg-background flex flex-col items-center py-4 z-50 transition-colors duration-300">
                {/* Minimal Logo */}
                <div className="mb-6">
                    <Link href="/projects" className="flex items-center justify-center">
                        <div className="w-10 h-10 flex items-center justify-center relative">
                            <Image
                                src="/ANC_Logo_2023_blue.png"
                                alt="ANC"
                                width={40}
                                height={40}
                                className="w-full h-auto object-contain dark:hidden"
                            />
                            <Image
                                src="/ANC_Logo_2023_white.png"
                                alt="ANC"
                                width={40}
                                height={40}
                                className="w-full h-auto object-contain hidden dark:block"
                            />
                        </div>
                    </Link>
                </div>

                <button
                    onClick={() => setIsNavExpanded((prev) => !prev)}
                    className="group relative p-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 mb-4"
                    aria-label={isNavExpanded ? "Collapse navigation" : "Expand navigation"}
                >
                    {isNavExpanded ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                    <div className="absolute left-full ml-4 px-2 py-1 rounded-sm bg-popover border border-border text-popover-foreground text-[10px] font-medium uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-card">
                        {isNavExpanded ? "Collapse" : "Expand"}
                    </div>
                </button>

                {/* Main Nav */}
                <nav className="flex-1 flex flex-col gap-2 overflow-y-auto">
                    {/* Primary Navigation */}
                    {mainMenuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    "group relative p-3 rounded transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                                    item.soon && "pointer-events-none opacity-40"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                <div className="absolute left-full ml-4 px-2 py-1 rounded-sm bg-popover border border-border text-popover-foreground text-[10px] font-medium uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-card">
                                    {item.label} {item.soon && "(Soon)"}
                                </div>
                            </Link>
                        );
                    })}

                    {/* Divider */}
                    <div className="h-px bg-border my-2" />

                    {/* Tools */}
                    {toolsMenuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    "group relative p-3 rounded transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                <div className="absolute left-full ml-4 px-2 py-1 rounded-sm bg-popover border border-border text-popover-foreground text-[10px] font-medium uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-card">
                                    {item.label}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Nav */}
                <div className="flex flex-col gap-4 mt-auto">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="group relative p-3 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
                    >
                        <Settings className="w-5 h-5" />
                        <div className="absolute left-full ml-4 px-2 py-1 rounded-sm bg-popover border border-border text-popover-foreground text-[10px] font-medium uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-card">
                            Settings
                        </div>
                    </button>
                    <div className="w-8 h-8 rounded-full border border-border bg-muted flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
                    </div>
                </div>
            </aside>

            {/* Expandable Nav Panel */}
            <div
                className={cn(
                    "fixed top-0 left-16 md:left-20 bottom-0 w-72 border-r border-border bg-background z-[70] transition-all duration-200",
                    isNavExpanded ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0 pointer-events-none"
                )}
            >
                <div className="h-full flex flex-col">
                    <div className="h-14 border-b border-border flex items-center justify-between px-4">
                        <span className="text-sm font-semibold text-foreground">Navigation</span>
                        <button
                            onClick={() => setIsNavExpanded(false)}
                            className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            aria-label="Close expanded navigation"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-6">
                        <div>
                            <h3 className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Main</h3>
                            <div className="space-y-1">
                                {mainMenuItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
                                                isActive
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-foreground hover:bg-accent",
                                                item.soon && "pointer-events-none opacity-40"
                                            )}
                                        >
                                            <item.icon className="w-4 h-4" />
                                            <span className="flex-1">{item.label}</span>
                                            {item.soon && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Soon</span>}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <h3 className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tools</h3>
                            <div className="space-y-1">
                                {toolsMenuItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
                                                isActive
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-foreground hover:bg-accent"
                                            )}
                                        >
                                            <item.icon className="w-4 h-4" />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <h3 className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Settings</h3>
                            <button
                                onClick={() => {
                                    setIsNavExpanded(false);
                                    setIsSettingsOpen(true);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-foreground hover:bg-accent transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                <span>Open Settings</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-background border border-border rounded-lg shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h2 className="text-lg font-semibold text-foreground">Settings</h2>
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="p-2 hover:bg-accent rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* General Settings */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-3">General</h3>
                                <div className="space-y-1">
                                    {settingsMenuItems.map((item) => {
                                        if (item.adminOnly && !isAdmin) return null;
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsSettingsOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                                    isActive
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-foreground hover:bg-accent"
                                                )}
                                            >
                                                <item.icon className="w-5 h-5" />
                                                <span className="text-sm font-medium">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Admin Tools */}
                            {isAdmin && (
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                        Admin Tools
                                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Admin Only</span>
                                    </h3>
                                    <div className="space-y-1">
                                        {adminMenuItems.map((item) => {
                                            const isActive = pathname === item.href;
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={() => setIsSettingsOpen(false)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                                        isActive
                                                            ? item.beta
                                                                ? "bg-amber-500/10 text-amber-500"
                                                                : "bg-primary/10 text-primary"
                                                            : "text-foreground hover:bg-accent"
                                                    )}
                                                >
                                                    <item.icon className="w-5 h-5" />
                                                    <span className="text-sm font-medium flex-1">{item.label}</span>
                                                    {item.beta && (
                                                        <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">BETA</span>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-border bg-muted/30">
                            <p className="text-xs text-muted-foreground">
                                ANC Proposal Engine • Version 1.0.0
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
