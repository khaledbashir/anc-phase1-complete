"use client";

import { useState, useEffect, useCallback } from "react";
import {
	Plus,
	Pencil,
	Trash2,
	ChevronDown,
	ChevronRight,
	HelpCircle,
	Calculator,
	Check,
	X,
	GripVertical,
	ArrowUp,
	ArrowDown,
	Loader2,
	FolderTree,
	GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ──────────────────────────────────────────────────────────
type Category = {
	id: string;
	name: string;
	description: string | null;
	_count?: { nodes: number };
};

type Formula = {
	id: string;
	formula: string;
	unit: string;
	notes: string | null;
};

type Option = {
	id: string;
	optionText: string;
	nextNodeId: string | null;
	isFinal: boolean;
	formula: Formula | null;
};

type Node = {
	id: string;
	categoryId: string;
	parentNodeId: string | null;
	question: string;
	order: number;
	options: Option[];
};

// ─── Inline Edit Hook ───────────────────────────────────────────────
function useInlineEdit(initialValue: string, onSave: (val: string) => Promise<void>) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(initialValue);
	const [saving, setSaving] = useState(false);

	const startEdit = () => {
		setValue(initialValue);
		setEditing(true);
	};
	const cancel = () => setEditing(false);
	const save = async () => {
		if (!value.trim() || value.trim() === initialValue) {
			setEditing(false);
			return;
		}
		setSaving(true);
		await onSave(value.trim());
		setSaving(false);
		setEditing(false);
	};

	return { editing, value, setValue, saving, startEdit, cancel, save };
}

// ─── Main Component ─────────────────────────────────────────────────
export function PricingLogicTreeEditor() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
	const [nodes, setNodes] = useState<Node[]>([]);
	const [loading, setLoading] = useState(false);
	const [treeLoading, setTreeLoading] = useState(false);

	// Category CRUD state
	const [newCatName, setNewCatName] = useState("");
	const [newCatDesc, setNewCatDesc] = useState("");
	const [showNewCat, setShowNewCat] = useState(false);
	const [catSaving, setCatSaving] = useState(false);

	// Node add state
	const [showNewNode, setShowNewNode] = useState(false);
	const [newNodeQuestion, setNewNodeQuestion] = useState("");
	const [nodeSaving, setNodeSaving] = useState(false);

	// Delete confirm
	const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "node" | "option"; id: string; label: string } | null>(null);

	// ─── Fetch categories ─────────────────────────────────────────
	const fetchCategories = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/pricing-logic/categories");
			const data = await res.json();
			setCategories(Array.isArray(data) ? data : []);
		} catch {
			console.error("Failed to fetch categories");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchCategories();
	}, [fetchCategories]);

	// ─── Fetch tree for selected category ─────────────────────────
	const fetchTree = useCallback(async (catId: string) => {
		setTreeLoading(true);
		try {
			const res = await fetch(`/api/pricing-logic/tree?categoryId=${encodeURIComponent(catId)}`);
			if (!res.ok) throw new Error();
			const data = await res.json();
			setNodes(data.nodes || []);
		} catch {
			setNodes([]);
		} finally {
			setTreeLoading(false);
		}
	}, []);

	useEffect(() => {
		if (selectedCategoryId) fetchTree(selectedCategoryId);
		else setNodes([]);
	}, [selectedCategoryId, fetchTree]);

	// ─── Category CRUD ────────────────────────────────────────────
	const createCategory = async () => {
		if (!newCatName.trim()) return;
		setCatSaving(true);
		try {
			const res = await fetch("/api/pricing-logic/categories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: newCatName.trim(), description: newCatDesc.trim() || null }),
			});
			if (!res.ok) {
				const err = await res.json();
				alert(err.error || "Failed to create category");
				return;
			}
			setNewCatName("");
			setNewCatDesc("");
			setShowNewCat(false);
			await fetchCategories();
		} finally {
			setCatSaving(false);
		}
	};

	const updateCategory = async (id: string, name: string, description?: string) => {
		await fetch(`/api/pricing-logic/categories/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, description }),
		});
		await fetchCategories();
	};

	const deleteCategory = async (id: string) => {
		await fetch(`/api/pricing-logic/categories/${id}`, { method: "DELETE" });
		if (selectedCategoryId === id) {
			setSelectedCategoryId(null);
			setNodes([]);
		}
		await fetchCategories();
	};

	// ─── Node CRUD ────────────────────────────────────────────────
	const createNode = async () => {
		if (!newNodeQuestion.trim() || !selectedCategoryId) return;
		setNodeSaving(true);
		try {
			const res = await fetch("/api/pricing-logic/nodes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ categoryId: selectedCategoryId, question: newNodeQuestion.trim() }),
			});
			if (!res.ok) return;
			setNewNodeQuestion("");
			setShowNewNode(false);
			await fetchTree(selectedCategoryId);
		} finally {
			setNodeSaving(false);
		}
	};

	const updateNode = async (nodeId: string, data: { question?: string; order?: number }) => {
		await fetch(`/api/pricing-logic/nodes/${nodeId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		if (selectedCategoryId) await fetchTree(selectedCategoryId);
	};

	const deleteNode = async (nodeId: string) => {
		await fetch(`/api/pricing-logic/nodes/${nodeId}`, { method: "DELETE" });
		if (selectedCategoryId) await fetchTree(selectedCategoryId);
	};

	const moveNode = async (nodeId: string, direction: "up" | "down") => {
		const sorted = [...nodes].sort((a, b) => a.order - b.order);
		const idx = sorted.findIndex((n) => n.id === nodeId);
		if (idx < 0) return;
		const swapIdx = direction === "up" ? idx - 1 : idx + 1;
		if (swapIdx < 0 || swapIdx >= sorted.length) return;

		const currentOrder = sorted[idx].order;
		const swapOrder = sorted[swapIdx].order;

		await Promise.all([
			updateNode(sorted[idx].id, { order: swapOrder }),
			updateNode(sorted[swapIdx].id, { order: currentOrder }),
		]);
	};

	// ─── Option CRUD ──────────────────────────────────────────────
	const createOption = async (nodeId: string, optionText: string, isFinal: boolean, formula?: { formula: string; unit: string; notes?: string }) => {
		const res = await fetch("/api/pricing-logic/options", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ nodeId, optionText, isFinal, formula }),
		});
		if (!res.ok) return;
		if (selectedCategoryId) await fetchTree(selectedCategoryId);
	};

	const updateOption = async (optionId: string, data: any) => {
		await fetch(`/api/pricing-logic/options/${optionId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		if (selectedCategoryId) await fetchTree(selectedCategoryId);
	};

	const deleteOption = async (optionId: string) => {
		await fetch(`/api/pricing-logic/options/${optionId}`, { method: "DELETE" });
		if (selectedCategoryId) await fetchTree(selectedCategoryId);
	};

	// ─── Delete confirmation ──────────────────────────────────────
	const confirmDelete = async () => {
		if (!deleteTarget) return;
		if (deleteTarget.type === "category") await deleteCategory(deleteTarget.id);
		else if (deleteTarget.type === "node") await deleteNode(deleteTarget.id);
		else if (deleteTarget.type === "option") await deleteOption(deleteTarget.id);
		setDeleteTarget(null);
	};

	const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);

	// ─── Render ───────────────────────────────────────────────────
	return (
		<div className="flex gap-6 min-h-[500px]">
			{/* ── Left: Categories Panel ─────────────────────────── */}
			<div className="w-72 shrink-0 space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Categories</h3>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
						onClick={() => setShowNewCat(!showNewCat)}
					>
						<Plus className="w-4 h-4" />
					</Button>
				</div>

				{/* New category form */}
				{showNewCat && (
					<div className="space-y-2 p-3 rounded-lg border border-[#0A52EF]/30 bg-[#0A52EF]/5">
						<Input
							placeholder="Category name"
							value={newCatName}
							onChange={(e) => setNewCatName(e.target.value)}
							className="h-9 text-sm"
							autoFocus
							onKeyDown={(e) => e.key === "Enter" && createCategory()}
						/>
						<Input
							placeholder="Description (optional)"
							value={newCatDesc}
							onChange={(e) => setNewCatDesc(e.target.value)}
							className="h-9 text-sm"
							onKeyDown={(e) => e.key === "Enter" && createCategory()}
						/>
						<div className="flex gap-2">
							<Button size="sm" className="h-8 flex-1 bg-[#0A52EF] hover:bg-[#0A52EF]/90" onClick={createCategory} disabled={catSaving}>
								{catSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
							</Button>
							<Button size="sm" variant="ghost" className="h-8" onClick={() => setShowNewCat(false)}>
								Cancel
							</Button>
						</div>
					</div>
				)}

				{/* Category list */}
				{loading ? (
					<div className="space-y-2">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
						))}
					</div>
				) : categories.length === 0 ? (
					<div className="text-center py-8 text-sm text-muted-foreground">
						No categories yet. Create one to start building your pricing tree.
					</div>
				) : (
					<div className="space-y-1">
						{categories.map((cat) => (
							<CategoryItem
								key={cat.id}
								category={cat}
								isSelected={selectedCategoryId === cat.id}
								onSelect={() => setSelectedCategoryId(cat.id)}
								onUpdate={updateCategory}
								onDelete={() => setDeleteTarget({ type: "category", id: cat.id, label: cat.name })}
							/>
						))}
					</div>
				)}
			</div>

			{/* ── Right: Tree Editor ─────────────────────────────── */}
			<div className="flex-1 min-w-0">
				{!selectedCategoryId ? (
					<div className="flex flex-col items-center justify-center h-full py-20 text-center">
						<div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-4">
							<FolderTree className="w-8 h-8 text-muted-foreground" />
						</div>
						<p className="text-lg font-medium text-foreground">Select a category</p>
						<p className="text-sm text-muted-foreground mt-1">
							Pick a category from the left to view and edit its decision tree.
						</p>
					</div>
				) : treeLoading ? (
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-32 rounded-lg bg-muted/40 animate-pulse" />
						))}
					</div>
				) : (
					<div className="space-y-4">
						{/* Tree header */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<GitBranch className="w-4 h-4 text-[#0A52EF]" />
								<h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
									Decision Tree
								</h3>
								<Badge variant="secondary" className="text-xs">
									{sortedNodes.length} step{sortedNodes.length !== 1 ? "s" : ""}
								</Badge>
							</div>
							<Button
								size="sm"
								className="h-8 bg-[#0A52EF] hover:bg-[#0A52EF]/90 text-white shadow-md shadow-[#0A52EF]/20"
								onClick={() => setShowNewNode(true)}
							>
								<Plus className="w-3.5 h-3.5 mr-1.5" />
								Add Step
							</Button>
						</div>

						{/* New node form */}
						{showNewNode && (
							<div className="p-4 rounded-lg border border-[#0A52EF]/30 bg-[#0A52EF]/5 space-y-3">
								<Input
									placeholder='e.g. "Indoor or Outdoor?"'
									value={newNodeQuestion}
									onChange={(e) => setNewNodeQuestion(e.target.value)}
									className="h-10"
									autoFocus
									onKeyDown={(e) => e.key === "Enter" && createNode()}
								/>
								<div className="flex gap-2">
									<Button size="sm" className="bg-[#0A52EF] hover:bg-[#0A52EF]/90" onClick={createNode} disabled={nodeSaving}>
										{nodeSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add Step"}
									</Button>
									<Button size="sm" variant="ghost" onClick={() => { setShowNewNode(false); setNewNodeQuestion(""); }}>
										Cancel
									</Button>
								</div>
							</div>
						)}

						{/* Nodes */}
						{sortedNodes.length === 0 && !showNewNode ? (
							<div className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
								No steps yet. Click "Add Step" to create your first decision question.
							</div>
						) : (
							sortedNodes.map((node, idx) => (
								<NodeCard
									key={node.id}
									node={node}
									index={idx}
									total={sortedNodes.length}
									onUpdate={updateNode}
									onDelete={() => setDeleteTarget({ type: "node", id: node.id, label: node.question })}
									onMoveUp={() => moveNode(node.id, "up")}
									onMoveDown={() => moveNode(node.id, "down")}
									onCreateOption={createOption}
									onUpdateOption={updateOption}
									onDeleteOption={(optId, label) => setDeleteTarget({ type: "option", id: optId, label })}
									allNodes={sortedNodes}
								/>
							))
						)}
					</div>
				)}
			</div>

			{/* ── Delete Confirmation ────────────────────────────── */}
			<AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete <strong>"{deleteTarget?.label}"</strong>
							{deleteTarget?.type === "category" && " and all its steps, options, and formulas"}
							{deleteTarget?.type === "node" && " and all its options and formulas"}
							. This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20"
							onClick={confirmDelete}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

// ─── Category Item ──────────────────────────────────────────────────
function CategoryItem({
	category,
	isSelected,
	onSelect,
	onUpdate,
	onDelete,
}: {
	category: Category;
	isSelected: boolean;
	onSelect: () => void;
	onUpdate: (id: string, name: string, description?: string) => Promise<void>;
	onDelete: () => void;
}) {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(category.name);
	const [desc, setDesc] = useState(category.description || "");
	const [saving, setSaving] = useState(false);

	const save = async () => {
		if (!name.trim()) return;
		setSaving(true);
		await onUpdate(category.id, name.trim(), desc.trim() || undefined);
		setSaving(false);
		setEditing(false);
	};

	if (editing) {
		return (
			<div className="p-2.5 rounded-lg border border-[#0A52EF]/30 bg-[#0A52EF]/5 space-y-2">
				<Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" autoFocus onKeyDown={(e) => e.key === "Enter" && save()} />
				<Input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-8 text-sm" placeholder="Description" onKeyDown={(e) => e.key === "Enter" && save()} />
				<div className="flex gap-1.5">
					<Button size="sm" className="h-7 text-xs bg-[#0A52EF]" onClick={save} disabled={saving}>
						{saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
					</Button>
					<Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
						<X className="w-3 h-3" />
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div
			onClick={onSelect}
			className={cn(
				"group relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
				isSelected
					? "border-[#0A52EF]/40 bg-[#0A52EF]/5 shadow-sm"
					: "border-border hover:border-foreground/20 hover:bg-muted/30"
			)}
		>
			<div
				className={cn(
					"w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold",
					isSelected ? "bg-[#0A52EF] text-white" : "bg-muted text-muted-foreground"
				)}
			>
				{category.name.charAt(0).toUpperCase()}
			</div>
			<div className="min-w-0 flex-1">
				<p className={cn("text-sm font-medium truncate", isSelected ? "text-foreground" : "text-foreground/80")}>
					{category.name}
				</p>
				{category.description && (
					<p className="text-xs text-muted-foreground truncate">{category.description}</p>
				)}
			</div>
			<div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
				<button
					onClick={(e) => { e.stopPropagation(); setName(category.name); setDesc(category.description || ""); setEditing(true); }}
					className="p-1 text-muted-foreground hover:text-foreground rounded"
				>
					<Pencil className="w-3 h-3" />
				</button>
				<button
					onClick={(e) => { e.stopPropagation(); onDelete(); }}
					className="p-1 text-muted-foreground hover:text-red-500 rounded"
				>
					<Trash2 className="w-3 h-3" />
				</button>
			</div>
		</div>
	);
}

// ─── Node Card ──────────────────────────────────────────────────────
function NodeCard({
	node,
	index,
	total,
	onUpdate,
	onDelete,
	onMoveUp,
	onMoveDown,
	onCreateOption,
	onUpdateOption,
	onDeleteOption,
	allNodes,
}: {
	node: Node;
	index: number;
	total: number;
	onUpdate: (id: string, data: { question?: string; order?: number }) => Promise<void>;
	onDelete: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onCreateOption: (nodeId: string, text: string, isFinal: boolean, formula?: { formula: string; unit: string; notes?: string }) => Promise<void>;
	onUpdateOption: (optionId: string, data: any) => Promise<void>;
	onDeleteOption: (optionId: string, label: string) => void;
	allNodes: Node[];
}) {
	const [expanded, setExpanded] = useState(true);
	const [editingQuestion, setEditingQuestion] = useState(false);
	const [questionValue, setQuestionValue] = useState(node.question);
	const [questionSaving, setQuestionSaving] = useState(false);

	// Add option state
	const [showAddOption, setShowAddOption] = useState(false);

	const saveQuestion = async () => {
		if (!questionValue.trim() || questionValue.trim() === node.question) {
			setEditingQuestion(false);
			return;
		}
		setQuestionSaving(true);
		await onUpdate(node.id, { question: questionValue.trim() });
		setQuestionSaving(false);
		setEditingQuestion(false);
	};

	return (
		<div className="rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-foreground/10">
			{/* Node header */}
			<div className="flex items-start gap-3 p-4">
				{/* Reorder + expand */}
				<div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
					<button
						onClick={onMoveUp}
						disabled={index === 0}
						className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
					>
						<ArrowUp className="w-3.5 h-3.5" />
					</button>
					<button
						onClick={() => setExpanded(!expanded)}
						className="p-0.5 text-muted-foreground hover:text-foreground"
					>
						{expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
					</button>
					<button
						onClick={onMoveDown}
						disabled={index === total - 1}
						className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
					>
						<ArrowDown className="w-3.5 h-3.5" />
					</button>
				</div>

				{/* Step badge */}
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A52EF]/10 text-[#0A52EF]">
					<span className="text-xs font-bold">{index + 1}</span>
				</div>

				{/* Question text */}
				<div className="flex-1 min-w-0">
					<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
						Step {index + 1}
					</p>
					{editingQuestion ? (
						<div className="flex items-center gap-2">
							<Input
								value={questionValue}
								onChange={(e) => setQuestionValue(e.target.value)}
								className="h-8 text-sm flex-1"
								autoFocus
								onKeyDown={(e) => {
									if (e.key === "Enter") saveQuestion();
									if (e.key === "Escape") setEditingQuestion(false);
								}}
							/>
							<Button size="sm" className="h-8 w-8 p-0 bg-[#0A52EF]" onClick={saveQuestion} disabled={questionSaving}>
								{questionSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
							</Button>
							<Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingQuestion(false)}>
								<X className="w-3 h-3" />
							</Button>
						</div>
					) : (
						<p
							className="text-sm font-medium text-foreground cursor-pointer hover:text-[#0A52EF] transition-colors"
							onClick={() => { setQuestionValue(node.question); setEditingQuestion(true); }}
						>
							{node.question}
						</p>
					)}
				</div>

				{/* Actions */}
				<div className="flex items-center gap-1 shrink-0">
					<Badge variant="secondary" className="text-[10px]">
						{node.options.length} option{node.options.length !== 1 ? "s" : ""}
					</Badge>
					<button
						onClick={() => { setQuestionValue(node.question); setEditingQuestion(true); }}
						className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
					>
						<Pencil className="w-3.5 h-3.5" />
					</button>
					<button
						onClick={onDelete}
						className="p-1.5 text-muted-foreground hover:text-red-500 rounded transition-colors"
					>
						<Trash2 className="w-3.5 h-3.5" />
					</button>
				</div>
			</div>

			{/* Options list */}
			{expanded && (
				<div className="border-t border-border bg-muted/20 p-4 space-y-2">
					{node.options.map((opt) => (
						<OptionRow
							key={opt.id}
							option={opt}
							onUpdate={onUpdateOption}
							onDelete={() => onDeleteOption(opt.id, opt.optionText)}
							allNodes={allNodes}
							currentNodeId={node.id}
						/>
					))}

					{/* Add option */}
					{showAddOption ? (
						<AddOptionForm
							nodeId={node.id}
							allNodes={allNodes}
							currentNodeId={node.id}
							onSave={onCreateOption}
							onCancel={() => setShowAddOption(false)}
						/>
					) : (
						<button
							onClick={() => setShowAddOption(true)}
							className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#0A52EF] transition-colors py-1.5"
						>
							<Plus className="w-3.5 h-3.5" />
							Add option
						</button>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Option Row ─────────────────────────────────────────────────────
function OptionRow({
	option,
	onUpdate,
	onDelete,
	allNodes,
	currentNodeId,
}: {
	option: Option;
	onUpdate: (id: string, data: any) => Promise<void>;
	onDelete: () => void;
	allNodes: Node[];
	currentNodeId: string;
}) {
	const [editing, setEditing] = useState(false);
	const [text, setText] = useState(option.optionText);
	const [isFinal, setIsFinal] = useState(option.isFinal);
	const [formulaStr, setFormulaStr] = useState(option.formula?.formula || "");
	const [formulaUnit, setFormulaUnit] = useState(option.formula?.unit || "USD");
	const [formulaNotes, setFormulaNotes] = useState(option.formula?.notes || "");
	const [saving, setSaving] = useState(false);

	const save = async () => {
		setSaving(true);
		await onUpdate(option.id, {
			optionText: text.trim(),
			isFinal,
			formula: isFinal && formulaStr.trim() ? { formula: formulaStr.trim(), unit: formulaUnit, notes: formulaNotes.trim() || null } : undefined,
		});
		setSaving(false);
		setEditing(false);
	};

	if (editing) {
		return (
			<div className="p-3 rounded-lg border border-[#0A52EF]/30 bg-card space-y-3">
				<Input value={text} onChange={(e) => setText(e.target.value)} className="h-9 text-sm" placeholder="Option text" autoFocus />

				<div className="flex items-center gap-3">
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={isFinal}
							onChange={(e) => setIsFinal(e.target.checked)}
							className="rounded border-border accent-[#0A52EF]"
						/>
						<span className="text-xs text-foreground font-medium">Final (has pricing formula)</span>
					</label>
				</div>

				{isFinal && (
					<div className="space-y-2 p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
						<div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
							<Calculator className="w-3.5 h-3.5" />
							Pricing Formula
						</div>
						<Input
							value={formulaStr}
							onChange={(e) => setFormulaStr(e.target.value)}
							placeholder='e.g. "base_cost * sqft + 50"'
							className="h-8 text-sm font-mono"
						/>
						<div className="flex gap-2">
							<Input
								value={formulaUnit}
								onChange={(e) => setFormulaUnit(e.target.value)}
								placeholder="Unit (USD)"
								className="h-8 text-sm w-24"
							/>
							<Input
								value={formulaNotes}
								onChange={(e) => setFormulaNotes(e.target.value)}
								placeholder="Notes (optional)"
								className="h-8 text-sm flex-1"
							/>
						</div>
					</div>
				)}

				<div className="flex gap-2">
					<Button size="sm" className="h-8 bg-[#0A52EF] hover:bg-[#0A52EF]/90" onClick={save} disabled={saving}>
						{saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
					</Button>
					<Button size="sm" variant="ghost" className="h-8" onClick={() => setEditing(false)}>
						Cancel
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"group flex items-start gap-3 p-3 rounded-lg border bg-card transition-all hover:border-foreground/10",
				option.isFinal ? "border-amber-500/30" : "border-border"
			)}
		>
			<ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
			<div className="flex-1 min-w-0">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm font-medium text-foreground">{option.optionText}</span>
					{option.isFinal && (
						<Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
							Final
						</Badge>
					)}
					{!option.isFinal && option.nextNodeId && (
						<span className="text-[10px] text-muted-foreground">
							→ {allNodes.find((n) => n.id === option.nextNodeId)?.question?.slice(0, 30) || "next"}
						</span>
					)}
				</div>
				{option.formula && (
					<div className="mt-2 flex items-start gap-2 p-2 rounded-md border border-amber-500/20 bg-amber-500/5">
						<Calculator className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
						<div>
							<p className="text-xs font-mono font-medium text-foreground">{option.formula.formula}</p>
							<div className="flex items-center gap-2 mt-0.5">
								<span className="text-[10px] text-muted-foreground">{option.formula.unit}</span>
								{option.formula.notes && (
									<span className="text-[10px] text-muted-foreground">· {option.formula.notes}</span>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
			<div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
				<button
					onClick={() => setEditing(true)}
					className="p-1 text-muted-foreground hover:text-foreground rounded"
				>
					<Pencil className="w-3 h-3" />
				</button>
				<button
					onClick={onDelete}
					className="p-1 text-muted-foreground hover:text-red-500 rounded"
				>
					<Trash2 className="w-3 h-3" />
				</button>
			</div>
		</div>
	);
}

// ─── Add Option Form ────────────────────────────────────────────────
function AddOptionForm({
	nodeId,
	allNodes,
	currentNodeId,
	onSave,
	onCancel,
}: {
	nodeId: string;
	allNodes: Node[];
	currentNodeId: string;
	onSave: (nodeId: string, text: string, isFinal: boolean, formula?: { formula: string; unit: string; notes?: string }) => Promise<void>;
	onCancel: () => void;
}) {
	const [text, setText] = useState("");
	const [isFinal, setIsFinal] = useState(false);
	const [formulaStr, setFormulaStr] = useState("");
	const [formulaUnit, setFormulaUnit] = useState("USD");
	const [formulaNotes, setFormulaNotes] = useState("");
	const [saving, setSaving] = useState(false);

	const save = async () => {
		if (!text.trim()) return;
		setSaving(true);
		const formula = isFinal && formulaStr.trim() ? { formula: formulaStr.trim(), unit: formulaUnit, notes: formulaNotes.trim() || undefined } : undefined;
		await onSave(nodeId, text.trim(), isFinal, formula);
		setSaving(false);
		setText("");
		setIsFinal(false);
		setFormulaStr("");
		setFormulaNotes("");
		onCancel();
	};

	return (
		<div className="p-3 rounded-lg border border-[#0A52EF]/30 bg-card space-y-3">
			<Input
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder='e.g. "Indoor", "Outdoor", "1.5mm"'
				className="h-9 text-sm"
				autoFocus
				onKeyDown={(e) => { if (e.key === "Enter" && !isFinal) save(); if (e.key === "Escape") onCancel(); }}
			/>

			<label className="flex items-center gap-2 cursor-pointer">
				<input
					type="checkbox"
					checked={isFinal}
					onChange={(e) => setIsFinal(e.target.checked)}
					className="rounded border-border accent-[#0A52EF]"
				/>
				<span className="text-xs text-foreground font-medium">Final (has pricing formula)</span>
			</label>

			{isFinal && (
				<div className="space-y-2 p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
					<div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
						<Calculator className="w-3.5 h-3.5" />
						Pricing Formula
					</div>
					<Input
						value={formulaStr}
						onChange={(e) => setFormulaStr(e.target.value)}
						placeholder='e.g. "base_cost * sqft + 50"'
						className="h-8 text-sm font-mono"
					/>
					<div className="flex gap-2">
						<Input
							value={formulaUnit}
							onChange={(e) => setFormulaUnit(e.target.value)}
							placeholder="Unit"
							className="h-8 text-sm w-24"
						/>
						<Input
							value={formulaNotes}
							onChange={(e) => setFormulaNotes(e.target.value)}
							placeholder="Notes (optional)"
							className="h-8 text-sm flex-1"
						/>
					</div>
				</div>
			)}

			<div className="flex gap-2">
				<Button size="sm" className="h-8 bg-[#0A52EF] hover:bg-[#0A52EF]/90" onClick={save} disabled={saving || !text.trim()}>
					{saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add Option"}
				</Button>
				<Button size="sm" variant="ghost" className="h-8" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</div>
	);
}
