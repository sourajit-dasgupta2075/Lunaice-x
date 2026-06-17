import { useState, useEffect } from "react";
import { Download, FileText, BarChart2, MapPin, Navigation2, CheckCircle, Share2, Loader2 } from "lucide-react";
import { TopHeader } from "./TopHeader";
import { getAnalysisResult, getDataset, AnalysisResult, Dataset, IceVolumeResult } from "../services/lunaiceApi";

interface ReportsPageProps {
  datasetId: number | null;
}

const DEFAULT_SECTIONS = [
  {
    title: "1. Mission Summary",
    icon: FileText, color: "#00E5FF",
    content: [ // Default content, will be overwritten by dynamic data
      { label: "Mission Name", value: "LUNAICE-X Alpha" },
      { label: "Target Region", value: "Lunar South Polar Region (85°S–90°S)" },
      { label: "Primary Objective", value: "Subsurface water ice detection and site selection" },
      { label: "Analysis Date", value: "2024-06-14" },
      { label: "Mission Status", value: "ALPHA — READY FOR DEPLOYMENT" },
      { label: "AI Confidence", value: "94.7% (High Confidence)" },
    ],
  },
  {
    title: "2. Dataset Sources",
    icon: BarChart2, color: "#8B5CF6",
    content: [
      { label: "Primary SAR", value: "Chandrayaan-2 DFSAR (S-Band, 75m res.)" },
      { label: "Elevation", value: "LRO LOLA DEM (100m grid)" },
      { label: "Hydrogen Map", value: "LRO LEND WEH (0.5°/pixel)" },
      { label: "PSR Boundaries", value: "LROC NAC shadow analysis" },
      { label: "Temperature", value: "LRO Diviner 2024 (annual mean)" },
      { label: "Optical", value: "LROC WAC 100m mosaic" },
    ],
  },
  {
    title: "3. Ice Detection Results",
    icon: CheckCircle, color: "#00FF88",
    content: [
      { label: "Zones Detected", value: "247 potential ice regions" },
      { label: "High Confidence (>80%)", value: "38 zones" },
      { label: "Highest Probability", value: "Shackleton Crater — 87.4%" },
      { label: "Estimated Total Volume", value: "3.2 GT water equivalent" },
      { label: "Total Ice Volume", value: "0.0 km³" },
      { label: "Total Ice Mass", value: "0.0 kg" },
      { label: "Equivalent Olympic Pools", value: "0" },
      { label: "Avg. Ice Depth", value: "1.2m subsurface" },
      { label: "Best AI Model", value: "Vision Transformer — 96.7% accuracy" },
    ],
  },
  {
    title: "4. Landing Site Analysis",
    icon: MapPin, color: "#1DA1FF",
    content: [
      { label: "Sites Evaluated", value: "5 candidate sites (A–E)" },
      { label: "Recommended Site", value: "Alpha — Shackleton Rim (94.2/100)" },
      { label: "Max Slope at Alpha", value: "1.8° (safe ≤5°)" },
      { label: "Surface Roughness", value: "0.09 (excellent)" },
      { label: "Ice Proximity", value: "0.4 km to nearest ice deposit" },
      { label: "Solar Coverage", value: "68% of lunar day" },
    ],
  },
  {
    title: "5. Rover Path Analysis",
    icon: Navigation2, color: "#FFB800",
    content: [
      { label: "Recommended Route", value: "Safest Route — 6.8 km" },
      { label: "Estimated Travel Time", value: "10.2 hours" },
      { label: "Hazard Zones Identified", value: "6 (3 PSR, 2 slope, 1 rough)" },
      { label: "Total Distance", value: "6.8 km" },
      { label: "Estimated Duration", value: "10.2 hours" },
      { label: "Energy Cost", value: "816 Wh" },
      { label: "Max Slope", value: "18.2°" },
      { label: "PSR Segments", value: "3" },
      { label: "Algorithm", value: "A* with slope + PSR cost weighting" },
      { label: "Feasible", value: "Yes" },
      { label: "Battery Usage", value: "39% consumed" },
      { label: "Risk Classification", value: "LOW" },
      { label: "Alternate Routes", value: "Fastest (4.2 km), Energy-Efficient (5.4 km)" },
    ],
  },
  {
    title: "6. Scientific Confidence",
    icon: CheckCircle, color: "#8B5CF6",
    content: [
      { label: "Multi-modal Fusion", value: "6 independent data streams" },
      { label: "False Positive Rate", value: "3.3%" },
      { label: "Cross-Validation Score", value: "94.1%" },
      { label: "Model Ensemble", value: "RF + XGBoost + CNN + ViT" },
      { label: "Data Coverage", value: "98.4% of target region" },
      { label: "Overall Confidence", value: "HIGH — Mission Approved" },
    ],
  },
];

export function ReportsPage({ datasetId }: ReportsPageProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (datasetId) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [analysisRes, datasetRes] = await Promise.all([
            getAnalysisResult(datasetId),
            getDataset(datasetId)
          ]);
          setAnalysis(analysisRes);
          setDataset(datasetRes);
        } catch (error) {
          console.error("Error fetching report data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [datasetId]);

  const sections = analysis && dataset ? DEFAULT_SECTIONS.map(section => {
    if (section.title.includes("1. Mission Summary")) {
      return {
        ...section,
        content: section.content.map(item => {
          if (item.label === "Mission Name") return { ...item, value: `LUNAICE-X: ${dataset.filename}` };
          if (item.label === "Analysis Date") return { ...item, value: new Date().toLocaleDateString() };
          if (item.label === "AI Confidence") return { ...item, value: `${(analysis.mean_probability * 100).toFixed(1)}%` };
          return item;
        })
      };
    }
    if (section.title.includes("3. Ice Detection Results")) {
      return {
        ...section,
        content: section.content.map(item => {
          if (item.label === "Zones Detected") return { ...item, value: `${analysis.regions_detected} potential ice regions` };
          if (item.label === "Mean Probability") return { ...item, value: `${(analysis.mean_probability * 100).toFixed(1)}%` };
          if (item.label === "Best AI Model") return { ...item, value: analysis.algorithm };
          return item;
        })
      };
    }
    return section;
  }) : DEFAULT_SECTIONS;

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#00E5FF", gap: 12 }}>
        <Loader2 className="animate-spin" size={24} />
        <span style={{ fontFamily: "JetBrains Mono", fontSize: 14 }}>GENERATING MISSION REPORT...</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopHeader title="Mission Report" subtitle="LUNAICE-X Scientific Analysis Report v1.0" />
      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Report header */}
        <div style={{
          background: "linear-gradient(135deg, rgba(0,229,255,0.08), rgba(139,92,246,0.08))",
          border: "1px solid rgba(0,229,255,0.2)", borderRadius: 14, padding: 24,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "radial-gradient(circle at 35% 35%, #D4DCE8, #6A7F96, #1A2845)",
                boxShadow: "0 0 20px rgba(0,229,255,0.4)",
              }} />
              <div>
                <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 20, color: "#00E5FF" }}>LUNAICE-X</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#7A8BA8", letterSpacing: "0.08em" }}>MISSION INTELLIGENCE PLATFORM</div>
              </div>
            </div>
            <div style={{ fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 24, color: "#E8EDF5", marginBottom: 6 }}>
              {dataset ? `Analysis Report: ${dataset.filename}` : "Lunar Subsurface Ice Detection Report"}
            </div>
            <div style={{ fontFamily: "Inter", fontSize: 14, color: "#7A8BA8", maxWidth: 560 }}>
              {analysis ? `AI-driven analysis using ${analysis.algorithm} for subsurface water ice characterization based on the current mission dataset.` : 
              "AI-driven analysis of Chandrayaan-2 DFSAR, DEM, Hydrogen Maps, PSR Boundaries, and Optical Imagery for subsurface water ice characterization in the Lunar South Polar Region."}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
              {[
                { label: "Date", value: "2024-06-14" },
                { label: "Version", value: "1.0 FINAL" },
                { label: "Classification", value: "MISSION READY" },
                { label: "Prepared for", value: dataset ? "Active Mission Dataset" : "ISRO / Mission Planning" },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8" }}>{m.label}</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#E8EDF5" }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
              background: "linear-gradient(135deg, #00E5FF, #1DA1FF)", color: "#050816",
              border: "none", borderRadius: 8, cursor: "pointer",
              fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 13,
              boxShadow: "0 0 20px rgba(0,229,255,0.3)",
            }}>
              <Download size={16} />
              Export PDF
            </button>
            <button style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
              background: "rgba(139,92,246,0.15)", color: "#8B5CF6",
              border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, cursor: "pointer",
              fontFamily: "Space Grotesk", fontWeight: 500, fontSize: 13,
            }}>
              <Share2 size={16} />
              Export Presentation
            </button>
          </div>
        </div>

        {/* Section grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <div key={i} style={{
                background: "rgba(10,16,34,0.8)", backdropFilter: "blur(12px)",
                border: `1px solid ${section.color}20`, borderRadius: 12, padding: 18,
                boxShadow: `0 0 24px ${section.color}08`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: `${section.color}15`, border: `1px solid ${section.color}35`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={16} style={{ color: section.color }} />
                  </div>
                  <div style={{ fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 14, color: "#E8EDF5" }}>
                    {section.title}
                  </div>
                </div>
                {section.content.map((row, j) => (
                  <div key={j} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    gap: 12,
                  }}>
                    <span style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8", flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#E8EDF5", textAlign: "right" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          background: "rgba(10,16,34,0.6)", border: "1px solid rgba(0,229,255,0.08)",
          borderRadius: 10, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#7A8BA8" }}>
            LUNAICE-X · Generated 2024-06-14 · Chandrayaan-2 Data Analysis Platform · ISRO Scientific Division
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF88", boxShadow: "0 0 6px #00FF88" }} />
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#00FF88" }}>MISSION APPROVED · ALPHA STATUS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
