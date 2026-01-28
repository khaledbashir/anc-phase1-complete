"use client";

import { useState } from "react";

// ShadCn
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Components
import { SavedProposalsList } from "@/app/components";
import { ImportJsonButton } from "@/app/components";

// Context
import { useProposalContext } from "@/contexts/ProposalContext";

type ProposalLoaderModalType = {
  children: React.ReactNode;
};

const ProposalLoaderModal = ({ children }: ProposalLoaderModalType) => {
  const [open, setOpen] = useState(false);

  const { savedProposals } = useProposalContext();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader className="pb-2 border-b">
          <DialogTitle>Project Vault</DialogTitle>
          <DialogDescription>
            <div className="space-y-2">
              <p>You have {savedProposals.length} projects in the vault</p>
              <ImportJsonButton setOpen={setOpen} />
            </div>
          </DialogDescription>
        </DialogHeader>

        <SavedProposalsList setModalState={setOpen} />
      </DialogContent>
    </Dialog>
  );
};

export default ProposalLoaderModal;
