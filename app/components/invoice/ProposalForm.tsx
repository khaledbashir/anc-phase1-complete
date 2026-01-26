"use client";

import { useMemo } from "react";

// RHF
import { useFormContext, useWatch } from "react-hook-form";

// ShadCn
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Components
import {
    BillFromSection,
    BillToSection,
    ProposalDetails,
    Screens,
    Items,
    PaymentInformation,
    ProposalSummary,
} from "@/app/components";

import AuditTable from "@/app/components/invoice/AuditTable";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";

// Icons
import { Building2, User, LayoutGrid, Package, CreditCard, Calculator } from "lucide-react";

const ProposalForm = () => {
    const { _t } = useTranslationContext();

    const { control } = useFormContext();

    // Get proposal ID variable
    const proposalId = useWatch({
        name: "details.proposalId",
        control,
    });

    const proposalIdLabel = useMemo(() => {
        if (proposalId) {
            return `#${proposalId}`;
        } else {
            return _t("formNewPropBadge");
        }
    }, [proposalId]);

    return (
        <div className="w-full space-y-4">
            {/* Header Badge */}
            <div className="flex items-center gap-3 mb-6">
                <Badge variant="secondary" className="bg-zinc-800/50 text-zinc-300 border-zinc-700 px-3 py-1">
                    <p className="text-sm">{proposalIdLabel}</p>
                </Badge>
            </div>

            <Tabs defaultValue="client" className="w-full">
                <TabsList className="bg-zinc-900/50 border border-zinc-800/50">
                    <TabsTrigger value="client" className="data-[state=active]:bg-zinc-800 text-zinc-300">Client</TabsTrigger>
                    <TabsTrigger value="details" className="data-[state=active]:bg-zinc-800 text-zinc-300">Details</TabsTrigger>
                    <TabsTrigger value="screens" className="data-[state=active]:bg-zinc-800 text-zinc-300">Screens</TabsTrigger>
                    <TabsTrigger value="summary" className="data-[state=active]:bg-zinc-800 text-zinc-300">Summary</TabsTrigger>
                    <TabsTrigger value="audit" className="data-[state=active]:bg-zinc-800 text-zinc-300">Audit</TabsTrigger>
                </TabsList>

                {/* Client Tab */}
                <TabsContent value="client" className="space-y-4">
                    <Card className="bg-zinc-900/50 border-zinc-800/50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#003366]/20">
                                    <Building2 className="w-5 h-5 text-[#003366]" />
                                </div>
                                <div>
                                    <CardTitle className="text-zinc-100 text-base">Parties</CardTitle>
                                    <CardDescription className="text-zinc-500 text-xs">Bill from & Bill to</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-6">
                                <BillFromSection />
                                <BillToSection />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4">
                    <Card className="bg-zinc-900/50 border-zinc-800/50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#003366]/20">
                                    <LayoutGrid className="w-5 h-5 text-[#003366]" />
                                </div>
                                <div>
                                    <CardTitle className="text-zinc-100 text-base">Proposal Details</CardTitle>
                                    <CardDescription className="text-zinc-500 text-xs">Dates, notes, and project info</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ProposalDetails />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Screens Tab */}
                <TabsContent value="screens" className="space-y-4">
                    <Card className="bg-zinc-900/50 border-zinc-800/50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#003366]/20">
                                    <Calculator className="w-5 h-5 text-[#003366]" />
                                </div>
                                <div>
                                    <CardTitle className="text-zinc-100 text-base">Screens</CardTitle>
                                    <CardDescription className="text-zinc-500 text-xs">LED screen configurations</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Screens />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Summary Tab */}
                <TabsContent value="summary" className="space-y-4">
                    <Card className="bg-zinc-900/50 border-zinc-800/50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#003366]/20">
                                    <CreditCard className="w-5 h-5 text-[#003366]" />
                                </div>
                                <div>
                                    <CardTitle className="text-zinc-100 text-base">Payment Information</CardTitle>
                                    <CardDescription className="text-zinc-500 text-xs">Terms and payment details</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <PaymentInformation />
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/50 border-zinc-800/50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#003366]/20">
                                    <Package className="w-5 h-5 text-[#003366]" />
                                </div>
                                <div>
                                    <CardTitle className="text-zinc-100 text-base">Items</CardTitle>
                                    <CardDescription className="text-zinc-500 text-xs">Additional line items</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Items />
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/50 border-zinc-800/50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#003366]/20">
                                    <Calculator className="w-5 h-5 text-[#003366]" />
                                </div>
                                <div>
                                    <CardTitle className="text-zinc-100 text-base">Summary</CardTitle>
                                    <CardDescription className="text-zinc-500 text-xs">Totals and breakdown</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ProposalSummary />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Audit Tab (Estimator view) */}
                <TabsContent value="audit" className="space-y-4">
                    <Card className="bg-zinc-950/50 border border-zinc-800/40 backdrop-blur-lg">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#003366]/20">
                                    <Calculator className="w-5 h-5 text-[#003366]" />
                                </div>
                                <div>
                                    <CardTitle className="text-zinc-100 text-base">Internal Audit</CardTitle>
                                    <CardDescription className="text-zinc-500 text-xs">Detailed per-screen math for estimators</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <AuditTable />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ProposalForm;
