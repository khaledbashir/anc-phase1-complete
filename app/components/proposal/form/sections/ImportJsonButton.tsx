"use client"

import { useRef } from 'react';
import { BaseButton } from '@/app/components';
import { useProposalContext } from '@/contexts/ProposalContext';
import { Import } from 'lucide-react';

type ImportJsonButtonType = {
    setOpen: (open: boolean) => void;
}

const ImportJsonButton = ({ setOpen }: ImportJsonButtonType) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { importProposalData, proposalPdfLoading } = useProposalContext();

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'application/json') {
            importProposalData(file);
            setOpen(false);
        }
        // Reset input value to allow selecting the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                style={{ display: 'none' }}
            />
            <BaseButton
                variant="outline"
                tooltipLabel="Load project file from your computer"
                disabled={proposalPdfLoading}
                onClick={handleClick}
            >
                <Import />
                Load Project File
            </BaseButton>
        </>
    );
};

export default ImportJsonButton;