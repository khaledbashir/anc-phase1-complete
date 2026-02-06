"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useProposalContext } from "@/contexts/ProposalContext";
import { RiskAwareSOWGenerator } from "@/services/sow/sowGenerator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RiskBadge, RiskCard, RiskType } from "./RiskBadge";
import { 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Wand2,
  Edit3,
  Save,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SOWSection {
  title: string;
  content: string;
  category: "DESIGN" | "CONSTRUCTION" | "CONSTRAINTS";
}

export function SOWGeneratorPanel() {
  const { control, setValue } = useFormContext();
  
  // Watch form values
  const proposalName = useWatch({ control, name: "details.proposalName" });
  const venue = useWatch({ control, name: "details.venue" });
  const location = useWatch({ control, name: "details.location" });
  const watchedScreens = useWatch({ control, name: "details.screens" });
  const screens = React.useMemo(() => watchedScreens || [], [watchedScreens]);
  const additionalNotes = useWatch({ control, name: "details.additionalNotes" });
  const aiWorkspaceSlug = useWatch({ control, name: "details.aiWorkspaceSlug" });
  const showExhibitA = useWatch({ control, name: "details.showExhibitA" });
  const aiGeneratedSOW = useWatch({ control, name: "details.aiGeneratedSOW" });
  
  // Local state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [detectedRisks, setDetectedRisks] = useState<RiskType[]>([]);
  const [sowSections, setSowSections] = useState<SOWSection[]>([]);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  
  // Inline editing state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});

  // Memoize screens info to prevent dependency issues
  const screensInfo = React.useMemo(() => ({
    count: screens.length,
    text: screens.map((s: any) => `${s.name || ""} ${s.environment || ""} ${s.serviceType || ""}`).join(" ")
  }), [screens]);

  // Generate SOW content based on detected risks
  const generateSOW = useCallback(async () => {
    setIsGenerating(true);
    
    // Simulate AI processing delay for visual effect
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Combine RFP text from various sources
    const rfpText = `
      ${venue || ""} ${location || ""} ${proposalName || ""}
      ${additionalNotes || ""}
      ${screensInfo.text}
    `.toLowerCase();
    
    // Scan for risks
    const riskScan = RiskAwareSOWGenerator.scanForRiskKeywords(rfpText);
    
    // Build detected risks for UI
    const newRisks: RiskType[] = [];
    if (riskScan.hasUnionRequirement) newRisks.push("union");
    if (riskScan.hasOutdoorRequirement) newRisks.push("outdoor");
    if (riskScan.hasLiquidatedDamages) newRisks.push("liquidatedDamages");
    if (riskScan.hasPerformanceBond) newRisks.push("performanceBond");
    if (riskScan.hasSpareParts) newRisks.push("spareParts");
    setDetectedRisks(newRisks);
    
    // Apply financial triggers to form state
    if (riskScan.financialTriggers.bondRateOverride !== undefined) {
      setValue("details.bondRateOverride", riskScan.financialTriggers.bondRateOverride, { shouldDirty: true });
    }
    
    // Apply spare parts percentage to all screens
    if (riskScan.financialTriggers.sparePartsPercentage !== undefined) {
      const updatedScreens = screens.map((s: any) => ({
        ...s,
        includeSpareParts: true,
        sparePartsPercentage: riskScan.financialTriggers.sparePartsPercentage
      }));
      setValue("details.screens", updatedScreens, { shouldDirty: true });
    }
    
    // Generate SOW content
    const projectContext = {
      venue: venue || "Project Site",
      clientName: location || "Client",
      displayCount: screensInfo.count
    };
    
    const generated = RiskAwareSOWGenerator.generateRiskAwareSOW(rfpText, projectContext);
    
    // Map to sections
    const sections: SOWSection[] = [
      {
        title: "1. Design Services",
        content: generated.designServices,
        category: "DESIGN"
      },
      {
        title: "2. Construction Logistics",
        content: generated.constructionLogistics,
        category: "CONSTRUCTION"
      }
    ];
    
    if (generated.constraints) {
      sections.push({
        title: "3. Project Constraints",
        content: generated.constraints,
        category: "CONSTRAINTS"
      });
    }
    
    setSowSections(sections);
    
    // Save to form state
    setValue("details.aiGeneratedSOW", {
      designServices: generated.designServices,
      constructionLogistics: generated.constructionLogistics,
      constraints: generated.constraints,
      generatedAt: new Date().toISOString(),
      editedByUser: false
    }, { shouldDirty: true });
    
    // Initialize edited content
    const initialEdits: Record<string, string> = {};
    sections.forEach(s => {
      initialEdits[s.title] = s.content;
    });
    setEditedContent(initialEdits);
    
    setLastGenerated(new Date());
    setIsGenerating(false);

    // Do NOT auto-expand - keep panel collapsed by default
    // User must manually click to expand and review SOW content
  }, [venue, location, proposalName, additionalNotes, screensInfo, setValue]);

  // Auto-generate on mount if we have AI workspace data
  useEffect(() => {
    if (aiWorkspaceSlug && !lastGenerated && !isGenerating) {
      generateSOW();
    }
  }, [aiWorkspaceSlug, generateSOW, lastGenerated, isGenerating]);

  // Handle edit start
  const startEditing = (sectionTitle: string, currentContent: string) => {
    setEditingSection(sectionTitle);
    setEditedContent(prev => ({
      ...prev,
      [sectionTitle]: currentContent
    }));
  };

  // Handle edit save
  const saveEdit = (sectionTitle: string) => {
    const newContent = editedContent[sectionTitle];
    
    // Update local sections
    setSowSections(prev => prev.map(s => 
      s.title === sectionTitle ? { ...s, content: newContent } : s
    ));
    
    // Update form state
    const currentSOW = aiGeneratedSOW || {};
    const updatedSOW = {
      ...currentSOW,
      [sectionTitle === "1. Design Services" ? "designServices" :
       sectionTitle === "2. Construction Logistics" ? "constructionLogistics" : "constraints"]: newContent,
      editedByUser: true
    };
    setValue("details.aiGeneratedSOW", updatedSOW, { shouldDirty: true });
    
    setEditingSection(null);
  };

  // Handle edit cancel
  const cancelEdit = () => {
    setEditingSection(null);
  };

  // Get category styles
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "DESIGN": 
        return { 
          bg: "bg-purple-500", 
          text: "text-purple-600",
          border: "border-purple-200",
          icon: "text-purple-500"
        };
      case "CONSTRUCTION": 
        return { 
          bg: "bg-emerald-500", 
          text: "text-emerald-600",
          border: "border-emerald-200",
          icon: "text-emerald-500"
        };
      case "CONSTRAINTS": 
        return { 
          bg: "bg-orange-500", 
          text: "text-orange-600",
          border: "border-orange-200",
          icon: "text-orange-500"
        };
      default: 
        return { 
          bg: "bg-gray-500", 
          text: "text-gray-600",
          border: "border-gray-200",
          icon: "text-gray-500"
        };
    }
  };

  return (
    <Card className="bg-card/50 border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-brand-blue/10 shrink-0">
              <Sparkles className="w-5 h-5 text-brand-blue" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-foreground text-base truncate">AI-Generated SOW</CardTitle>
              <CardDescription className="text-muted-foreground text-xs truncate">
                Context-aware Statement of Work
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {detectedRisks.length > 0 && (
              <Badge variant="outline" className="text-[10px] border-brand-blue/30 text-brand-blue whitespace-nowrap">
                {detectedRisks.length} Risk{detectedRisks.length > 1 ? "s" : ""}
              </Badge>
            )}
            {aiGeneratedSOW?.editedByUser && (
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 whitespace-nowrap">
                Edited
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0 shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Risk Detection Badges */}
        {detectedRisks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {detectedRisks.map((riskType) => (
              <RiskBadge key={riskType} riskType={riskType} />
            ))}
          </div>
        )}

        {/* No Risks State */}
        {detectedRisks.length === 0 && lastGenerated && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">
              No special risks detected. Standard SOW clauses apply.
            </span>
          </div>
        )}

        {/* Generate Button */}
        {!lastGenerated && !isGenerating && (
          <Button
            onClick={generateSOW}
            variant="outline"
            className="w-full border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Scan RFP & Generate SOW
          </Button>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-brand-blue/20 border-t-brand-blue animate-spin" />
                <Sparkles className="w-4 h-4 text-brand-blue absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <span className="text-xs text-muted-foreground animate-pulse">
                AI analyzing RFP risks...
              </span>
            </div>
          </div>
        )}

        {/* Expanded SOW Preview with Inline Editor */}
        {isExpanded && sowSections.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Generated Sections
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateSOW}
                  disabled={isGenerating}
                  className="h-6 text-[10px] text-brand-blue hover:text-brand-blue/80"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Regenerate
                </Button>
              </div>
            </div>

            {/* Risk Cards */}
            {detectedRisks.length > 0 && (
              <div className="space-y-2">
                {detectedRisks.slice(0, 2).map((riskType) => (
                  <RiskCard key={riskType} riskType={riskType} />
                ))}
              </div>
            )}

            <ScrollArea className="h-[350px] rounded-lg border border-border bg-muted/20">
              <div className="p-4 space-y-4">
                {sowSections.map((section, idx) => {
                  const styles = getCategoryStyles(section.category);
                  const isEditing = editingSection === section.title;
                  
                  return (
                    <div 
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg bg-card border hover:shadow-sm transition-all",
                        styles.border,
                        isEditing && "ring-2 ring-brand-blue/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center text-white",
                          styles.bg
                        )}>
                          <Wand2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {section.title}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn("text-[9px] ml-auto", styles.text)}
                        >
                          {section.category}
                        </Badge>
                        
                        {/* Edit/Save Buttons */}
                        {!isEditing ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(section.title, section.content)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-brand-blue"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveEdit(section.title)}
                              className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <Textarea
                          value={editedContent[section.title] || ""}
                          onChange={(e) => setEditedContent(prev => ({
                            ...prev,
                            [section.title]: e.target.value
                          }))}
                          className="text-[11px] min-h-[100px] resize-y"
                          placeholder={`Edit ${section.title}...`}
                        />
                      ) : (
                        <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {section.content}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Enable in PDF Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand-blue/5 border border-brand-blue/10">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-blue" />
                <span className="text-xs text-foreground font-medium">Include in PDF Export</span>
              </div>
              <Switch
                checked={showExhibitA || false}
                onCheckedChange={(checked) => setValue("details.showExhibitA", checked, { shouldDirty: true })}
                className="data-[state=checked]:bg-brand-blue"
              />
            </div>
          </div>
        )}

        {/* Collapsed Preview */}
        {!isExpanded && sowSections.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">
                {sowSections.length} sections generated
                {detectedRisks.length > 0 && ` • ${detectedRisks.length} risk${detectedRisks.length > 1 ? "s" : ""} detected`}
                {aiGeneratedSOW?.editedByUser && " • Edited by user"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="h-6 text-[10px] text-brand-blue"
            >
              Preview & Edit
            </Button>
          </div>
        )}

        {/* Context-Aware Hint */}
        {aiWorkspaceSlug && detectedRisks.length === 0 && !isGenerating && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground">
                <strong>AI scans for:</strong> Union Labor, Outdoor/IP65, Liquidated Damages, Performance Bond, Spare Parts
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Upload RFP documents for automatic risk detection
              </p>
            </div>
          </div>
        )}

        {/* Last Generated Timestamp */}
        {lastGenerated && (
          <div className="text-[10px] text-muted-foreground text-right">
            Last generated: {lastGenerated.toLocaleTimeString()}
            {aiGeneratedSOW?.editedByUser && " • Edited"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SOWGeneratorPanel;
