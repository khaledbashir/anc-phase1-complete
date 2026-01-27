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
		? `This Sales Quotation will set forth the terms by which ${receiver.name} (“Purchaser”) located at ${receiver.address}, ${receiver.zipCode} ${receiver.city}, ${receiver.country} and ANC Sports Enterprises, LLC (“ANC”) located at 2 Manhattanville Road, Suite 402, Purchase, NY 10577 (collectively, the “Parties”) agree that ANC will provide following LED Display and services (“the “Display System”) described below for the ${details.proposalName || 'your project'}.`
		: pricingType === "Hard Quoted"
			? `ANC is pleased to present the following LED Display proposal to ${details.proposalName || 'your project'} per the specifications and pricing below.`
			: `ANC is pleased to present the following LED Display budget to ${details.proposalName || 'your project'} per the specifications and pricing below.`;

	return (
		<ProposalLayout data={data}>
			<div className='flex justify-between'>
				<div className="flex flex-col gap-2">
					{(details.proposalLogo || details.invoiceLogo) ? (
						<img
							src={details.proposalLogo || details.invoiceLogo}
							width={160}
							height={80}
							className="object-contain"
							alt={`Logo of ${sender.name}`}
						/>
					) : (
						<img
							src="/anc-logo-blue.png"
							width={160}
							height={80}
							className="object-contain"
							alt="ANC Logo"
						/>
					)}
					<h1 className='text-xl md:text-2xl font-bold text-[#0A52EF]' style={{ fontFamily: "Montserrat, sans-serif" }}>{sender.name}</h1>
				</div>
				<div className='text-right'>
					<h2 className='text-3xl md:text-4xl font-bold text-[#0A52EF]' style={{ fontFamily: "Montserrat, sans-serif" }}>{docLabel}</h2>
					<span className='mt-2 block text-gray-600 font-semibold tracking-wider'>#{details.proposalId ?? details.invoiceNumber}</span>
					<address className='mt-4 not-italic text-gray-800'>
						{sender.address}
						<br />
						{sender.zipCode}, {sender.city}
						<br />
						{sender.country}
						<br />
					</address>
				</div>
			</div>

			<div className='mt-6 border-b border-gray-100 pb-4'>
				<p className='text-gray-700 leading-relaxed text-sm'>{headerText}</p>
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

			<div className='mt-3'>
				<div className='border border-gray-200 p-1 rounded-lg space-y-1'>
					<div className='hidden sm:grid sm:grid-cols-5 bg-[#f8fafc] p-2 rounded-t-lg'>
						<div className='sm:col-span-2 text-xs font-bold text-[#0A52EF] uppercase tracking-wider' style={{ fontFamily: "Montserrat, sans-serif" }}>Item Description</div>
						<div className='text-left text-xs font-bold text-[#0A52EF] uppercase tracking-wider' style={{ fontFamily: "Montserrat, sans-serif" }}>Qty</div>
						<div className='text-left text-xs font-bold text-[#0A52EF] uppercase tracking-wider' style={{ fontFamily: "Montserrat, sans-serif" }}>Rate</div>
						<div className='text-right text-xs font-bold text-[#0A52EF] uppercase tracking-wider' style={{ fontFamily: "Montserrat, sans-serif" }}>Amount</div>
					</div>
					<div className='hidden sm:block border-b border-gray-200'></div>
					<div className='grid grid-cols-3 sm:grid-cols-5 gap-y-1'>
						{details.items.map((item, index) => (
							<React.Fragment key={index}>
								<div className='col-span-full sm:col-span-2 border-b border-gray-300'>
									<p className='font-medium text-gray-800'>{item.name}</p>
									<p className='text-xs text-gray-600 whitespace-pre-line'>{item.description}</p>
								</div>
								<div className='border-b border-gray-300'>
									<p className='text-gray-800'>{item.quantity}</p>
								</div>
								<div className='border-b border-gray-300'>
									<p className='text-gray-800'>
										{item.unitPrice} {details.currency}
									</p>
								</div>
								<div className='border-b border-gray-300'>
									<p className='sm:text-right text-gray-800'>
										{item.total} {details.currency}
									</p>
								</div>
							</React.Fragment>
						))}
					</div>
					<div className='sm:hidden border-b border-gray-200'></div>
				</div>
			</div>

			<div className='mt-2 flex sm:justify-end'>
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

			{isLOI ? (
				<div className='mt-8 text-sm'>
					<div className='my-4 border-t border-gray-200 pt-4'>
						<p className='font-bold text-[#0A52EF] uppercase text-xs tracking-widest mb-2' style={{ fontFamily: "Montserrat, sans-serif" }}>Notes</p>
						<p className='text-gray-700 whitespace-pre-line'>{details.additionalNotes}</p>
					</div>

					<div className='my-4'>
						<p className='font-bold text-[#0A52EF] uppercase text-xs tracking-widest mb-2' style={{ fontFamily: "Montserrat, sans-serif" }}>Payment Terms</p>
						<p className='text-gray-700 whitespace-pre-line'>{details.paymentTerms}</p>
					</div>

					<div className='my-6 text-gray-700 leading-relaxed'>
						<p className='mb-4 text-xs font-semibold uppercase tracking-wider text-[#0A52EF]'>Legal Terms</p>
						<p className='mb-4'>Please sign below to indicate Purchaser’s agreement to purchase the Work as described herein and to authorize ANC to commence production.</p>
						<p>If, for any reason, Purchaser terminates this Agreement prior to the completion of the work, ANC will immediately cease all work and Purchaser will pay ANC for any work performed, work in progress, and materials purchased, if any. This document will be considered binding on both parties; however, it will be followed by a formal agreement containing standard contract language, including terms of liability, indemnification, and warranty. Additional sales tax will be included in ANC’s invoice. Payment is due within thirty (30) days of ANC’s invoice(s).</p>
					</div>

					<div className='mt-10'>
						<p className='font-bold text-gray-900 mb-6'>AGREED TO AND ACCEPTED:</p>
						<div className='grid grid-cols-2 gap-12'>
							<div className='space-y-4'>
								<div>
									<p className='font-bold text-xs text-[#0A52EF] uppercase tracking-tighter mb-1'>{sender.name}</p>
									<p className='text-[10px] text-gray-500 uppercase'>{sender.address}, {sender.city}</p>
								</div>
								<div className='border-b border-gray-300 h-8 flex items-end pb-1 text-xs text-gray-400'>By:</div>
								<div className='border-b border-gray-300 h-8 flex items-end pb-1 text-xs text-gray-400'>Title:</div>
								<div className='border-b border-gray-300 h-8 flex items-end pb-1 text-xs text-gray-400'>Date:</div>
							</div>
							<div className='space-y-4'>
								<div>
									<p className='font-bold text-xs text-[#0A52EF] uppercase tracking-tighter mb-1'>{receiver.name}</p>
									<p className='text-[10px] text-gray-500 uppercase'>{receiver.address || "TBD"}, {receiver.city || "TBD"}</p>
								</div>
								<div className='border-b border-gray-300 h-8 flex items-end pb-1 text-xs text-gray-400'>By:</div>
								<div className='border-b border-gray-300 h-8 flex items-end pb-1 text-xs text-gray-400'>Title:</div>
								<div className='border-b border-gray-300 h-8 flex items-end pb-1 text-xs text-gray-400'>Date:</div>
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className='mt-6'>
					<div className='my-4 border-t border-gray-200 pt-4'>
						<p className='font-bold text-[#0A52EF] uppercase text-xs tracking-widest mb-1' style={{ fontFamily: "Montserrat, sans-serif" }}>Additional Notes</p>
						<p className='text-gray-700 whitespace-pre-line'>{details.additionalNotes}</p>
					</div>
					<div className='my-2'>
						<p className='font-bold text-[#0A52EF] uppercase text-xs tracking-widest mb-1' style={{ fontFamily: "Montserrat, sans-serif" }}>Payment Terms</p>
						<p className='font-regular text-gray-700 leading-relaxed'>{details.paymentTerms}</p>
					</div>
				</div>
			)}
		</ProposalLayout>
	);
};

export default ProposalTemplate1;
