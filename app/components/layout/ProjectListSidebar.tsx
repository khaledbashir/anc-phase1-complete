"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Search,
    ChevronDown,
    ChevronRight,
    Settings,
    Package,
    DollarSign,
    Workflow,
    Users,
    Folder,
    FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
    id: string;
    clientName: string;
    status: string;
}

interface ProjectListSidebarProps {
    projects?: Project[];
    isCollapsed?: boolean;
    onToggle?: () => void;
}

export function ProjectListSidebar({
    projects = [],
    isCollapsed = false,
    onToggle,
}: ProjectListSidebarProps) {
    const pathname = usePathname();
    const [searchQuery, setSearchQuery] = useState("");
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

    // Filter projects based on search
    const filteredProjects = projects.filter((project) =>
        project.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const settingsItems = [
        { icon: Package, label: "Product Catalog", href: "/admin/products" },
        { icon: DollarSign, label: "Rate Cards", href: "/admin/rate-card" },
        { icon: Workflow, label: "Pricing Logic", href: "/admin/pricing-logic" },
        { icon: Users, label: "Team", href: "/admin/users" },
    ];

    if (isCollapsed) {
        return (
            <aside className="w-16 border-r border-border bg-background flex flex-col items-center py-4">
                <button
                    onClick={onToggle}
                    className="p-2 hover:bg-accent rounded-lg transition-colors mb-4"
                >
                    <Folder className="w-5 h-5 text-muted-foreground" />
                </button>
                <Link
                    href="/projects"
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                    <FileText className="w-5 h-5 text-muted-foreground" />
                </Link>
            </aside>
        );
    }

    return (
        <aside className="w-72 border-r border-border bg-background flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-foreground">ANC</h2>
                    {onToggle && (
                        <button
                            onClick={onToggle}
                            className="p-1 hover:bg-accent rounded transition-colors"
                        >
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    />
                </div>
            </div>

            {/* Projects List */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Projects
                    </div>
                    <div className="space-y-1">
                        {filteredProjects.map((project) => {
                            const isActive = pathname.includes(project.id);
                            return (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.id}`}
                                    className={cn(
                                        "group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                                        isActive
                                            ? "bg-brand-blue/10 text-brand-blue"
                                            : "text-foreground hover:bg-accent"
                                    )}
                                >
                                    <FileText className={cn(
                                        "w-4 h-4 shrink-0",
                                        isActive ? "text-brand-blue" : "text-muted-foreground"
                                    )} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">
                                            {project.clientName}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {project.status}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                        {filteredProjects.length === 0 && (
                            <div className="px-3 py-8 text-center">
                                <p className="text-sm text-muted-foreground">No projects found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Settings Section */}
                <div className="mt-4 px-2 border-t border-border pt-4">
                    <button
                        onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                    >
                        {isSettingsExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                        ) : (
                            <ChevronRight className="w-3 h-3" />
                        )}
                        <Settings className="w-3 h-3" />
                        <span className="flex-1 text-left">Beta / Internal Tools</span>
                    </button>

                    {isSettingsExpanded && (
                        <div className="mt-1 space-y-1">
                            {settingsItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 pl-8 rounded-lg transition-colors text-sm",
                                            isActive
                                                ? "bg-brand-blue/10 text-brand-blue"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Action */}
            <div className="p-4 border-t border-border">
                <Link
                    href="/projects"
                    className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                    <Folder className="w-4 h-4" />
                    <span>All Projects</span>
                </Link>
            </div>
        </aside>
    );
}

export default ProjectListSidebar;
