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
    X,
    Plus
} from "lucide-react";

// ── INITIAL DATA (The "Template") ──
const INITIAL_STEPS = [
    { id: "step-1", phase: "OPPORTUNITY", icon: Fingerprint, title: "Project Ingestion", who: "Sales / Natalia", time: "Initial Contact", painLevel: 1, desc: "A project brief arrives. It carries the weight of potential, but it's often buried in thousands of pages of noise.", comments: [] },
    { id: "step-2", phase: "EXTRACTION", icon: Search, title: "Technical Distillation", who: "Jeremy Riley", time: "Analysis Phase", painLevel: 5, desc: "The heavy lifting. Manually sifting through architectural drawings to find the core technical truths.", comments: [] },
    { id: "step-3", phase: "ESTIMATION", icon: Layers, title: "Value Modeling", who: "Matt Hobbs", time: "Fiscal Strategy", painLevel: 3, desc: "Transforming specs into a financial narrative using ANC's proprietary margin logic.", comments: [] },
    { id: "step-4", phase: "PROPOSAL", icon: FileText, title: "The Signature Delivery", who: "Natalia Kovaleva", time: "Final Presentation", painLevel: 2, desc: "The moment of truth. Converting raw data into a branded, professional narrative for the client.", comments: [] },
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

    // Local state for editing (mocking "Client Feedback" mode)
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(step.title);
    const [desc, setDesc] = useState(step.desc);

    // Local state for comments
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [comments, setComments] = useState<string[]>(step.comments || []);

    const handleSave = () => {
        setIsEditing(false);
        // In a real app, you'd bubble this up to the parent
    };

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
            className={`group relative mb-6 rounded-3xl border transition-all duration-300
        ${isDragging
                    ? "bg-[#002C73] text-white shadow-2xl scale-105 border-[#002C73] opacity-90 rotate-1"
                    : "bg-white border-[#E2E8F0] hover:border-[#0A52EF]/50 hover:shadow-lg"}`}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity
          ${isDragging ? "text-white/50" : "text-slate-300 hover:text-[#0A52EF]"}`}
            >
                <GripVertical size={20} />
            </div>

            <div className="p-8 pl-16">
                {/* Header Row */}
                <div className="flex justify-between items-start mb-4">
                    {/* Icon & Phase Label */}
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                 ${isDragging ? "bg-white/10 text-white" : "bg-[#0A52EF]/5 text-[#0A52EF]"}`}>
                            <Icon size={20} />
                        </div>
                        <div>
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] block mb-1
                  ${isDragging ? "text-white/60" : "text-slate-400"}`}>
                                {step.phase} — {step.time}
                            </span>
                            {isEditing ? (
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="text-xl font-black uppercase tracking-tighter bg-transparent border-b border-current focus:outline-none w-full"
                                    autoFocus
                                />
                            ) : (
                                <h3 className={`text-xl font-black uppercase tracking-tighter
                    ${isDragging ? "text-white" : "text-[#002C73]"}`}>
                                    {title}
                                </h3>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={`flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${isDragging ? "hidden" : ""}`}>
                        {isEditing ? (
                            <button onClick={handleSave} className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors">
                                <Check size={16} />
                            </button>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-[#0A52EF] rounded-lg transition-colors">
                                <Edit2 size={16} />
                            </button>
                        )}
                        <button
                            onClick={() => setShowComments(!showComments)}
                            className={`p-2 rounded-lg transition-colors relative
                 ${showComments ? "bg-[#0A52EF]/10 text-[#0A52EF]" : "hover:bg-slate-50 text-slate-400 hover:text-[#0A52EF]"}`}
                        >
                            <MessageSquare size={16} />
                            {comments.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#0A52EF] text-white text-[9px] flex items-center justify-center rounded-full font-bold">
                                    {comments.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="pl-[4.5rem]">
                    {isEditing ? (
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            className="w-full text-base text-[#475563] leading-relaxed font-medium bg-slate-50 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A52EF]/20 resize-none h-24"
                        />
                    ) : (
                        <p className={`text-base leading-relaxed font-medium
              ${isDragging ? "text-white/80" : "text-[#475563]"}`}>
                            {desc}
                        </p>
                    )}

                    {/* Metadata Footer */}
                    <div className={`mt-6 pt-6 border-t flex items-center justify-between
             ${isDragging ? "border-white/10" : "border-slate-100"}`}>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-[0.2em]
                  ${isDragging ? "text-white/60" : "text-[#0A52EF]"}`}>
                                Primary Owner:
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wider
                  ${isDragging ? "text-white" : "text-[#002C73]"}`}>
                                {step.who}
                            </span>
                        </div>
                    </div>

                    {/* Comments Section */}
                    {showComments && !isDragging && (
                        <div className="mt-6 bg-slate-50 rounded-2xl p-6 animate-in slide-in-from-top-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Client Feedback</h4>

                            <div className="space-y-3 mb-4">
                                {comments.map((c, i) => (
                                    <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 text-sm font-medium text-[#475563] shadow-sm">
                                        {c}
                                    </div>
                                ))}
                                {comments.length === 0 && (
                                    <p className="text-xs text-slate-400 italic">No comments yet. Start the conversation.</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addComment()}
                                    placeholder="Add a thought..."
                                    className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0A52EF]"
                                />
                                <button
                                    onClick={addComment}
                                    disabled={!newComment.trim()}
                                    className="bg-[#0A52EF] text-white p-2 rounded-lg hover:bg-[#002C73] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── MAIN COMPONENT ──
export default function OperationsManager() {
    const [items, setItems] = useState(INITIAL_STEPS);
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Prevent accidental drags
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

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
        <div className="animate-in fade-in duration-1000">
            <header className="mb-24 flex items-end justify-between">
                <div>
                    <h2 className="brand-mask-text text-8xl leading-none tracking-tighter">
                        Operations<br />Manager
                    </h2>
                </div>
                <div className="max-w-md text-right">
                    <p className="text-lg text-[#002C73] font-bold mb-2">Client Verification Mode</p>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        Review the operational workflow below. Drag to reorder steps, edit descriptions, or leave comments to align with your internal process.
                    </p>
                </div>
            </header>

            <div className="max-w-4xl mx-auto">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={items.map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-6">
                            {items.map((step) => (
                                <SortableItem key={step.id} step={step} />
                            ))}
                        </div>
                    </SortableContext>

                    <DragOverlay>
                        {activeId ? (
                            <SortableItem
                                step={items.find(i => i.id === activeId)}
                                isOverlay
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>

                {/* Add Step Placeholder */}
                <button className="w-full py-8 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center gap-3 text-slate-400 hover:border-[#0A52EF] hover:text-[#0A52EF] hover:bg-[#0A52EF]/5 transition-all group mt-8">
                    <Plus size={24} className="group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-xs">Add Custom Operational Step</span>
                </button>
            </div>
        </div>
    );
}
