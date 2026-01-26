// ShadCn
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/components/ui/use-toast";

const useToasts = () => {
    type SendErrorType = {
        email: string;
        sendPdfToMail: (email: string) => void;
    };

    const newProposalSuccess = () => {
        toast({
            variant: "default",
            title: "Generated new proposal",
            description: "Successfully created a new proposal",
        });
    };

    const pdfGenerationSuccess = () => {
        toast({
            variant: "default",
            title: "Your proposal has been generated!",
            description:
                "You can preview, download, or save it from the actions tab",
        });
    };

    const saveProposalSuccess = () => {
        toast({
            variant: "default",
            title: "Saved Proposal",
            description: "Your proposal details are saved now",
        });
    };

    const modifiedProposalSuccess = () => {
        toast({
            variant: "default",
            title: "Modified Proposal",
            description: "Successfully modified your proposal",
        });
    };

    const sendPdfSuccess = () => {
        toast({
            variant: "default",
            title: "Email sent",
            description: "Your proposal has been sent to the specified email",
        });
    };

    const sendPdfError = ({ email, sendPdfToMail }: SendErrorType) => {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Something went wrong. Try again in a moment",
            action: (
                <ToastAction
                    onClick={() => sendPdfToMail(email)}
                    altText="Try again"
                >
                    Try again
                </ToastAction>
            ),
        });
    };

    const importProposalError = () => {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Something went importing the proposal. Make sure the file is a valid ANC JSON export",
        });
    };

    const aiExtractionSuccess = () => {
        toast({
            variant: "default",
            title: "AI Extraction Complete!",
            description: "We've pre-filled the project details and screen specs from your RFP.",
        });
    };

    const aiExtractionError = () => {
        toast({
            variant: "destructive",
            title: "AI Extraction Partial",
            description: "We couldn't extract all fields. Please review the proposal details.",
        });
    };

    const success = (title: string, description?: string) => {
        toast({
            variant: "default",
            title,
            description,
        });
    };

    const error = (title: string, description?: string) => {
        toast({
            variant: "destructive",
            title,
            description,
        });
    };

    return {
        newProposalSuccess,
        pdfGenerationSuccess,
        saveProposalSuccess,
        modifiedProposalSuccess,
        sendPdfSuccess,
        sendPdfError,
        importProposalError,
        aiExtractionSuccess,
        aiExtractionError,
        success,
        error,
    };
};

export default useToasts;
