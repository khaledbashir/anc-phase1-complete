import React from "react";

// Components
import ProposalLayout from './ProposalLayout';
import LogoSelector from '@/app/components/reusables/LogoSelector';

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
	const docLabel = isLOI ? "SALES QUOTATION" : pricingType === "Hard Quoted" ? "PROPOSAL" : "BUDGET";

	const headerText = isLOI
		? `This Sales Quotation sets forth the terms by which ${receiver.name} (“Purchaser”) located at ${receiver.address || '[Client Address]'} and ANC Sports Enterprises, LLC (“ANC”) located at 2 Manhattanville Road, Suite 402, Purchase, NY 10577 agree that ANC will provide the following Display System.`
		: pricingType === "Hard Quoted"
			? `ANC is pleased to present the following LED Display proposal to ${details.proposalName || 'your project'} per the specifications and pricing below.`
			: `ANC is pleased to present the following LED Display budget to ${details.proposalName || 'your project'} per the specifications and pricing below.`;
	// Group items if they have names that suggest they belong together
	// This logic runs client-side to keep the PDF dynamic
	const screensForGrouping: ScreenItem[] = (details.screens || []).map((s: any) => ({
		id: s.id || Math.random().toString(),
		name: s.name,
		group: s.name.includes("-") ? s.name.split("-")[0].trim() : undefined,
		sellPrice: s.sellPrice || s.finalClientTotal || 0, // Fallback for sell price
		specs: {
			width: s.widthFt ?? s.width ?? 0,
			height: s.heightFt ?? s.height ?? 0
		}
	}));

	const displayLineItems = convertToLineItems(screensForGrouping);

	// Fallback if no screens (e.g. manual items only)
	const itemsToRender: any[] = displayLineItems.length > 0 ? displayLineItems : details.items;

	return (
		<ProposalLayout data={data}>
			<div className='flex justify-between items-start'>
				{/* Logo with Clear Space (2rem padding per ANC Guidelines) */}
				<div className="flex flex-col gap-2 p-8">
					<LogoSelector theme="light" width={180} height={90} />
				</div>
				<div className='text-right'>
					<h2 className='text-3xl font-bold text-[#0A52EF]' style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 700 }}>{docLabel}</h2>
					<span className='mt-2 block text-zinc-500 font-medium tracking-tight text-sm'>#{details.proposalId ?? 'DRAFT'}</span>
				</div>
			</div>

			<div className='mt-10 pt-6 border-t border-zinc-200'>
				<p className='text-zinc-700 leading-relaxed text-sm max-w-3xl' style={{ fontFamily: "'Helvetica Condensed', 'Arial Narrow', Arial, sans-serif" }}>{headerText}</p>
			</div>

			<div className='mt-6 grid sm:grid-cols-2 gap-3'>
				<div>
					<h3 className='text-sm uppercase tracking-widest font-bold text-[#0A52EF] mb-2' style={{ fontFamily: "Montserrat, sans-serif" }}>Prepared For</h3>
					<h3 className='text-xl font-bold text-gray-900'>{receiver.name}</h3>
					{ }
					<address className='mt-2 not-italic text-gray-500'>
						{receiver.address && receiver.address.length > 0 ? receiver.address : null}
						{receiver.zipCode && receiver.zipCode.length > 0 ? `, ${receiver.zipCode}` : null}
						<br />
						{receiver.city}, {receiver.country}
						<br />
					</address>
				</div>
				<div className='sm:text-right space-y-2'>
					<div className='grid grid-cols-2 sm:grid-cols-1 gap-3 sm:gap-2'>
						<dl className='grid sm:grid-cols-6 gap-x-3'>
							<dt className='col-span-3 font-semibold text-gray-800'>Proposal Date:</dt>
							<dd className='col-span-3 text-gray-500'>
								{new Date(details.proposalDate ?? new Date()).toLocaleDateString("en-US", DATE_OPTIONS)}
							</dd>
						</dl>
						<dl className='grid sm:grid-cols-6 gap-x-3'>
							<dt className='col-span-3 font-semibold text-gray-800'>Valid Until:</dt>
							<dd className='col-span-3 text-gray-500'>
								{new Date(details.dueDate).toLocaleDateString("en-US", DATE_OPTIONS)}
							</dd>
						</dl>
					</div>
				</div>
			</div>

			<div className='mt-6'>
				<div className='border border-zinc-200 rounded-lg overflow-hidden'>
					<div className='grid grid-cols-4 bg-zinc-50 p-3'>
						<div className='col-span-3 text-xs font-bold text-[#0A52EF] uppercase tracking-widest' style={{ fontFamily: "Work Sans, sans-serif" }}>Item Description</div>
						<div className='text-right text-xs font-bold text-[#0A52EF] uppercase tracking-widest' style={{ fontFamily: "Work Sans, sans-serif" }}>Selling Price</div>
					</div>
					<div className='divide-y divide-zinc-200'>
						{itemsToRender.map((item, index) => (
							<div key={index} className={`grid grid-cols-4 p-3 hover:bg-zinc-50/50 transition-colors ${item.isGroup ? 'bg-blue-50/30' : ''}`}>
								<div className='col-span-3'>
									<p className={`text-zinc-900 text-sm ${item.isGroup ? 'font-bold text-[#0A52EF]' : 'font-semibold'}`}>{item.name}</p>
									<p className='text-xs text-zinc-600 mt-1 leading-relaxed' style={{ fontFamily: "Helvetica Condensed, Arial, sans-serif" }}>{item.description}</p>
								</div>
								<div className='text-right flex flex-col justify-center'>
									<p className={`text-sm text-zinc-900 ${item.isGroup ? 'font-bold' : 'font-medium'}`}>
										{formatNumberWithCommas(item.total)} {details.currency}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>


			<div className='mt-8'>
				<h3 className='text-sm font-bold text-[#0A52EF] uppercase tracking-widest mb-4' style={{ fontFamily: "Work Sans, sans-serif" }}>Physical Specifications</h3>
				<div className='grid sm:grid-cols-2 gap-4'>
					{(() => {
						// Group identical screens for spec display
						const specGroups = (details.screens || []).reduce((acc: any[], screen: any) => {
							const key = `${screen.widthFt}-${screen.heightFt}-${screen.pitchMm}-${screen.pixelsW}-${screen.pixelsH}`;
							const existing = acc.find(g => g.key === key);

							// Check if names are similar enough to group (e.g. "Main Display 1", "Main Display 2")
							// Or just use the first name found if they match specs
							if (existing) {
								existing.qty += (screen.quantity || 1);
								// If names differ significantly, maybe append? For now, keep the first name or common prefix
								const commonPrefix = screen.name.split('-')[0].trim();
								if (!existing.name.startsWith(commonPrefix)) {
									// If names are totally different but specs same, maybe keep separate? 
									// For strict grouping by specs:
								}
							} else {
								acc.push({
									key,
									name: screen.name,
									qty: screen.quantity || 1,
									heightFt: screen.heightFt ?? screen.height ?? 0,
									widthFt: screen.widthFt ?? screen.width ?? 0,
									pitchMm: screen.pitchMm ?? screen.pixelPitch ?? 0,
									...screen
								});
							}
							return acc;
						}, []);

						return specGroups.map((screen: any, idx: number) => (
							<div key={idx} className='p-4 border border-zinc-100 rounded-xl bg-zinc-50/30'>
								<p className='font-bold text-zinc-900 mb-3 text-sm border-b border-zinc-100 pb-2'>
									{screen.name} {screen.qty > 1 && <span className="text-[#0A52EF] ml-1">(Qty {screen.qty})</span>}
								</p>
								<div className='space-y-2'>
									<div className='flex justify-between text-xs'>
										<span className='text-zinc-500'>Pitch:</span>
										<span className='font-bold text-zinc-800'>{screen.pitchMm || 0}mm</span>
									</div>
									<div className='flex justify-between text-xs'>
										<span className='text-zinc-500'>Dimensions:</span>
										<span className='font-bold text-zinc-800'>{screen.heightFt}'h x {screen.widthFt}'w</span>
									</div>
									{(() => {
										// If explicit pixels are missing, try to compute them for the preview
										const h = screen.pixelsH || Math.round((screen.heightFt * 304.8) / (screen.pitchMm || 10));
										const w = screen.pixelsW || Math.round((screen.widthFt * 304.8) / (screen.pitchMm || 10));

										if (h > 0 && w > 0) {
											return (
												<div className='flex justify-between text-xs'>
													<span className='text-zinc-500'>Resolution:</span>
													<span className='font-bold text-zinc-800'>{h}h x {w}w</span>
												</div>
											);
										}
										return null;
									})()}
									{(screen.brightness && screen.brightness !== "0" && screen.brightness !== "" && String(screen.brightness).toUpperCase() !== 'N/A' && !String(screen.brightness).includes("Total SQ FT")) && (
										<div className='flex justify-between text-xs'>
											<span className='text-zinc-500'>Brightness:</span>
											<span className='font-bold text-zinc-800'>{screen.brightness} nits</span>
										</div>
									)}
								</div>
							</div>
						));
					})()}
				</div>
			</div>

			<div className='mt-8 flex sm:justify-end'>
				<div className='sm:text-right space-y-2'>
					<div className='grid grid-cols-2 sm:grid-cols-1 gap-3 sm:gap-2'>
						<dl className='grid sm:grid-cols-5 gap-x-3'>
							<dt className='col-span-3 font-semibold text-gray-800'>Subtotal:</dt>
							<dd className='col-span-2 text-gray-500'>
								{formatNumberWithCommas(Number(details.subTotal))} {details.currency}
							</dd>
						</dl>

						<dl className='grid sm:grid-cols-5 gap-x-3'>
							<dt className='col-span-3 font-semibold text-gray-800'>Total:</dt>
							<dd className='col-span-2 text-gray-500'>
								{formatNumberWithCommas(Number(details.totalAmount))} {details.currency}
							</dd>
						</dl>
					</div>
				</div>
			</div>

			{/* SOW Page (Page 7) */}
			<div className="break-before-page mt-12 pt-8 border-t border-zinc-200">
				<h3 className="text-lg font-bold text-[#0A52EF] mb-6 uppercase tracking-widest" style={{ fontFamily: "Work Sans, sans-serif" }}>
					Statement of Work & General Conditions
				</h3>
				<div className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-700 space-y-4" style={{ fontFamily: "Helvetica Condensed, Arial, sans-serif" }}>
					{generateSOWContent({
						includeUnionLabor: details.additionalNotes?.toLowerCase().includes("union"),
						includeReplacement: details.additionalNotes?.toLowerCase().includes("replacement")
					})}
				</div>
			</div>

			{/* Signature Block - 2 Column Layout */}
			<div className='mt-16 break-before-avoid'>
				<div className="grid grid-cols-2 gap-12">
					{/* Left: ANC */}
					<div>
						<h4 className="text-sm font-bold text-[#0A52EF] mb-4 uppercase tracking-wider">ANC Sports Enterprises, LLC</h4>
						<p className="text-[10px] text-zinc-500 mb-6">
							2 Manhattanville Road, Suite 402<br />
							Purchase, NY 10577
						</p>
						<div className="space-y-6">
							<div className="border-b border-zinc-300 pb-1">
								<span className="text-[10px] text-zinc-400 uppercase tracking-widest">By:</span>
							</div>
							<div className="border-b border-zinc-300 pb-1">
								<span className="text-[10px] text-zinc-400 uppercase tracking-widest">Name:</span>
							</div>
							<div className="border-b border-zinc-300 pb-1">
								<span className="text-[10px] text-zinc-400 uppercase tracking-widest">Title:</span>
							</div>
							<div className="border-b border-zinc-300 pb-1">
								<span className="text-[10px] text-zinc-400 uppercase tracking-widest">Date:</span>
							</div>
						</div>
					</div>

					{/* Right: Purchaser */}
					<div>
						<h4 className="text-sm font-bold text-[#0A52EF] mb-4 uppercase tracking-wider">Purchaser: {receiver.name || '[Client Name]'}</h4>
						<p className="text-[10px] text-zinc-500 mb-6">
							{receiver.address || '[Client Address]'}
						</p>
						<div className="space-y-6">
							<div className="border-b border-zinc-300 pb-1">
								<span className="text-[10px] text-zinc-400 uppercase tracking-widest">By:</span>
							</div>
							<div className="border-b border-zinc-300 pb-1">
								<span className="text-[10px] text-zinc-400 uppercase tracking-widest">Name:</span>
							</div>
							<div className="border-b border-zinc-300 pb-1">
								<span className="text-[10px] text-zinc-400 uppercase tracking-widest">Title:</span>
							</div>
							<div className="border-b border-zinc-300 pb-1">
								<span className="text-[10px] text-zinc-400 uppercase tracking-widest">Date:</span>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-8 text-center">
					<p className="text-[10px] text-zinc-400 italic">
						This document is confidential and proprietary to ANC Sports Enterprises, LLC.
					</p>
				</div>
			</div>
		</ProposalLayout>
	);
};

export default ProposalTemplate1;
