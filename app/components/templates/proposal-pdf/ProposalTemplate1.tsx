import React from "react";

// Components
import ProposalLayout from './ProposalLayout';
import LogoSelectorServer from '@/app/components/reusables/LogoSelectorServer';

// Helpers
import { formatNumberWithCommas, isDataUrl, formatCurrencyForPdf } from "@/lib/helpers";
import { generateSOWContent } from '@/lib/sowTemplate';
import { convertToLineItems, ScreenItem } from '@/lib/groupedPricing';

// Variables
import { DATE_OPTIONS } from "@/lib/variables";
import ExhibitA_SOW from "./exhibits/ExhibitA_SOW";
import ExhibitB_CostSchedule from "./exhibits/ExhibitB_CostSchedule";

// Types
import { ProposalType } from "@/types";

const ProposalTemplate1 = (data: ProposalType) => {
	const { sender, receiver, details } = data;
	const isLOI = (details as any).documentType === "LOI";
	const pricingType = (details as any).pricingType;
	const docLabel = isLOI ? "SALES QUOTATION" : pricingType === "Hard Quoted" ? "SALES QUOTATION" : "BUDGET ESTIMATE";

	// REQ-125: Context-bound tax/bond rates (not hardcoded)
	const taxRate = (details as any)?.taxRateOverride ?? 0.095; // Default 9.5%
	const bondRate = (details as any)?.bondRateOverride ?? 0.015; // Default 1.5%
	const taxRatePercent = (taxRate * 100).toFixed(1);

	// Dynamic Intro Text (SAAS Platform Directive)
	const headerText = `This Sales Quotation will set forth the terms by which ${receiver?.name || 'Purchaser'} ("Purchaser") located at ${receiver?.address || '[Client Address]'} and ANC Sports Enterprises, LLC ("ANC") located at ${sender?.address || '2 Manhattanville Road, Suite 402, Purchase, NY 10577'} (collectively, the "Parties") agree that ANC will provide following LED Display and services (the "Display System") described below for ${details?.location || details?.proposalName || 'the project'}.`;

	// Group items logic
	const screensForGrouping: ScreenItem[] = (details?.screens || [])
		.filter((s: any) => {
			// Filter out empty/placeholder screens with 0 dimensions
			const width = s.widthFt ?? s.width ?? 0;
			const height = s.heightFt ?? s.height ?? 0;
			const pitch = s.pitchMm ?? s.pixelPitch ?? 0;
			return width > 0 && height > 0 && pitch > 0;
		})
		.map((s: any) => ({
			id: s.id || Math.random().toString(),
			name: s.name || "Display",
			group: s.name?.includes("-") ? s.name.split("-")[0].trim() : undefined,
			sellPrice: s.sellPrice || s.finalClientTotal || (s.lineItems || []).reduce((acc: number, li: any) => acc + (li.price || 0), 0) || 0,
			specs: {
				width: s.widthFt ?? s.width ?? 0,
				height: s.heightFt ?? s.height ?? 0,
				pitch: s.pitchMm ?? s.pixelPitch ?? 0,
				quantity: s.quantity || 1
			}
		}));

	const displayLineItems = convertToLineItems(screensForGrouping);
	const hasGroups = displayLineItems.some(i => i.isGroup);

	// REQ-User-Feedback: Construct SOW Options for Context Fusion
	const loc = (details?.location || "").toLowerCase();
	const name = (details?.proposalName || "").toLowerCase();
	const isMorgantown = loc.includes("morgantown") || loc.includes("wvu") || loc.includes("puskar") ||
		name.includes("morgantown") || name.includes("wvu") || name.includes("puskar");

	const sowOptions = {
		documentType: (details as any).documentType || (isLOI ? "LOI" : "BUDGET"),
		isOutdoor: (details?.screens || []).some((s: any) => s.isOutdoor || s.environment === "OUTDOOR"),
		includeUnionLabor: (details as any).includeUnionLabor || (details as any).isUnionLabor,
		includeSpareParts: (details as any).includeSpareParts,
		atticStockMentioned: (details as any).atticStockMentioned || (details?.additionalNotes || "").toLowerCase().includes("attic stock"),
		isMorgantown,
		structuralTonnage: (details as any).structuralTonnage || (details as any).metadata?.structuralTonnage,
		signalSupport: (details as any).signalSupport || (details as any).metadata?.signalSupport,
		rossCarbonite: (details as any).rossCarbonite || (details as any).metadata?.rossCarbonite,
		vdcpSupport: (details as any).vdcpSupport || (details as any).metadata?.vdcpSupport,
		projectSpecificNotes: details?.additionalNotes,
		clientName: receiver?.name,
		projectLocation: details?.location
	};

	// Detect Options/Alternates (items starting with "Option")
	const optionsItems = displayLineItems.filter(i => i.name.startsWith("Option") || i.name.startsWith("Alternates"));
	const mainItems = displayLineItems
		.filter(i => !i.name.startsWith("Option") && !i.name.startsWith("Alternates"))
		.filter(i => {
			// If we have groups (Package Pricing), hide ungrouped items that have $0 price
			// These are likely components of the package that didn't get grouped by name but are covered by the package price
			if (hasGroups && !i.isGroup && i.total === 0) return false;
			return true;
		});

	return (
		<ProposalLayout data={data}>
			{/* HEADER: Logo Left | Client Info Right */}
			<div className='flex justify-between items-start px-8 pt-8 pb-4'>
				<div className="w-[40%]">
					<LogoSelectorServer theme="light" width={160} height={80} />
				</div>
				<div className='w-[60%] text-right space-y-1'>
					<h2 className='text-xl font-bold text-[#0A52EF]' style={{ fontFamily: "Work Sans, sans-serif" }}>
						{receiver?.name || 'Client Name'}
					</h2>
					{(!receiver?.name || receiver?.name === 'CLIENT NAME') && (
						<h3 className='text-sm font-bold text-black' style={{ fontFamily: "Work Sans, sans-serif" }}>
							{details?.proposalName || 'Project'} LED Displays {docLabel}
						</h3>
					)}
				</div>
			</div>

			{/* HEADER TEXT */}
			<div className='px-8 mb-8'>
				<p className='text-zinc-600 text-[11px] leading-relaxed text-justify' style={{ fontFamily: "'Work Sans', sans-serif" }}>
					{headerText}
				</p>
			</div>

			{/* MAIN PRICING TABLE */}
			<div className='px-8 mb-8'>
				<div className='flex justify-between items-end border-b border-black pb-1 mb-0'>
					<h4 className='text-sm font-bold text-black' style={{ fontFamily: "Work Sans, sans-serif" }}>Project Total</h4>
					<h4 className='text-sm font-bold text-black' style={{ fontFamily: "Work Sans, sans-serif" }}>Pricing</h4>
				</div>

				<div className="w-full">
					{/* REQ-User-Feedback: Mirror Mode (Margin Analysis Structure) */}
					{(details as any)?.marginAnalysis && (details as any).marginAnalysis.length > 0 ? (
						(details as any).marginAnalysis.map((section: any, sIdx: number) => (
							<div key={sIdx} className="mb-4">
								{/* Section Header */}
								{section.name !== "General" && (
									<div className="bg-zinc-100 py-1 px-2 text-[10px] font-bold text-black uppercase border-y border-zinc-200 mt-2" style={{ fontFamily: "Work Sans, sans-serif" }}>
										{section.name}
									</div>
								)}
								{/* Section Items */}
								{section.items.map((item: any, iIdx: number) => (
									<div key={iIdx} className='flex justify-between items-center py-2 px-2 odd:bg-white even:bg-zinc-50 border-b border-zinc-100'>
										<div className='text-[10px] text-zinc-700 font-medium' style={{ fontFamily: "'Work Sans', sans-serif" }}>
											<div className="text-black uppercase">{item.name}</div>
										</div>
										<div className='text-[10px] font-bold text-zinc-900'>
											{item.isIncluded ? "INCLUDED" : formatCurrencyForPdf(Math.round(item.sellingPrice), "[PRICE MISSING]")}
										</div>
									</div>
								))}
							</div>
						))
					) : (
						/* Fallback to legacy grouping if no Margin Analysis */
						mainItems.map((item, index) => (
							<div key={index} className='flex justify-between items-center py-2 px-2 odd:bg-white even:bg-zinc-50 border-b border-zinc-100'>
								<div className='text-[10px] text-zinc-700 font-medium' style={{ fontFamily: "'Work Sans', sans-serif" }}>
									<div className="font-bold text-black uppercase">{item.name}</div>
									<div className="text-zinc-500">{item.description}</div>
								</div>
								<div className='text-[10px] font-bold text-zinc-900'>
									{formatCurrencyForPdf(Math.round(item.total), "INCLUDED")}
								</div>
							</div>
						))
					)}
				</div>

				{/* SUBTOTAL, BOND, B&O, TAX, TOTAL */}
				<div className="mt-2 space-y-1">
					{/* SUBTOTAL */}
					<div className="flex justify-between items-center">
						<div className="text-right w-full text-[10px] font-bold mr-4 text-zinc-500" style={{ fontFamily: "Work Sans, sans-serif" }}>SUBTOTAL:</div>
						<div className="text-[10px] font-bold text-zinc-700 min-w-[80px] text-right">
							{(() => {
								const subTotal = (details as any)?.marginAnalysis
									? (details as any).marginAnalysis.reduce((acc: number, s: any) => acc + s.subTotal, 0)
									: Number(details?.subTotal || 0);
								return `$${formatNumberWithCommas(Math.round(subTotal))}`;
							})()}
						</div>
					</div>

					{/* PERFORMANCE BOND */}
					<div className="flex justify-between items-center">
						<div className="text-right w-full text-[10px] font-bold mr-4 text-zinc-500" style={{ fontFamily: "Work Sans, sans-serif" }}>PERFORMANCE BOND ({(bondRate * 100).toFixed(1)}%):</div>
						<div className="text-[10px] font-bold text-zinc-700 min-w-[80px] text-right">
							{(() => {
								const subTotal = (details as any)?.marginAnalysis
									? (details as any).marginAnalysis.reduce((acc: number, s: any) => acc + s.subTotal, 0)
									: Number(details?.subTotal || 0);
								return `$${formatNumberWithCommas(Math.round(subTotal * bondRate))}`;
							})()}
						</div>
					</div>

					{/* B&O TAX (Conditional) */}
					{(() => {
						const subTotal = (details as any)?.marginAnalysis
							? (details as any).marginAnalysis.reduce((acc: number, s: any) => acc + s.subTotal, 0)
							: Number(details?.subTotal || 0);
						const bondCost = subTotal * bondRate;
						// Check for Morgantown/WVU triggers
						const loc = (details?.location || "").toLowerCase();
						const name = (details?.proposalName || "").toLowerCase();
						const isMorgantown = loc.includes("morgantown") || loc.includes("wvu") || loc.includes("puskar") ||
							name.includes("morgantown") || name.includes("wvu") || name.includes("puskar");
						const boTaxRate = (details as any)?.boTaxRate ?? (isMorgantown ? 0.02 : 0);

						if (boTaxRate > 0) {
							return (
								<div className="flex justify-between items-center">
									<div className="text-right w-full text-[10px] font-bold mr-4 text-zinc-500" style={{ fontFamily: "Work Sans, sans-serif" }}>
										B&O TAX (MORGANTOWN) ({(boTaxRate * 100).toFixed(1)}%):
									</div>
									<div className="text-[10px] font-bold text-zinc-700 min-w-[80px] text-right">
										${formatNumberWithCommas(Math.round((subTotal + bondCost) * boTaxRate))}
									</div>
								</div>
							);
						}
						return null;
					})()}

					{/* SALES TAX */}
					<div className="flex justify-between items-center">
						<div className="text-right w-full text-[10px] font-bold mr-4 text-zinc-400 italic" style={{ fontFamily: "Work Sans, sans-serif" }}>TAX ({taxRatePercent}%):</div>
						<div className="text-[10px] font-bold text-zinc-400 min-w-[80px] text-right">
							{(() => {
								const subTotal = (details as any)?.marginAnalysis
									? (details as any).marginAnalysis.reduce((acc: number, s: any) => acc + s.subTotal, 0)
									: Number(details?.subTotal || 0);
								const bondCost = subTotal * bondRate;
								const loc = (details?.location || "").toLowerCase();
								const name = (details?.proposalName || "").toLowerCase();
								const isMorgantown = loc.includes("morgantown") || loc.includes("wvu") || loc.includes("puskar") ||
									name.includes("morgantown") || name.includes("wvu") || name.includes("puskar");
								const boTaxRate = (details as any)?.boTaxRate ?? (isMorgantown ? 0.02 : 0);
								const boTaxCost = (subTotal + bondCost) * boTaxRate;

								return `$${formatNumberWithCommas(Math.round((subTotal + bondCost + boTaxCost) * taxRate))}`;
							})()}
						</div>
					</div>

					{/* PROJECT TOTAL */}
					<div className="flex justify-between items-center pt-1 border-t-2 border-black">
						<div className="text-right w-full text-xs font-bold mr-4" style={{ fontFamily: "Work Sans, sans-serif" }}>PROJECT TOTAL:</div>
						<div className="text-xs font-bold text-[#0A52EF] min-w-[80px] text-right">
							{(() => {
								const subTotal = (details as any)?.marginAnalysis
									? (details as any).marginAnalysis.reduce((acc: number, s: any) => acc + s.subTotal, 0)
									: Number(details?.subTotal || 0);
								const bondCost = subTotal * bondRate;
								const loc = (details?.location || "").toLowerCase();
								const name = (details?.proposalName || "").toLowerCase();
								const isMorgantown = loc.includes("morgantown") || loc.includes("wvu") || loc.includes("puskar") ||
									name.includes("morgantown") || name.includes("wvu") || name.includes("puskar");
								const boTaxRate = (details as any)?.boTaxRate ?? (isMorgantown ? 0.02 : 0);
								const boTaxCost = (subTotal + bondCost) * boTaxRate;
								const taxCost = (subTotal + bondCost + boTaxCost) * taxRate;

								return `$${formatNumberWithCommas(Math.round(subTotal + bondCost + boTaxCost + taxCost))}`;
							})()}
						</div>
					</div>
				</div>
			</div>

			{/* OPTIONS / ALTERNATES TABLES */}
			{optionsItems.length > 0 && optionsItems.map((opt, idx) => (
				<div key={idx} className='px-8 mb-6 break-inside-avoid'>
					<div className='flex justify-between items-end border-b border-black pb-1 mb-0'>
						<h4 className='text-sm font-bold text-black' style={{ fontFamily: "Work Sans, sans-serif" }}>{opt.name}</h4>
						<h4 className='text-sm font-bold text-black' style={{ fontFamily: "Work Sans, sans-serif" }}>Pricing</h4>
					</div>
					<div className="w-full">
						{/* If the option has sub-items in a real implementation we'd iterate them here. 
							For now, we render the single option line item as a subtotal-like row or detailed row.
							Based on screenshot "Year 3... Year 10" are rows. 
							Assuming 'opt' might be a group. If it's a flat item, we just show it. */}
						<div className='flex justify-between items-center py-1 px-2 bg-zinc-100'>
							<div className='text-[10px] text-zinc-700 font-medium' style={{ fontFamily: "'Work Sans', sans-serif" }}>
								{opt.description || opt.name}
							</div>
							<div className='text-[10px] font-bold text-zinc-900'>
								${formatNumberWithCommas(Math.round(opt.total))}
							</div>
						</div>
					</div>
					{/* REQ-125: Context-bound rates for options */}
					<div className="mt-2 space-y-1">
						<div className="flex justify-between items-center">
							<div className="text-right w-full text-[10px] font-bold mr-4 text-zinc-500" style={{ fontFamily: "Work Sans, sans-serif" }}>SUBTOTAL:</div>
							<div className="text-[10px] font-bold text-zinc-700 min-w-[80px] text-right">
								${formatNumberWithCommas(Math.round(opt.total))}
							</div>
						</div>
						<div className="flex justify-between items-center">
							<div className="text-right w-full text-[10px] font-bold mr-4 text-zinc-400 italic" style={{ fontFamily: "Work Sans, sans-serif" }}>TAX ({taxRatePercent}%):</div>
							<div className="text-[10px] font-bold text-zinc-400 min-w-[80px] text-right">
								${formatNumberWithCommas(Math.round(opt.total * taxRate))}
							</div>
						</div>
						<div className="flex justify-between items-center pt-1 border-t-2 border-black">
							<div className="text-right w-full text-xs font-bold mr-4" style={{ fontFamily: "Work Sans, sans-serif" }}>OPTION TOTAL:</div>
							<div className="text-xs font-bold text-[#0A52EF] min-w-[80px] text-right">
								${formatNumberWithCommas(Math.round(opt.total * (1 + taxRate)))}
							</div>
						</div>
					</div>
				</div>
			))}

			{/* PAYMENT TERMS */}
			<div className='px-8 mb-12'>
				<h4 className='text-xs font-bold text-black mb-2' style={{ fontFamily: "Work Sans, sans-serif" }}>Payment Terms:</h4>
				<div className='text-[10px] text-zinc-700 whitespace-pre-wrap' style={{ fontFamily: "'Work Sans', sans-serif" }}>
					{details.paymentTerms ? (
						<ul className='list-disc pl-4 space-y-1'>
							{details.paymentTerms.split(',').map((term, idx) => (
								<li key={idx}>{term.trim()}</li>
							))}
						</ul>
					) : (
						<ul className='list-disc pl-4 space-y-1'>
							<li>50% on Deposit</li>
							<li>40% on Mobilization</li>
							<li>10% on Substantial Completion</li>
						</ul>
					)}
				</div>
				<p className="text-[10px] text-zinc-600 mt-4 leading-relaxed text-justify" style={{ fontFamily: "'Work Sans', sans-serif" }}>
					Please sign below to indicate Purchaser’s agreement to purchase the Display System as described herein and to authorize ANC to commence production.
					<br /><br />
					If, for any reason, Purchaser terminates this Agreement prior to the completion of the work, ANC will immediately cease all work and Purchaser will pay ANC for any work performed, work in progress, and materials purchased, if any. This document will be considered binding on both parties; however, it will be followed by a formal agreement containing standard contract language, including terms of liability, indemnification, and warranty. Additional sales tax will be included in ANC’s proposal. Payment is due within thirty (30) days of ANC’s proposal(s).
				</p>
			</div>
			{/* SIGNATURES - STRICTLY FINAL ELEMENT (REQ-119) */}
			{/* Uses break-inside-avoid to prevent orphaned signatures on blank page */}
			<div className="break-before-page px-8 pt-8 mb-8 break-inside-avoid">
				<h4 className='text-xs font-bold text-black mb-6' style={{ fontFamily: "Work Sans, sans-serif" }}>Agreed To And Accepted:</h4>

				<div className="grid grid-cols-2 gap-16">
					{/* ANC */}
					<div>
						<h5 className="text-[10px] text-zinc-500 mb-4 font-bold">ANC Sports Enterprises, LLC ("ANC")</h5>
						<p className="text-[9px] text-zinc-400 mb-8">
							2 Manhattanville Road, Suite 402<br />
							Purchase, NY 10577
						</p>
						<div className="space-y-6">
							<div className="flex items-end gap-2 border-b border-black pb-1">
								<span className="text-[10px] font-bold w-8">By:</span>
								<span className="flex-1"></span>
							</div>
							<div className="flex items-end gap-2 border-b border-black pb-1">
								<span className="text-[10px] font-bold w-8">Title:</span>
								<span className="flex-1"></span>
							</div>
							<div className="flex items-end gap-2 border-b border-black pb-1">
								<span className="text-[10px] font-bold w-8">Date:</span>
								<span className="flex-1"></span>
							</div>
						</div>
					</div>

					{/* CLIENT */}
					<div>
						<h5 className="text-[10px] text-zinc-500 mb-4 font-bold">{receiver?.name || 'Purchaser'} ("Purchaser")</h5>
						<p className="text-[9px] text-zinc-400 mb-8">
							{receiver?.address || 'Address Line 1'}<br />
							{receiver?.city || 'City'}, {receiver?.zipCode || 'Zip'}
						</p>
						<div className="space-y-6">
							<div className="flex items-end gap-2 border-b border-black pb-1">
								<span className="text-[10px] font-bold w-8">By:</span>
								<span className="flex-1"></span>
							</div>
							<div className="flex items-end gap-2 border-b border-black pb-1">
								<span className="text-[10px] font-bold w-8">Title:</span>
								<span className="flex-1"></span>
							</div>
							<div className="flex items-end gap-2 border-b border-black pb-1">
								<span className="text-[10px] font-bold w-8">Date:</span>
								<span className="flex-1"></span>
							</div>
						</div>
					</div>
				</div>

				{/* Legal Footer - Ensures context before signatures */}
				<div className="mt-12 pt-4 border-t border-zinc-200">
					<p className="text-[8px] text-zinc-400 text-center italic">
						This document constitutes a binding agreement upon signature by both parties.
						© {new Date().getFullYear()} ANC Sports Enterprises, LLC. All Rights Reserved.
					</p>
				</div>
			</div>

			{/* EXHIBIT A: SOW & TECH SPECS (AUTO-GENERATED) */}
			<div className="break-before-page px-8">
				<ExhibitA_SOW data={data} />
			</div>

			{/* EXHIBIT B: COST SCHEDULE (AUTO-GENERATED) */}
			<div className="break-before-page px-8">
				<ExhibitB_CostSchedule data={data} />
			</div>
		</ProposalLayout>
	);
};

export default ProposalTemplate1;
