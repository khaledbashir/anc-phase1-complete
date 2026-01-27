/* =========================
   * Navigation
   ========================= */
import BaseNavbar from "./layout/BaseNavbar";
import BaseFooter from "./layout/BaseFooter";

/* =========================
   * Proposal
   ========================= */
import ProposalActions from "./invoice/ProposalActions";
import ActionToolbar from "./ActionToolbar";

/* =========================
   * Invoice components
   ========================= */
// * Form
// Form components
import SingleItem from "./invoice/form/SingleItem";
import Charges from "./invoice/form/Charges";
import TemplateSelector from "./invoice/form/TemplateSelector";

// Form / Wizard
import WizardNavigation from "./invoice/form/wizard/WizardNavigation";
import WizardStep from "./invoice/form/wizard/WizardStep";
import WizardProgress from "./invoice/form/wizard/WizardProgress";

// Form / Sections
import BillFromSection from "./invoice/form/sections/BillFromSection";
import BillToSection from "./invoice/form/sections/BillToSection";
import ProposalDetails from "./invoice/form/sections/ProposalDetails";
import Items from "./invoice/form/sections/Items";
import PaymentInformation from "./invoice/form/sections/PaymentInformation";
import ProposalSummary from "./invoice/form/sections/ProposalSummary";
import ImportJsonButton from "./invoice/form/sections/ImportJsonButton";
import Screens from "./invoice/form/sections/Screens";
import SingleScreen from "./invoice/form/SingleScreen";

// * Actions
import PdfViewer from "./invoice/actions/PdfViewer";
import LivePreview from "./invoice/actions/LivePreview";
import FinalPdf from "./invoice/actions/FinalPdf";

// * Reusable components
// Form fields
import CurrencySelector from "./reusables/form-fields/CurrencySelector";
import FormInput from "./reusables/form-fields/FormInput";
import FormTextarea from "./reusables/form-fields/FormTextarea";
import DatePickerFormField from "./reusables/form-fields/DatePickerFormField";
import FormFile from "./reusables/form-fields/FormFile";
import ChargeInput from "./reusables/form-fields/ChargeInput";
import FormCustomInput from "./reusables/form-fields/FormCustomInput";
import FormSelect from "./reusables/form-fields/FormSelect";

import BaseButton from "./reusables/BaseButton";
import ThemeSwitcher from "./reusables/ThemeSwitcher";
import Subheading from "./reusables/Subheading";
import AiWand from "./reusables/AiWand";
import LogoSelector from "./reusables/LogoSelector";

/* =========================
   * Modals & Alerts
   ========================= */
import SendPdfToEmailModal from "./modals/email/SendPdfToEmailModal";

// Import/Export
import ProposalLoaderModal from "./modals/invoice/ProposalLoaderModal";
import ProposalExportModal from "./modals/invoice/ProposalExportModal";

// Custom Selectors
import SavedProposalsList from "./modals/invoice/components/SavedProposalsList";

// Signature
import SignatureModal from "./modals/signature/SignatureModal";

// Signature / Tabs
import DrawSignature from "./modals/signature/tabs/DrawSignature";
import TypeSignature from "./modals/signature/tabs/TypeSignature";
import UploadSignature from "./modals/signature/tabs/UploadSignature";

// Signature / Components
import SignatureColorSelector from "./modals/signature/components/SignatureColorSelector";
import SignatureFontSelector from "./modals/signature/components/SignatureFontSelector";

// Alerts
import NewProposalAlert from "./modals/alerts/NewProposalAlert";
import NewProjectModal from "./modals/NewProjectModal";

/* =========================
   * Templates
   ========================= */
// Invoice templates
import DynamicProposalTemplate from "./templates/proposal-pdf/DynamicProposalTemplate";
import ProposalLayout from "./templates/proposal-pdf/ProposalLayout";
import ProposalTemplate1 from "./templates/proposal-pdf/ProposalTemplate1";
import ProposalTemplate2 from "./templates/proposal-pdf/ProposalTemplate2";
import ProposalTemplate3 from "./templates/proposal-pdf/ProposalTemplate3";

// Email templates
import SendPdfEmail from "./templates/email/SendPdfEmail";

export {
   BaseNavbar,
   BaseFooter,
   ProposalActions,
   ActionToolbar,
   BillFromSection,
   BillToSection,
   ProposalDetails,
   Items,
   SingleItem,
   Charges,
   TemplateSelector,
   WizardNavigation,
   WizardStep,
   WizardProgress,
   PaymentInformation,
   ProposalSummary,
   CurrencySelector,
   SavedProposalsList,
   PdfViewer,
   LivePreview,
   FinalPdf,
   FormInput,
   FormTextarea,
   DatePickerFormField,
   FormFile,
   ChargeInput,
   FormCustomInput,
   Screens,
   SingleScreen,
   BaseButton,
   ThemeSwitcher,
   Subheading,
   AiWand,
   SendPdfToEmailModal,
   ProposalLoaderModal,
   ProposalExportModal,
   ImportJsonButton,
   SignatureModal,
   NewProjectModal,
   DrawSignature,
   TypeSignature,
   UploadSignature,
   SignatureColorSelector,
   SignatureFontSelector,
   NewProposalAlert,
   DynamicProposalTemplate,
   ProposalLayout,
   ProposalTemplate1,
   ProposalTemplate2,
   ProposalTemplate3,
   SendPdfEmail,
   FormSelect,
   LogoSelector,
};
