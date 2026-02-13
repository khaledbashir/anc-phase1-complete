"use client";
import React, { useState } from "react";
import OperationsManager from "./OperationsManager";
import {
  ClipboardCheck,
  Zap,
  Rocket,
  Microscope,
  AlertCircle,
  TrendingUp,
  FileText,
  Search,
  Clock,
  ArrowRight,
  Shield,
  Target
} from "lucide-react";

// ── BRAND TOKENS (The "Home" Palette) ──
const BRAND = {
  blue: "#0A52EF",      // French Blue
  opal: "#002C73",      // Navy
  splash: "#03B8FF",    // Vibrant Cyan
  malibu: "#0385DD",    // Mid-tone
  canvas: "#F8F9FA",    // Clean Gallery White
  border: "#E2E8F0",
  textSlate: "#475569"
};

const TABS = [
  { id: "today", label: "Operations", icon: ClipboardCheck },
  { id: "engine", label: "The Engine", icon: Zap },
  { id: "phase2", label: "Future Scope", icon: Rocket },
  { id: "market", label: "Intelligence", icon: Microscope },
  { id: "impact", label: "Analysis", icon: BarChart3 },
];



const IMPACT_METRICS = [
  { label: "Proposal Cycle", before: "8 hours", after: "15 mins", savings: "97%", icon: FileText, category: "EFFICIENCY" },
  { label: "RFP Intelligence", before: "16 hours", after: "30 mins", savings: "96%", icon: Search, category: "EXTRACTION" },
  { label: "Budget ROM", before: "4 hours", after: "15 mins", savings: "93%", icon: TrendingUp, category: "ESTIMATION" },
  { label: "Revision Latency", before: "72 hours", after: "10 mins", savings: "99%", icon: Clock, category: "ITERATION" },
];

const PRICING_MATRIX = [
  { category: "Micro LED (P0.9–P1.25)", perSqFt: "$179 – $353+", context: "Broadcast, premium suites.", tier: "Ultra-Premium" },
  { category: "Fine Pitch (P1.5)", perSqFt: "$130 – $179", context: "Conference rooms.", tier: "Premium" },
  { category: "Fine Pitch (P2.5)", perSqFt: "$116 – $179", context: "Retail, concourse.", tier: "Mid-Premium" },
  { category: "Indoor Standard (P2.5–P4)", perSqFt: "$42 – $84", context: "Wayfinding.", tier: "Standard" },
  { category: "Outdoor (P6–P8)", perSqFt: "$45 – $167", context: "Stadium boards.", tier: "Mid-Range" },
];

// ── COMPONENTS ──

const App = () => {
  const [activeTab, setActiveTab] = useState("today");
  const [selectedStep, setSelectedStep] = useState(0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#002C73] font-sans antialiased selection:bg-[#0A52EF] selection:text-white relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Work+Sans:wght@300;400;500;600;700;800;900&display=swap');
        body { font-family: 'Work Sans', sans-serif; }
        .serif { font-family: 'Playfair Display', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        
        /* The Website "Future" Mask Effect */
        .brand-mask-text {
          background: url('https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2070&auto=format&fit=crop') center;
          background-size: cover;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 900;
          text-transform: uppercase;
        }

        .blueprint-overlay {
          background-image: linear-gradient(#002C73 1px, transparent 1px), linear-gradient(90deg, #002C73 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.03;
          pointer-events: none;
        }
      `}</style>

      <div className="blueprint-overlay absolute inset-0 z-0" />

      {/* Corporate Header */}
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-xl z-50 border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#002C73] rounded flex items-center justify-center text-white font-black text-xs">a</div>
              <span className="text-xl font-black italic serif tracking-tighter">anc</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-8 pl-4">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-[10px] font-black uppercase tracking-[0.25em] transition-all relative py-2
                    ${activeTab === tab.id ? "text-[#0A52EF]" : "text-[#94A3B8] hover:text-[#002C73]"}`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-[-10px] left-0 right-0 h-[3px] bg-[#0A52EF] rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">v1.8 PROPOSAL ENGINE</span>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Shield size={16} className="text-slate-400" />
            </button>
          </div>
        </div>
      </nav>

      {/* Partner Logo Ribbon - The "Home" Factor */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-4 z-40 px-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
          <div className="text-[10px] font-black text-[#002C73] uppercase tracking-[0.2em] w-32 shrink-0">Strategic Partners</div>
          <div className="flex-1 flex justify-around items-center px-10">
            {['NFL', 'NHL', 'MLS', 'NBA', 'MLB', 'TGL'].map(p => (
              <span key={p} className="text-xs font-black tracking-widest text-[#002C73]">{p}</span>
            ))}
          </div>
          <div className="text-[10px] font-bold text-slate-400 w-32 text-right">ANC SPORTS ENTERPRISES</div>
        </div>
      </div>

      <main className="pt-40 pb-32 max-w-7xl mx-auto px-10 relative z-10">

        {activeTab === "today" && (
          <OperationsManager />
        )}

        {activeTab === "engine" && (
          <div className="animate-in fade-in duration-1000">
            <header className="mb-24 flex items-end justify-between">
              <div>
                <h2 className="brand-mask-text text-8xl leading-none tracking-tighter uppercase">The Core<br />Engine</h2>
              </div>
              <p className="text-lg text-slate-500 font-medium max-w-md text-right border-r-4 border-[#03B8FF] pr-8 italic serif">
                Architecture built for the estimator, calibrated for the client.
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="bg-white p-16 rounded-[64px] border border-[#E2E8F0] shadow-sm relative overflow-hidden group hover:shadow-2xl hover:-translate-y-2 transition-all duration-700">
                <div className="absolute top-0 right-0 p-12">
                  <Shield size={40} className="text-[#0A52EF]/10 group-hover:text-[#0A52EF] transition-colors" />
                </div>
                <h3 className="text-5xl font-black italic serif mb-4 text-[#002C73] tracking-tighter">Mirror Mode</h3>
                <p className="text-[10px] font-black text-[#0A52EF] bg-[#0A52EF]/10 w-fit px-3 py-1 rounded-full uppercase tracking-[0.3em] mb-12">LIVE PRODUCTION</p>
                <p className="text-[#475563] leading-relaxed mb-12 font-medium text-lg">
                  Numbers are sacred. Mirror Mode parses raw Excel financial logic into a bespoke PDF narrative with zero recalculation.
                </p>
                <div className="grid grid-cols-2 gap-8">
                  {["1:1 Data Mapping", "LOI Signature Engine", "Branded PDF Export", "Multi-Currency Parser"].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-[11px] font-black text-[#002C73] uppercase tracking-widest">
                      <div className="w-2 h-2 bg-[#03B8FF] rounded-full" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#002C73] p-16 rounded-[64px] text-white relative overflow-hidden shadow-2xl group hover:shadow-[#002C73]/40 transition-all duration-700">
                <div className="absolute top-0 right-0 p-12">
                  <Zap size={40} className="text-white/10 group-hover:text-[#03B8FF] transition-colors" />
                </div>
                <h3 className="text-5xl font-black italic serif mb-4 tracking-tighter">Intelligence Mode</h3>
                <p className="text-[10px] font-black text-[#03B8FF] border border-[#03B8FF] w-fit px-3 py-1 rounded-full uppercase tracking-[0.3em] mb-12">DEVELOPMENT PHASE</p>
                <p className="text-white/70 leading-relaxed mb-12 font-medium text-lg">
                  Empowering the field. Guided intelligence flows that generate preliminary ROM budgets using confirmed ANC formulas.
                </p>
                <div className="grid grid-cols-2 gap-8">
                  {["AI Product Match", "Guided ROM Budgeting", "RFP Smart Extraction", "Risk Scoring Engine"].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-[11px] font-black text-white/90 uppercase tracking-widest">
                      <div className="w-2 h-2 bg-[#03B8FF] rounded-full" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "phase2" && (
          <div className="animate-in fade-in duration-1000">
            <header className="mb-24">
              <h2 className="brand-mask-text text-8xl leading-none tracking-tighter uppercase">Future<br />Scope</h2>
              <div className="h-2 w-32 bg-[#0A52EF] mt-6" />
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { title: "AI Drawing Parser", status: "Q2 2026", desc: "Automated extraction of display schedules from architectural PDFs using computer vision.", icon: Search },
                { title: "Real-Time Pricing API", status: "Q3 2026", desc: "Live integration with vendor catalogs for instant pricing updates.", icon: TrendingUp },
                { title: "Smart Contract Integration", status: "Q4 2026", desc: "Blockchain-verified proposal acceptance and automated LOI generation.", icon: Shield },
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-12 rounded-[56px] border border-[#E2E8F0] group hover:bg-[#002C73] transition-all duration-700 hover:-translate-y-4">
                  <div className="flex justify-between items-start mb-8">
                    <item.icon size={32} className="text-[#0A52EF] group-hover:text-[#03B8FF]" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover:text-white/40">{item.status}</span>
                  </div>
                  <h3 className="text-2xl font-black mb-4 tracking-tighter text-[#002C73] uppercase group-hover:text-white">{item.title}</h3>
                  <p className="text-sm text-[#475563] group-hover:text-white/60 leading-relaxed font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "market" && (
          <div className="animate-in fade-in duration-1000">
            <header className="mb-24">
              <h2 className="brand-mask-text text-8xl leading-none tracking-tighter uppercase">Market<br />Intelligence</h2>
              <div className="h-2 w-32 bg-[#0A52EF] mt-6" />
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {PRICING_MATRIX.map((item, idx) => (
                <div key={idx} className="bg-white p-12 rounded-[56px] border border-[#E2E8F0] group hover:bg-[#002C73] transition-all duration-700 hover:-translate-y-4">
                  <div className="flex justify-between items-start mb-14">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] group-hover:text-white/40">{item.tier}</span>
                    <Target size={20} className="text-[#0A52EF] group-hover:text-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-4 tracking-tighter text-[#002C73] uppercase group-hover:text-white">{item.category}</h3>
                  <p className="text-sm text-[#475563] mb-12 italic font-medium group-hover:text-white/60">{item.context}</p>
                  <div className="flex items-baseline gap-4 pt-10 border-t border-slate-100 group-hover:border-white/10">
                    <span className="text-5xl font-black tracking-tighter text-[#0A52EF] group-hover:text-[#03B8FF]">{item.perSqFt}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-white/40">/ SQ FT</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "impact" && (
          <div className="animate-in fade-in duration-1000">
            <header className="mb-28 text-center">
              <span className="text-[10px] font-black text-[#0A52EF] uppercase tracking-[0.4em] mb-6 block">Executive Summary</span>
              <h2 className="brand-mask-text text-9xl leading-none tracking-tighter uppercase mb-6">ROI.</h2>
              <div className="h-1 w-20 bg-[#002C73] mx-auto" />
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {IMPACT_METRICS.map((metric, idx) => (
                <div key={idx} className="bg-white p-20 flex flex-col justify-between group rounded-[80px] border border-[#E2E8F0] hover:border-[#002C73] transition-all duration-700 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-10 py-10 opacity-5 group-hover:opacity-20 transition-opacity">
                    <metric.icon size={120} className="text-[#002C73]" />
                  </div>
                  <div className="mb-20">
                    <span className="text-[10px] font-black text-[#0A52EF] uppercase tracking-[0.5em] mb-8 block">{metric.category} — {metric.label}</span>
                    <div className="flex items-center gap-14">
                      <div className="text-slate-200 font-light line-through text-4xl serif italic">{metric.before}</div>
                      <div className="text-8xl font-black tracking-tighter text-[#002C73]">{metric.after}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-12 border-t border-slate-100">
                    <span className="text-lg font-black text-[#0A52EF] italic serif">{metric.savings} Savings Efficiency</span>
                    <ArrowRight size={32} className="text-[#0A52EF] group-hover:translate-x-4 transition-all duration-500" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-24 p-28 bg-[#002C73] rounded-[100px] text-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2093&auto=format&fit=crop')] opacity-10 blur-sm scale-110" />
              <h3 className="text-5xl font-normal italic serif mb-10 max-w-4xl mx-auto leading-tight text-white relative z-10">
                "Phase I automated the <span className="not-italic font-black tracking-tighter text-[#03B8FF] underline decoration-white/20 underline-offset-[16px]">last mile.</span> Phase II targets the source."
              </h3>
              <p className="text-white/60 text-xl font-medium max-w-2xl mx-auto leading-relaxed relative z-10">
                De-risking institutional knowledge by distilling every formula, margin, and product variable into a permanent ANC software asset.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* Corporate Footprint */}
      <footer className="mt-32 border-t border-[#E2E8F0] py-32 px-10 bg-white relative z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="space-y-10">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-[#002C73] text-white rounded-2xl flex items-center justify-center font-serif italic text-3xl shadow-2xl shadow-[#002C73]/30">a</div>
              <div>
                <p className="text-lg font-black text-[#002C73] tracking-tighter italic">anc</p>
                <p className="text-[10px] font-black text-[#0A52EF] uppercase tracking-[0.4em] mt-1">Digital Transformation Series</p>
              </div>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] leading-loose">
              Purchase HQ — NYC <br /> Proprietary Workflow Engine v1.8.0
            </p>
          </div>
          <div className="text-right space-y-6">
            <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-12">
              <a className="hover:text-[#0A52EF] transition-colors cursor-pointer">Security</a>
              <a className="hover:text-[#0A52EF] transition-colors cursor-pointer">Compliance</a>
              <a className="hover:text-[#0A52EF] transition-colors cursor-pointer">Service Network</a>
            </div>
            <a href="https://anc.com" className="text-xl font-black border-b-4 border-[#0A52EF] pb-4 hover:text-[#0A52EF] transition-all text-[#002C73] italic serif">anc.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
