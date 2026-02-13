"use client";

import React, { useState } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    Fingerprint,
    Search,
    Layers,
    FileText,
    GripVertical,
    MessageSquare,
    Edit2,
    Check,
    Plus,
    Activity,
    Cpu,
    ShieldCheck,
    Terminal
} from "lucide-react";

// ── INITIAL DATA (The "Protocol") ──
const INITIAL_STEPS = [
    { id: "OP-01", phase: "INGEST", icon: Fingerprint, title: "Project Ingestion", who: "Sales / Natalia", time: "T-MINUS 0", status: "ACTIVE", painLevel: 1, desc: "Brief ingestion and initial parameter extraction.", comments: [] },
    { id: "OP-02", phase: "ANALYSIS", icon: Search, title: "Technical Distillation", who: "Jeremy Riley", time: "T+24H", status: "PENDING", painLevel: 5, desc: "Architectural drawing analysis and core specification identification.", comments: [] },
    { id: "OP-03", phase: "MODELING", icon: Layers, title: "Value Modeling", who: "Matt Hobbs", time: "T+48H", status: "STANDBY", painLevel: 3, desc: "Financial narrative construction and margin logic application.", comments: [] },
    { id: "OP-04", phase: "OUTPUT", icon: FileText, title: "Final Delivery", who: "Natalia Kovaleva", time: "T+72H", status: "LOCKED", painLevel: 2, desc: "Proposal generation, brand alignment, and client presentation.", comments: [] },
];

// ── SORTABLE ITEM COMPONENT ──
function SortableItem({ step, isOverlay = false }: { step: any, isOverlay?: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: step.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
        position: "relative" as const,
    };

    // Local state for editing
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(step.title);
    const [desc, setDesc] = useState(step.desc);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [comments, setComments] = useState<string[]>(step.comments || []);

    const handleSave = () => setIsEditing(false);
    const addComment = () => {
        if (!newComment.trim()) return;
        setComments([...comments, newComment]);
        setNewComment("");
    };

    const Icon = step.icon;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative border-l-2 bg-background transition-all duration-200
        ${isDragging
                    ? "border-l-primary shadow-2xl scale-[1.01] z-50 ring-1 ring-primary/20"
                    : "border-l-muted hover:border-l-primary/50 hover:bg-muted/30 border-y border-r border-border/40"}`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">

                {/* Drag Handle & ID */}
                <div className="flex items-center gap-3 shrink-0 min-w-[100px]">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground transition-colors"
                    >
                        <GripVertical size={14} />
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground tracking-wider">{step.id}</div>
                </div>

                {/* Phase Status */}
                <div className="shrink-0 min-w-[120px]">
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium tracking-wider uppercase rounded-sm
                        ${step.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' :
                            step.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' :
                                step.status === 'LOCKED' ? 'bg-slate-500/10 text-slate-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {step.status}
                    </span>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon size={14} className="text-muted-foreground" />
                        {isEditing ? (
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="bg-transparent border-b border-primary/50 focus:outline-none font-semibold text-sm w-full"
                                autoFocus
                            />
                        ) : (
                            <h3 className="font-semibold text-sm text-foreground tracking-tight">{title}</h3>
                        )}
                    </div>
                    {isEditing ? (
                        <input
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            className="bg-transparent border-b border-border focus:outline-none text-xs text-muted-foreground w-full"
                        />
                    ) : (
                        <p className="text-xs text-muted-foreground truncate font-mono">{desc}</p>
                    )}
                </div>

                {/* Owner & Actions */}
                <div className="flex items-center gap-6 shrink-0">
                    <div className="hidden md:block text-right">
                        <div className="text-[10px] uppercase text-muted-foreground font-mono tracking-wider">Owner</div>
                        <div className="text-xs font-medium text-foreground">{step.who}</div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                        >
                            {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
                        </button>
                        <button
                            onClick={() => setShowComments(!showComments)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded relative"
                        >
                            <MessageSquare size={14} />
                            {comments.length > 0 && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Comments Drawer */}
            {showComments && (
                <div className="px-4 pb-4 pt-0">
                    <div className="bg-muted/30 border border-border/50 rounded-sm p-3 space-y-3">
                        <div className="space-y-2">
                            {comments.map((c, i) => (
                                <div key={i} className="text-xs font-mono text-muted-foreground pl-2 border-l-2 border-primary/20">
                                    {c}
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <div className="text-[10px] text-muted-foreground/50 font-mono italic">NO LOGS AVAILABLE.</div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <span className="text-primary font-mono text-xs pt-1.5">{">"}</span>
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addComment()}
                                placeholder="ENTER LOG ENTRY..."
                                className="flex-1 bg-transparent border-none focus:outline-none text-xs font-mono text-foreground placeholder:text-muted-foreground/50 h-8"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── MAIN COMPONENT ──
export default function OperationsManager() {
    const [items, setItems] = useState(INITIAL_STEPS);
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: any) => setActiveId(event.active.id);
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
        setActiveId(null);
    };

    return (
        <div className="w-full max-w-5xl mx-auto py-8">
            {/* Mission Control Header */}
            <div className="flex items-end justify-between mb-8 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded-sm text-primary">
                        <Cpu size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-foreground uppercase">Operations Protocol</h1>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> SYSTEM ONLINE</span>
                            <span>•</span>
                            <span>V.2.0.4</span>
                        </div>
                    </div>
                </div>

                <div className="hidden sm:flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-[10px] font-mono text-muted-foreground uppercase">Active Processes</div>
                        <div className="text-lg font-bold text-foreground leading-none">4</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-mono text-muted-foreground uppercase">Efficiency</div>
                        <div className="text-lg font-bold text-emerald-500 leading-none">98%</div>
                    </div>
                </div>
            </div>

            {/* List Header */}
            <div className="flex px-4 py-2 border-b border-border text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                <div className="w-[100px]">ID</div>
                <div className="w-[120px]">Status</div>
                <div className="flex-1">Task Protocol</div>
                <div className="hidden md:block w-32 text-right pr-12">Owner</div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1">
                        {items.map((step) => (
                            <SortableItem key={step.id} step={step} />
                        ))}
                    </div>
                </SortableContext>

                <DragOverlay>
                    {activeId ? <SortableItem step={items.find(i => i.id === activeId)} isOverlay /> : null}
                </DragOverlay>
            </DndContext>

            {/* Footer Action */}
            <button className="w-full mt-4 py-3 border border-dashed border-border flex items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-mono uppercase tracking-wider rounded-sm group">
                <Terminal size={12} />
                <span>Initialize New Protocol Sequence</span>
            </button>
        </div>
    );
}
