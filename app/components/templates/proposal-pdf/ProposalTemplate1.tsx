import React from "react";

// Components
import { ProposalLayout } from "@/app/components";

// Helpers
import { formatNumberWithCommas, isDataUrl } from "@/lib/helpers";

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
		? `This Sales Quotation will set forth the terms by which ${receiver.name} (“Purchaser”) located at ${receiver.address || '[Client Address]'} and ANC Sports Enterprises, LLC (“ANC”) located at 2 Manhattanville Road, Suite 402, Purchase, NY 10577 (collectively, the “Parties”) agree that ANC will provide the following LED Display and services (the “Display System”) described below.`
		: pricingType === "Hard Quoted"
			? `ANC is pleased to present the following LED Display proposal to ${details.proposalName || 'your project'} per the specifications and pricing below.`
			: `ANC is pleased to present the following LED Display budget to ${details.proposalName || 'your project'} per the specifications and pricing below.`;

	// Logo Hierarchy: Use White Logo if the header is French Blue, Blue Logo if White.
	// For Template 1, we use a White background header, so we use the Blue Logo.
	const logoPath = "/anc-logo-blue-2023.png";

	return (
		<ProposalLayout data={data}>
			<div className='flex justify-between items-start'>
				<div className="flex flex-col gap-2">
					<img
						src={logoPath}
						width={160}
						height={80}
						className="object-contain"
						alt="ANC Logo"
					/>
				</div>
				<div className='text-right'>
					<h2 className='text-3xl md:text-3xl font-bold text-[#0A52EF]' style={{ fontFamily: "Work Sans, sans-serif" }}>{docLabel}</h2>
					<span className='mt-1 block text-zinc-500 font-medium tracking-tight'>#{details.proposalId ?? details.invoiceNumber}</span>
				</div>
			</div>

			<div className='mt-8 pt-6 border-t border-zinc-100'>
				<p className='text-zinc-800 leading-relaxed text-sm' style={{ fontFamily: "Helvetica Condensed, Arial, sans-serif" }}>{headerText}</p>
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
							<dt className='col-span-3 font-semibold text-gray-800'>Invoice date:</dt>
							<dd className='col-span-3 text-gray-500'>
								{new Date(details.proposalDate ?? details.invoiceDate).toLocaleDateString("en-US", DATE_OPTIONS)}
							</dd>
						</dl>
						<dl className='grid sm:grid-cols-6 gap-x-3'>
							<dt className='col-span-3 font-semibold text-gray-800'>Due date:</dt>
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
						{details.items.map((item, index) => (
							<div key={index} className='grid grid-cols-4 p-3 hover:bg-zinc-50/50 transition-colors'>
								<div className='col-span-3'>
									<p className='font-bold text-zinc-900 text-sm'>{item.name}</p>
									<p className='text-xs text-zinc-600 mt-1 leading-relaxed' style={{ fontFamily: "Helvetica Condensed, Arial, sans-serif" }}>{item.description}</p>
								</div>
								<div className='text-right flex flex-col justify-center'>
									<p className='text-sm font-bold text-zinc-900'>
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
					{details.screens?.map((screen: any, idx: number) => (
						<div key={idx} className='p-4 border border-zinc-100 rounded-xl bg-zinc-50/30'>
							<p className='font-bold text-zinc-900 mb-3 text-sm border-b border-zinc-100 pb-2'>{screen.name}</p>
							<div className='space-y-2'>
								<div className='flex justify-between text-xs'>
									<span className='text-zinc-500'>Pitch:</span>
									<span className='font-bold text-zinc-800'>{screen.pitchMm}mm</span>
								</div>
								<div className='flex justify-between text-xs'>
									<span className='text-zinc-500'>Dimensions:</span>
									<span className='font-bold text-zinc-800'>{screen.heightFt}'h x {screen.widthFt}'w</span>
								</div>
								{(screen.pixelsH && screen.pixelsW) && (
									<div className='flex justify-between text-xs'>
										<span className='text-zinc-500'>Resolution:</span>
										<span className='font-bold text-zinc-800'>{screen.pixelsH}h x {screen.pixelsW}w</span>
									</div>
								)}
								{(screen.brightness && screen.brightness !== "0" && screen.brightness !== "") && (
									<div className='flex justify-between text-xs'>
										<span className='text-zinc-500'>Brightness:</span>
										<span className='font-bold text-zinc-800'>{screen.brightness} nits</span>
									</div>
								)}
							</div>
						</div>
					))}
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
						{details.discountDetails?.amount != undefined &&
							details.discountDetails?.amount > 0 && (
								<dl className='grid sm:grid-cols-5 gap-x-3'>
									<dt className='col-span-3 font-semibold text-gray-800'>Discount:</dt>
									<dd className='col-span-2 text-gray-500'>
										{details.discountDetails.amountType === "amount"
											? `- ${details.discountDetails.amount} ${details.currency}`
											: `- ${details.discountDetails.amount}%`}
									</dd>
								</dl>
							)}
						{details.taxDetails?.amount != undefined && details.taxDetails?.amount > 0 && (
							<dl className='grid sm:grid-cols-5 gap-x-3'>
								<dt className='col-span-3 font-semibold text-gray-800'>Tax:</dt>
								<dd className='col-span-2 text-gray-500'>
									{details.taxDetails.amountType === "amount"
										? `+ ${details.taxDetails.amount} ${details.currency}`
										: `+ ${details.taxDetails.amount}%`}
								</dd>
							</dl>
						)}
						{details.shippingDetails?.cost != undefined && details.shippingDetails?.cost > 0 && (
							<dl className='grid sm:grid-cols-5 gap-x-3'>
								<dt className='col-span-3 font-semibold text-gray-800'>Shipping:</dt>
								<dd className='col-span-2 text-gray-500'>
									{details.shippingDetails.costType === "amount"
										? `+ ${details.shippingDetails.cost} ${details.currency}`
										: `+ ${details.shippingDetails.cost}%`}
								</dd>
							</dl>
						)}
						<dl className='grid sm:grid-cols-5 gap-x-3'>
							<dt className='col-span-3 font-semibold text-gray-800'>Total:</dt>
							<dd className='col-span-2 text-gray-500'>
								{formatNumberWithCommas(Number(details.totalAmount))} {details.currency}
							</dd>
						</dl>
						{details.totalAmountInWords && (
							<dl className='grid sm:grid-cols-5 gap-x-3'>
								<dt className='col-span-3 font-semibold text-gray-800'>Total in words:</dt>
								<dd className='col-span-2 text-gray-500'>
									<em>
										{details.totalAmountInWords} {details.currency}
									</em>
								</dd>
							</dl>
						)}
					</div>
				</div>
			</div>

			{isLOI && (
				<div className='mt-12'>
					<div className='p-6 bg-zinc-50 rounded-xl border border-zinc-100'>
						<p className='text-xs font-bold text-[#0A52EF] uppercase tracking-widest mb-4' style={{ fontFamily: "Work Sans, sans-serif" }}>Agreement Terms</p>
						<p className='text-[11px] text-zinc-600 leading-relaxed mb-6' style={{ fontFamily: "Helvetica Condensed, Arial, sans-serif" }}>
							Please sign below to indicate Purchaser's agreement to purchase the Work as described herein and to authorize ANC to commence production.
							<br /><br />
							If, for any reason, Purchaser terminates this Agreement prior to the completion of the work, ANC will immediately cease all work and Purchaser will pay ANC for any work performed, work in progress, and materials purchased, if any. This document will be considered binding on both parties; however, it will be followed by a formal agreement containing standard contract language, including terms of liability, indemnification, and warranty. Additional sales tax will be included in ANC’s invoice. Payment is due within thirty (30) days of ANC’s invoice(s).
						</p>

						<div className='grid grid-cols-2 gap-12 mt-10'>
							<div className='space-y-6'>
								<div>
									<p className='text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1'>Provider</p>
									<p className='text-sm font-bold text-zinc-900'>ANC Sports Enterprises, LLC</p>
								</div>
								<div className='border-b border-zinc-300 h-10 flex items-end pb-1 text-xs text-zinc-400 italic'>Signature:</div>
								<div className='border-b border-zinc-300 h-10 flex items-end pb-1 text-xs text-zinc-400 italic'>Date:</div>
							</div>
							<div className='space-y-6'>
								<div>
									<p className='text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1'>Purchaser</p>
									<p className='text-sm font-bold text-zinc-900'>{receiver.name}</p>
								</div>
								<div className='border-b border-zinc-300 h-10 flex items-end pb-1 text-xs text-zinc-400 italic'>Signature:</div>
								<div className='border-b border-zinc-300 h-10 flex items-end pb-1 text-xs text-zinc-400 italic'>Date:</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</ProposalLayout>
	);
};

export default ProposalTemplate1;
