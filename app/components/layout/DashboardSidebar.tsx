"use client";

import React from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainMenuItems = [
    { icon: LayoutGrid, label: "Projects", href: "/projects" },
    { icon: FileText, label: "Templates", href: "/templates", soon: true },
];

const toolsMenuItems = [
    { icon: SlidersHorizontal, label: "PDF Filter", href: "/tools/pdf-filter", soon: false },
    { icon: Calculator, label: "Estimator", href: "/estimator", soon: false },
];

const betaInternalItems = [
    { icon: Package, label: "Product Catalog", href: "/admin/products", soon: false },
    { icon: DollarSign, label: "Rate Card", href: "/admin/rate-card", soon: false },
    { icon: Workflow, label: "Pricing Logic", href: "/admin/pricing-logic", soon: false },
    { icon: Users, label: "Team", href: "/admin/users", soon: false },
];

export default function DashboardSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const isAdmin = session?.user?.authRole === "admin";

    return (
        <aside className="w-16 md:w-20 border-r border-border bg-background flex flex-col items-center py-8 z-50 transition-colors duration-300">
            {/* Minimal Logo */}
            <div className="mb-12">
                <Link href="/projects" className="flex items-center justify-center">
                    <div className="w-10 h-10 flex items-center justify-center relative">
                        {/* Light Mode Logo */}
                        <Image
                            src="/ANC_Logo_2023_blue.png"
                            alt="ANC"
                            width={40}
                            height={40}
                            className="w-full h-auto object-contain dark:hidden"
                        />
                        {/* Dark Mode Logo */}
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

            {/* Main Nav */}
            <nav className="flex-1 flex flex-col gap-3">
                {/* Main Section */}
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

                            {/* Tooltip */}
                            <div className="absolute left-full ml-4 px-2 py-1 rounded-sm bg-popover border border-border text-popover-foreground text-[10px] font-medium uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-card">
                                {item.label} {item.soon && "(Soon)"}
                            </div>
                        </Link>
                    );
                })}

                {/* Divider */}
                <div className="h-px bg-border my-2" />

                {/* Tools Section */}
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
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                                item.soon && "pointer-events-none opacity-40"
                            )}
                        >
                            <item.icon className="w-5 h-5" />

                            {/* Tooltip */}
                            <div className="absolute left-full ml-4 px-2 py-1 rounded-sm bg-popover border border-border text-popover-foreground text-[10px] font-medium uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-card">
                                {item.label} {item.soon && "(Soon)"}
                            </div>
                        </Link>
                    );
                })}

                {/* Divider before Beta/Internal Tools */}
                {isAdmin && <div className="h-px bg-border my-2" />}

                {/* Beta / Internal Tools Section (Admin Only) */}
                {isAdmin && betaInternalItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "group relative p-3 rounded transition-all duration-200",
                                isActive
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                                item.soon && "pointer-events-none opacity-40"
                            )}
                        >
                            <item.icon className="w-5 h-5" />

                            {/* Tooltip with BETA label */}
                            <div className="absolute left-full ml-4 px-2 py-1 rounded-sm bg-popover border border-border text-popover-foreground text-[10px] font-medium uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-card">
                                <div className="flex items-center gap-2">
                                    <span>{item.label}</span>
                                    <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1 rounded">BETA</span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Nav */}
            <div className="flex flex-col gap-6 mt-auto">
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Settings className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-full border border-border bg-muted flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
                </div>
            </div>
        </aside>
    );
}
