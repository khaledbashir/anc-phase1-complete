"use client";

import React, { useEffect } from "react";

// RHF
import { FormProvider, useForm } from "react-hook-form";

// Zod
import { zodResolver } from "@hookform/resolvers/zod";

// Schema
import { ProposalSchema } from "@/lib/schemas";

// Context
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { ProposalContextProvider } from "@/contexts/ProposalContext";
import { ChargesContextProvider } from "@/contexts/ChargesContext";

// Types
import { ProposalType } from "@/types";

// Variables
import {
  FORM_DEFAULT_VALUES,
  LOCAL_STORAGE_PROPOSAL_DRAFT_KEY,
} from "@/lib/variables";

// Helpers
const readDraftFromLocalStorage = (): ProposalType | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_PROPOSAL_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // revive dates
    if (parsed?.details) {
      if (parsed.details.proposalDate)
        parsed.details.proposalDate = new Date(parsed.details.proposalDate);
      if (parsed.details.dueDate)
        parsed.details.dueDate = new Date(parsed.details.dueDate);
    }
    return parsed;
  } catch {
    return null;
  }
};

type ProvidersProps = {
  children: React.ReactNode;
};

const Providers = ({ children }: ProvidersProps) => {
  const form = useForm<ProposalType>({
    resolver: zodResolver(ProposalSchema),
    defaultValues: FORM_DEFAULT_VALUES,
  });

  // Hydrate once on mount — skip for /projects/new (must start clean)
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/projects/new") return;
    const draft = readDraftFromLocalStorage();
    if (draft) {
      form.reset(draft, { keepDefaultValues: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
    >
      <TranslationProvider>
        <FormProvider {...form}>
          <ProposalContextProvider>
            <ChargesContextProvider>{children}</ChargesContextProvider>
          </ProposalContextProvider>
        </FormProvider>
      </TranslationProvider>
    </ThemeProvider>
  );
};

export default Providers;
