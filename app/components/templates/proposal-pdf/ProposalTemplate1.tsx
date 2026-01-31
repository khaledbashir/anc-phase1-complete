import React from "react";

// Components
import ProposalLayout from './ProposalLayout';
import LogoSelectorServer from '@/app/components/reusables/LogoSelectorServer';

// Helpers
import { formatNumberWithCommas, isDataUrl } from "@/lib/helpers";
import { generateSOWContent } from '@/lib/sowTemplate';
import { convertToLineItems, ScreenItem } from '@/lib/groupedPricing';

// Variables
import { DATE_OPTIONS } from "@/lib/variables";

// Types
import { ProposalType } from "@/types";

const ProposalTemplate1 = (data: ProposalType) => {
	const { sender, receiver, details } = data;
	const isLOI = (details as any).documentType === "LOI";
	const pricingType = (details as any).pricingType;
	const docLabel = isLOI ? "SALES QUOTATION" : pricingType === "Hard Quoted" ? "SALES QUOTATION" : "BUDGET ESTIMATE";

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
	// Detect Options/Alternates (items starting with "Option")
	const optionsItems = displayLineItems.filter(i => i.name.startsWith("Option") || i.name.startsWith("Alternates"));
	const mainItems = displayLineItems.filter(i => !i.name.startsWith("Option") && !i.name.startsWith("Alternates"));

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
				<p className='text-zinc-600 text-[11px] leading-relaxed text-justify' style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>
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
					{mainItems.map((item, index) => (
						<div key={index} className='flex justify-between items-center py-2 px-2 odd:bg-white even:bg-zinc-50 border-b border-zinc-100'>
							<div className='text-[10px] text-zinc-700 font-medium' style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>
								<div className="font-bold text-black uppercase">{item.name}</div>
								<div className="text-zinc-500">{item.description}</div>
							</div>
							<div className='text-[10px] font-bold text-zinc-900'>
								${formatNumberWithCommas(Math.round(item.total))}
							</div>
						</div>
					))}
				</div>

				{/* SUBTOTAL, TAX, TOTAL FOR MAIN ITEMS */}
				<div className="mt-2 space-y-1">
					<div className="flex justify-between items-center">
						<div className="text-right w-full text-[10px] font-bold mr-4 text-zinc-500" style={{ fontFamily: "Work Sans, sans-serif" }}>SUBTOTAL:</div>
						<div className="text-[10px] font-bold text-zinc-700 min-w-[80px] text-right">
							${formatNumberWithCommas(Math.round(Number(details?.subTotal || 0)))}
						</div>
					</div>
					<div className="flex justify-between items-center">
						<div className="text-right w-full text-[10px] font-bold mr-4 text-zinc-400 italic" style={{ fontFamily: "Work Sans, sans-serif" }}>TAX (9.5%):</div>
						<div className="text-[10px] font-bold text-zinc-400 min-w-[80px] text-right">
							${formatNumberWithCommas(Math.round(Number(details?.subTotal || 0) * 0.095))}
						</div>
					</div>
					<div className="flex justify-between items-center pt-1 border-t-2 border-black">
						<div className="text-right w-full text-xs font-bold mr-4" style={{ fontFamily: "Work Sans, sans-serif" }}>PROJECT TOTAL:</div>
						<div className="text-xs font-bold text-[#0A52EF] min-w-[80px] text-right">
							${formatNumberWithCommas(Math.round(Number(details?.subTotal || 0) * 1.095))}
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
							<div className='text-[10px] text-zinc-700 font-medium' style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>
								{opt.description || opt.name}
							</div>
							<div className='text-[10px] font-bold text-zinc-900'>
								${formatNumberWithCommas(Math.round(opt.total))}
							</div>
						</div>
					</div>
					<div className="mt-2 space-y-1">
						<div className="flex justify-between items-center">
							<div className="text-right w-full text-[10px] font-bold mr-4 text-zinc-500" style={{ fontFamily: "Work Sans, sans-serif" }}>SUBTOTAL:</div>
							<div className="text-[10px] font-bold text-zinc-700 min-w-[80px] text-right">
								${formatNumberWithCommas(Math.round(opt.total))}
							</div>
						</div>
						<div className="flex justify-between items-center">
							<div className="text-right w-full text-[10px] font-bold mr-4 text-zinc-400 italic" style={{ fontFamily: "Work Sans, sans-serif" }}>TAX (9.5%):</div>
							<div className="text-[10px] font-bold text-zinc-400 min-w-[80px] text-right">
								${formatNumberWithCommas(Math.round(opt.total * 0.095))}
							</div>
						</div>
						<div className="flex justify-between items-center pt-1 border-t-2 border-black">
							<div className="text-right w-full text-xs font-bold mr-4" style={{ fontFamily: "Work Sans, sans-serif" }}>OPTION TOTAL:</div>
							<div className="text-xs font-bold text-[#0A52EF] min-w-[80px] text-right">
								${formatNumberWithCommas(Math.round(opt.total * 1.095))}
							</div>
						</div>
					</div>
				</div>
			))}

			{/* PAYMENT TERMS */}
			<div className='px-8 mb-12'>
				<h4 className='text-xs font-bold text-black mb-2' style={{ fontFamily: "Work Sans, sans-serif" }}>Payment Terms:</h4>
				<ul className='list-disc pl-4 space-y-1'>
					<li className='text-[10px] text-zinc-700' style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>50% on Deposit</li>
					<li className='text-[10px] text-zinc-700' style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>40% on Mobilization</li>
					<li className='text-[10px] text-zinc-700' style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>10% on Substantial Completion</li>
				</ul>
				<p className="text-[10px] text-zinc-600 mt-4 leading-relaxed text-justify" style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>
					Please sign below to indicate Purchaser’s agreement to purchase the Display System as described herein and to authorize ANC to commence production.
					<br /><br />
					If, for any reason, Purchaser terminates this Agreement prior to the completion of the work, ANC will immediately cease all work and Purchaser will pay ANC for any work performed, work in progress, and materials purchased, if any. This document will be considered binding on both parties; however, it will be followed by a formal agreement containing standard contract language, including terms of liability, indemnification, and warranty. Additional sales tax will be included in ANC’s proposal. Payment is due within thirty (30) days of ANC’s proposal(s).
				</p>
			</div>

			{/* PAGE BREAK FOR SPECS */}
			<div className="break-before-page px-8 pt-8">
				<div className="text-center mb-8">
					<h2 className="text-[#0A52EF] font-bold text-lg uppercase" style={{ fontFamily: "Work Sans, sans-serif" }}>{receiver?.name || 'CLIENT'}</h2>
					<h3 className="text-zinc-500 text-sm uppercase tracking-widest" style={{ fontFamily: "Work Sans, sans-serif" }}>SPECIFICATIONS</h3>
				</div>

				<div className="space-y-8">
					{(() => {
						return (details?.screens || []).map((screen: any, idx: number) => (
							<div key={idx} className="break-inside-avoid">
								<h4 className="text-xs font-bold mb-1" style={{ fontFamily: "Work Sans, sans-serif" }}>{screen.name}</h4>
								<div className="w-full border-t border-black">
									<div className="flex justify-between items-center py-1 border-b border-zinc-200">
										<span className="text-[9px] font-bold pl-2" style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>MM Pitch</span>
										<span className="text-[9px] pr-2 text-right min-w-[100px]">{screen.pitchMm || screen.pixelPitch || 0}mm</span>
									</div>
									{screen.brightness && (
										<div className="flex justify-between items-center py-1 bg-zinc-100 border-b border-zinc-200">
											<span className="text-[9px] font-bold pl-2" style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>Brightness</span>
											<span className="text-[9px] pr-2 text-right min-w-[100px]">{screen.brightness}</span>
										</div>
									)}
									<div className="flex justify-between items-center py-1 bg-zinc-100 border-b border-zinc-200">
										<span className="text-[9px] font-bold pl-2" style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>Quantity</span>
										<span className="text-[9px] pr-2 text-right min-w-[100px]">{screen.quantity || 1}</span>
									</div>
									<div className="flex justify-between items-center py-1 border-b border-zinc-200">
										<span className="text-[9px] font-bold pl-2" style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>Active Display Height (ft.)</span>
										<span className="text-[9px] pr-2 text-right min-w-[100px]">{Number(screen.heightFt ?? screen.height ?? 0).toFixed(2)}'</span>
									</div>
									<div className="flex justify-between items-center py-1 bg-zinc-100 border-b border-zinc-200">
										<span className="text-[9px] font-bold pl-2" style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>Active Display Width (ft.)</span>
										<span className="text-[9px] pr-2 text-right min-w-[100px]">{Number(screen.widthFt ?? screen.width ?? 0).toFixed(2)}'</span>
									</div>
									<div className="flex justify-between items-center py-1 border-b border-zinc-200">
										<span className="text-[9px] font-bold pl-2" style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>Pixel Resolution (H)</span>
										<span className="text-[9px] pr-2 text-right min-w-[100px]">{screen.pixelsH || Math.round((Number(screen.heightFt ?? 0) * 304.8) / (screen.pitchMm || 10)) || 0} p</span>
									</div>
									<div className="flex justify-between items-center py-1 bg-zinc-100 border-b border-black">
										<span className="text-[9px] font-bold pl-2" style={{ fontFamily: "Helvetica Condensed, sans-serif" }}>Pixel Resolution (W)</span>
										<span className="text-[9px] pr-2 text-right min-w-[100px]">{screen.pixelsW || Math.round((Number(screen.widthFt ?? 0) * 304.8) / (screen.pitchMm || 10)) || 0} p</span>
									</div>
								</div>
							</div>
						));
					})()}
				</div>
			</div>

			{/* SOW Page - MUST COME BEFORE SIGNATURES */}
			{details?.additionalNotes && details?.additionalNotes.length > 50 && (
				<div className="break-before-page px-8 pt-8">
					<div className="text-center mb-8">
						<h2 className="text-[#0A52EF] font-bold text-lg uppercase" style={{ fontFamily: "Work Sans, sans-serif" }}>{receiver?.name || 'CLIENT'}</h2>
						<h3 className="text-zinc-500 text-sm uppercase tracking-widest" style={{ fontFamily: "Work Sans, sans-serif" }}>STATEMENT OF WORK</h3>
					</div>

					<div className="space-y-6">
						{generateSOWContent(details.additionalNotes).map((section: any, idx: number) => (
							<div key={idx} className="break-inside-avoid">
								<h4 className="bg-black text-white text-[10px] font-bold py-1 px-2 mb-2" style={{ fontFamily: "Work Sans, sans-serif" }}>{section.title}</h4>
								<div className="text-[10px] leading-relaxed text-zinc-700 px-2 whitespace-pre-wrap" style={{ fontFamily: "Helvetica Condensed, Arial, sans-serif" }}>
									{section.content}
								</div>
							</div>
						))}

						<div className="break-inside-avoid">
							<h4 className="bg-black text-white text-[10px] font-bold py-1 px-2 mb-2" style={{ fontFamily: "Work Sans, sans-serif" }}>ELECTRICAL & DATA INSTALLATION</h4>
							<div className="text-[10px] leading-relaxed text-zinc-700 px-2 whitespace-pre-wrap" style={{ fontFamily: "Helvetica Condensed, Arial, sans-serif" }}>
								ANC assumes primary power feed will be provided by others or is existing, within 5' of the display location with sufficient amps for ANC proposed display(s); typically 208v 3-phase.
								<br />
								ANC assumes all secondary power distribution, which may include breaker panels, disconnects, pathway, etc. may be included in this ROM Estimate.
								<br />
								ANC assumes all data pathway is provided by others or is existing, but ANC will provide data cabling and labor to pull cable form control location to the display(s).
							</div>
						</div>

						<div className="break-inside-avoid">
							<h4 className="bg-black text-white text-[10px] font-bold py-1 px-2 mb-2" style={{ fontFamily: "Work Sans, sans-serif" }}>CONTROL SYSTEM</h4>
							<div className="text-[10px] leading-relaxed text-zinc-700 px-2 whitespace-pre-wrap" style={{ fontFamily: "Helvetica Condensed, Arial, sans-serif" }}>
								ANC has provided display processors only. Content creation studio and content delivery system is not included at this time.
								<br />
								ANC will provide appropriate on-site operation and Maintenance Training.
							</div>
						</div>

						<div className="break-inside-avoid">
							<h4 className="bg-black text-white text-[10px] font-bold py-1 px-2 mb-2" style={{ fontFamily: "Work Sans, sans-serif" }}>GENERAL CONDITIONS</h4>
							<div className="text-[10px] leading-relaxed text-zinc-700 px-2 whitespace-pre-wrap" style={{ fontFamily: "Helvetica Condensed, Arial, sans-serif" }}>
								ANC has provided a parts only warranty, excluding on-site labor, on all products consistent with the factory supplier and/or 3rd party vendor. Warranty Terms and Conditions to be defined.
								<br />
								ANC has not included bonding of any kind.
								<br />
								ANC has not included any tax in the proposal. Any and all sales and use taxes, including, but not limited to, any import or associated duties, fees, tariffs as well other excises and other charges, including without limitation VAT/Sales Tax, ("collectively referred to as Government Charges") now or henceforth levied on any date in connection with the sale of the LED System shall be the full responsibility of the Purchaser. Purchaser shall reimburse ANC for any and all Government Charges ANC may advance on Purchaser's behalf. Purchaser acknowledges that neither ANC nor Purchaser may have advance knowledge of such Government Charges. ANC has excluded any and all taxes from the pricing in the enclosed proposal.
								<br />
								Shipping (Ocean Freight Shipping) included in quote at current shipping pricing. Shipping pricing is subject to change due to continued global impacts of the Covid pandemic. Any increase in costs will be responsibility of Purchaser. Current Ocean Freight timelines are approximately 6 weeks. Current Air Freight timelines are approximately 2 weeks.
							</div>
						</div>
					</div>
				</div>
			)}

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
		</ProposalLayout>
	);
};

export default ProposalTemplate1;
