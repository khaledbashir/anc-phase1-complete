import React from "react";
import type { Proposal, ScreenConfig, CostLineItem } from "@prisma/client";

import { formatNumberWithCommas } from "@/lib/helpers";
import LogoSelector from "@/app/components/reusables/LogoSelector";

interface Props {
  proposal: Proposal & {
    screens: (ScreenConfig & { lineItems: CostLineItem[] })[];
  };
}

export default function SalesQuotation({ proposal }: Props) {
  const screens = proposal.screens || [];

  const computePixels = (height: number, width: number, pitch: number) => {
    if (!pitch || pitch <= 0) return { h: 0, w: 0, total: 0 };
    const pitchFeet = pitch / 304.8; // mm -> ft

    const pixelsHeight = Math.round(height / pitchFeet);
    const pixelsWidth = Math.round(width / pitchFeet);

    return { h: pixelsHeight, w: pixelsWidth, total: pixelsHeight * pixelsWidth };
  };

  const currency = "$";

  const screenSubtotal = (screen: (ScreenConfig & { lineItems: CostLineItem[] })) => {
    return screen.lineItems?.reduce((acc, li) => acc + (Number(li.price ?? 0)), 0) ?? 0;
  };

  const grandSubtotal = screens.reduce((acc, s) => acc + screenSubtotal(s), 0);

  const formatMoney = (n: number) => `${currency}${formatNumberWithCommas(n)}`;

  const isEmptyProposal = screens.length === 0;

  return (
    <div className="bg-zinc-950 min-h-screen py-8 print:bg-white print:py-0">
      {/* Page 1 - Specifications */}
      <div
        className="bg-white max-w-[816px] mx-auto mb-8 print:mb-0 print:shadow-none shadow-xl flex flex-col"
        style={{ minHeight: isEmptyProposal ? "11in" : "auto" }}
      >
        <div className="px-12 pt-10 pb-8 flex-1">
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b border-neutral-300">
            <LogoSelector theme="light" width={120} height={60} />
            <div className="text-right">
              <div className="text-[#1e3a5f] text-xl font-bold">{proposal.clientName}</div>
              <div className="text-[11px] text-neutral-500 tracking-[0.15em] font-medium">SALES QUOTATION</div>
            </div>
          </div>

          {/* Intro Text - Only show if screens exist */}
          {screens.length > 0 && (
            <p className="text-[11px] text-neutral-600 leading-relaxed mt-6 mb-8 text-justify">
              This Sales Quotation will set forth the terms by which {proposal.clientName} ("Purchaser"), and ANC Sports
              Enterprises, LLC, located at 2 Manhattanville Road, Suite 402, Purchase, NY 10577 ("ANC") (collectively, as
              "Parties") agree that ANC will provide LED Displays ("Display System") for Stadium, as described below.
            </p>
          )}

          {/* Empty State - Branded placeholder */}
          {isEmptyProposal && (
            <div className="flex-1 flex flex-col items-center justify-center py-16">
              <div className="text-center">
                <div className="text-[#1e3a5f] text-6xl font-black tracking-tight mb-4" style={{ fontFamily: "Arial Black, sans-serif" }}>
                  ANC
                </div>
                <p className="text-neutral-500 text-sm mb-2">Sports Enterprises, LLC</p>
                <div className="w-24 h-0.5 bg-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-600 text-xs max-w-md">
                  Your proposal is currently empty. Add screens via Commander Chat or manually to generate a complete quotation.
                </p>
              </div>
            </div>
          )}

          {/* SPECIFICATIONS - Only show if screens exist */}
          {screens.length > 0 && (
            <>
              <h2 className="text-center text-xs font-medium tracking-[0.25em] text-neutral-500 mb-8">SPECIFICATIONS</h2>
              {/* For each screen render a small table with its specs */}
              {screens.map((screen) => {
                const height = screen.heightFt ?? screen.height ?? 0;
                const width = screen.widthFt ?? screen.width ?? 0;
                const pitch = screen.pitchMm ?? screen.pixelPitch ?? 0;

                const { h, w } = computePixels(height, width, pitch);

                return (
                  <table key={screen.id} className="w-full mb-6 text-[11px]">
                    <thead>
                      <tr className="border-b border-neutral-400">
                        <th className="text-left py-1.5 font-bold text-neutral-700 text-[11px]">{screen.name}</th>
                        <th className="text-right py-1.5 font-bold text-neutral-700 text-[11px]">SPECIFICATIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white">
                        <td className="py-1.5 pl-3 text-neutral-600">MM Pitch</td>
                        <td className="py-1.5 text-right text-neutral-600">{pitch.toFixed(2)} mm</td>
                      </tr>
                      <tr className="bg-[#f0f0f0]">
                        <td className="py-1.5 pl-3 text-neutral-600">Quantity</td>
                        <td className="py-1.5 text-right text-neutral-600">{screen.quantity}</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="py-1.5 pl-3 text-neutral-600">Active Display Height (ft.)</td>
                        <td className="py-1.5 text-right text-neutral-600">{height.toFixed(2)}'</td>
                      </tr>
                      <tr className="bg-[#f0f0f0]">
                        <td className="py-1.5 pl-3 text-neutral-600">Active Display Width (ft.)</td>
                        <td className="py-1.5 text-right text-neutral-600">{width.toFixed(2)}'</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="py-1.5 pl-3 text-neutral-600">Pixel Resolution (H)</td>
                        <td className="py-1.5 text-right text-neutral-600">{h} p</td>
                      </tr>
                      <tr className="bg-[#f0f0f0]">
                        <td className="py-1.5 pl-3 text-neutral-600">Pixel Resolution (W)</td>
                        <td className="py-1.5 text-right text-neutral-600">{w} p</td>
                      </tr>
                    </tbody>
                  </table>
                );
              })}
            </>
          )}
        </div>

        {/* Page Footer */}
        <div className="flex justify-center py-6 border-t border-neutral-200 mx-12">
          <div className="w-16 h-1 bg-neutral-300 rounded-full" />
        </div>
      </div>

      {/* Page 2 - Pricing - Only show if screens exist */}
      {screens.length > 0 && (
        <div
          className="bg-white max-w-[816px] mx-auto mb-8 print:mb-0 print:break-before-page shadow-xl print:shadow-none flex flex-col"
          style={{ minHeight: "1056px" }}
        >
          {/* Page Header */}
          <div className="flex justify-between items-center px-12 pt-6 pb-2">
            <div className="text-[11px] text-neutral-500">1</div>
            <div className="flex items-center gap-3">
              <div className="text-right text-[10px] leading-tight">
                <div className="text-neutral-600">www.anc.com/contact</div>
                <div>
                  <span className="text-[#1e3a5f] font-medium">NY</span>{" "}
                  <span className="text-neutral-500">914.696.2100</span>{" "}
                  <span className="text-amber-600 font-medium">TX</span>{" "}
                  <span className="text-neutral-500">940.464.2320</span>
                </div>
              </div>
              <LogoSelector theme="light" width={80} height={40} />
            </div>
          </div>

          <div className="px-12 pb-8 flex-1">
            {/* Title */}
            <div className="text-center mb-4">
              <h1 className="text-base font-bold text-[#1e3a5f] mb-0.5">{proposal.clientName}</h1>
              <h2 className="text-[11px] text-[#1e3a5f] tracking-wide">PRICING</h2>
            </div>

            {screens.map((screen) => {
              const subtotal = screenSubtotal(screen);

              return (
                <div key={screen.id} className="mb-6">
                  <table className="w-full text-[11px] mb-0">
                    <thead>
                      <tr className="border-b border-neutral-400">
                        <th className="text-left py-1.5 font-bold text-neutral-700 text-[11px]">{screen.name}</th>
                        <th className="text-right py-1.5 font-bold text-neutral-700 text-[11px]">PRICING</th>
                      </tr>
                    </thead>
                    <tbody>
                      {screen.lineItems && screen.lineItems.length > 0 ? (
                        screen.lineItems.map((li, i) => (
                          <tr key={li.id} className={i % 2 === 1 ? "bg-[#f0f0f0]" : "bg-white"}>
                            <td className="py-1.5 pl-3 text-neutral-600">{li.category}</td>
                            <td className="py-1.5 text-right text-neutral-600">{formatMoney(Number(li.price ?? 0))}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-1.5 pl-3 text-neutral-600">No pricing available</td>
                          <td className="py-1.5 text-right text-neutral-600">-</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="mb-4 text-[11px]">
                    <div className="flex justify-end py-0.5">
                      <span className="font-bold text-neutral-700 w-20 text-right">SUBTOTAL:</span>
                      <span className="font-bold text-neutral-700 w-12 text-right">{formatMoney(subtotal)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Grand totals */}
            <div className="mb-6 text-[11px]">
              <div className="flex justify-end py-0.5">
                <span className="font-bold text-neutral-700 w-20 text-right">SUBTOTAL:</span>
                <span className="font-bold text-neutral-700 w-12 text-right">{formatMoney(grandSubtotal)}</span>
              </div>
              {/* Taxes omitted here - add if required */}
              <div className="flex justify-end py-0.5">
                <span className="font-bold text-neutral-700 w-20 text-right">TOTAL:</span>
                <span className="font-bold text-neutral-700 w-12 text-right">{formatMoney(grandSubtotal)}</span>
              </div>
            </div>
          </div>

          {/* Page Footer */}
          <div className="flex justify-center py-6 border-t border-neutral-200 mx-12 mt-auto">
            <div className="w-16 h-1 bg-neutral-300 rounded-full" />
          </div>
        </div>
      )}

      {/* Page 3 - Payment Terms & Agreement - Only show if screens exist */}
      {screens.length > 0 && (
        <>
          <div
            className="bg-white max-w-[816px] mx-auto shadow-xl print:shadow-none print:break-before-page flex flex-col"
            style={{ minHeight: "1056px" }}
          >
            {/* Page Header */}
            <div className="flex justify-between items-center px-12 pt-6 pb-2">
              <div className="text-[11px] text-neutral-500">2</div>
              <div className="flex items-center gap-3">
                <div className="text-right text-[10px] leading-tight">
                  <div className="text-neutral-600">www.anc.com/contact</div>
                  <div>
                    <span className="text-[#1e3a5f] font-medium">NY</span>{" "}
                    <span className="text-neutral-500">914.696.2100</span>{" "}
                    <span className="text-amber-600 font-medium">TX</span>{" "}
                    <span className="text-neutral-500">940.464.2320</span>
                  </div>
                </div>
                <div className="text-[#1e3a5f] text-2xl font-black tracking-tight" style={{ fontFamily: "Arial Black, sans-serif" }}>
                  anc
                </div>
              </div>
            </div>

            <div className="px-12 pb-8 flex-1">
              {/* Title */}
              <div className="text-center mb-6">
                <h1 className="text-base font-bold text-[#1e3a5f]">{proposal.clientName}</h1>
              </div>

              {/* Payment Terms */}
              <div className="mb-4">
                <h3 className="font-bold text-[11px] text-neutral-800 mb-2">PAYMENT TERMS:</h3>
                <ul className="text-[11px] text-neutral-700 space-y-0.5 ml-4">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>A% deposit Upon Signing</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>B% due upon Display System Delivery</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>C% due upon final acceptance of work</span>
                  </li>
                </ul>
              </div>

              {/* Legal Language */}
              <p className="text-[11px] text-neutral-600 leading-relaxed text-justify">
                Please sign below to indicate Purchaser's agreement to purchase the Display System as described herein and to authorize ANC
                to commence production. If, for any reason, Purchaser terminates this Agreement prior to completion of work, ANC will immediately cease all work
                and Purchaser will pay ANC for any work performed, work in progress, and materials purchased, if any. This document will be
                considered binding on both parties; however, it will be followed by a formal agreement containing standard contract language,
                including terms of liability, indemnification, and warranty. Payment is due within thirty (30) days of ANC's invoice(s).
              </p>

              {/* Signature Blocks */}
              <div className="mt-8">
                <div className="mb-6">
                  <p className="font-bold text-[11px] text-[#1e3a5f] mb-4">ANC SPORTS ENTERPRISES, LLC ("ANC")</p>
                  <p className="text-[10px] text-neutral-600 mb-1">2 Manhattanville Road,  Suite 402</p>
                  <p className="text-[10px] text-neutral-600 mb-4">Purchase, NY 10577</p>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] text-neutral-500 mb-1">By:</p>
                      <div className="border-b border-neutral-300 h-8" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-neutral-500 mb-1">Title:</p>
                      <div className="border-b border-neutral-300 h-8" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-neutral-500 mb-1">Date:</p>
                      <div className="border-b border-neutral-300 h-8" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-[11px] text-[#1e3a5f] mb-4">{proposal.clientName} ("PURCHASER")</p>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] text-neutral-500 mb-1">By:</p>
                      <div className="border-b border-neutral-300 h-8" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-neutral-500 mb-1">Title:</p>
                      <div className="border-b border-neutral-300 h-8" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-neutral-500 mb-1">Date:</p>
                      <div className="border-b border-neutral-300 h-8" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Page Footer */}
            <div className="flex justify-center py-6 border-t border-neutral-200 mx-12 mt-auto">
              <div className="w-16 h-1 bg-neutral-300 rounded-full" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
