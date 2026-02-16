"use client";

import { useMemo } from "react";

export interface RoiInputs {
  projectCost: number;       // Total LED project cost ($)
  venueCapacity: number;     // Seats
  eventsPerYear: number;     // Number of games/events
  adCpmRate: number;         // Ad CPM (cost per mille impressions) — $/1000
  sponsorPackages: number;   // Number of sponsor packages
  avgSponsorRate: number;    // Average annual sponsorship rate per package ($)
}

export interface RoiResults {
  annualAdRevenue: number;
  annualSponsorRevenue: number;
  totalAnnualRevenue: number;
  paybackMonths: number;
  fiveYearRoi: number;        // Percentage
  fiveYearProfit: number;
  yearlyBreakdown: { year: number; cumulativeRevenue: number; profit: number }[];
}

export const DEFAULT_INPUTS: RoiInputs = {
  projectCost: 2_000_000,
  venueCapacity: 18_000,
  eventsPerYear: 41,
  adCpmRate: 5,
  sponsorPackages: 8,
  avgSponsorRate: 75_000,
};

export function useRoiCalculation(inputs: RoiInputs): RoiResults {
  return useMemo(() => {
    const {
      projectCost,
      venueCapacity,
      eventsPerYear,
      adCpmRate,
      sponsorPackages,
      avgSponsorRate,
    } = inputs;

    // Annual impressions = capacity × events
    const annualImpressions = venueCapacity * eventsPerYear;
    // Ad revenue = impressions / 1000 × CPM rate
    const annualAdRevenue = (annualImpressions / 1000) * adCpmRate;
    // Sponsor revenue
    const annualSponsorRevenue = sponsorPackages * avgSponsorRate;
    const totalAnnualRevenue = annualAdRevenue + annualSponsorRevenue;

    // Payback
    const paybackMonths =
      totalAnnualRevenue > 0 ? (projectCost / totalAnnualRevenue) * 12 : Infinity;

    // 5-year
    const fiveYearRevenue = totalAnnualRevenue * 5;
    const fiveYearProfit = fiveYearRevenue - projectCost;
    const fiveYearRoi = projectCost > 0 ? (fiveYearProfit / projectCost) * 100 : 0;

    // Year-by-year
    const yearlyBreakdown = Array.from({ length: 5 }, (_, i) => {
      const year = i + 1;
      const cumulativeRevenue = totalAnnualRevenue * year;
      return {
        year,
        cumulativeRevenue,
        profit: cumulativeRevenue - projectCost,
      };
    });

    return {
      annualAdRevenue,
      annualSponsorRevenue,
      totalAnnualRevenue,
      paybackMonths,
      fiveYearRoi,
      fiveYearProfit,
      yearlyBreakdown,
    };
  }, [inputs]);
}
