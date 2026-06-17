import { useState, useEffect, useCallback } from "react";
import { Star, MapPin, CheckCircle, AlertTriangle, Cpu, Droplets } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { TopHeader } from "./TopHeader";
import { getMissionZones, getAnalysisResult, AnalysisResult } from "../services/lunaiceApi";

const sites = [
  {
    id: "A", name: "Alpha Site", crater: "Shackleton", lat: -89.67, lon: 0,
    score: 94.2, slope: 1.8, rough: 0.09, distIce: 0.4, sunlight: 68, ice: 87.4, temp: -163,
    color: "#00E5FF", recommended: true,
  },
  {
    id: "B", name: "Beta Site", crater: "Haworth", lat: -87.5, lon: -5.2,
    score: 87.1, slope: 3.2, rough: 0.14, distIce: 1.1, sunlight: 54, ice: 78.1, temp: -171,
    color: "#8B5CF6", recommended: false,
  },
  {
    id: "C", name: "Gamma Site", crater: "Nobile", lat: -85.2, lon: 53.5,
    score: 81.5, slope: 4.1, rough: 0.19, distIce: 1.8, sunlight: 42, ice: 72.3, temp: -178,
    color: "#1DA1FF", recommended: false,
  },
  {
    id: "D", name: "Delta Site", crater: "Amundsen", lat: -84.5, lon: -84.7,
    score: 74.8, slope: 5.2, rough: 0.24, distIce: 2.4, sunlight: 35, ice: 65.8, temp: -182,
    color: "#00FF88", recommended: false,
  },
  {
    id: "E", name: "Epsilon Site", crater: "Sverdrup", lat: -88.1, lon: -76.3,
    score: 68.3, slope: 3.8, rough: 0.21, distIce: 3.1, sunlight: 30, ice: 61.2, temp: -185,
    color: "#FFB800", recommended: false,
  },
];

function SiteCard({ site, selected, onClick }: { site: typeof sites[0]; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", border: `1px solid ${selected ? site.color + "60" : "rgba(255,255,255,0.07)"}`,
        background: selected ? `${site.color}10` : "rgba(10,16,34,0.6)",
        borderRadius: 10, padding: 14, cursor: "pointer", textAlign: "left",
        transition: "all 0.2s", boxShadow: selected ? `0 0 20px ${site.color}18` : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: `${site.color}20`, border: `2px solid ${site.color}60`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 12, color: site.color,
          }}>{site.id}</div>
          <div>
            <div style={{ fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 12, color: "#E8EDF5" }}>{site.name}</div>
            <div style={{ fontFamily: "Inter", fontSize: 10, color: "#7A8BA8" }}>{site.crater} Crater</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 700, color: site.color }}>{site.score}</div>
          <div style={{ fontFamily: "Inter", fontSize: 9, color: "#7A8BA8" }}>score</div>
        </div>
      </div>
      {[
        { label: "Slope", value: `${site.slope}°` },
        { label: "Roughness", value: site.rough.toFixed(2) },
        { label: "Ice dist.", value: `${site.distIce} km` },
      ].map((row) => (
        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
          <span style={{ fontFamily: "Inter", fontSize: 10, color: "#7A8BA8" }}>{row.label}</span>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#E8EDF5" }}>{row.value}</span>
        </div>
      ))}
      {site.recommended && (
        <div style={{
          marginTop: 8, display: "flex", alignItems: "center", gap: 5,
          background: "rgba(0,255,136,0.1)", borderRadius: 5, padding: "3px 8px",
          border: "1px solid rgba(0,255,136,0.25)",
        }}>
          <Star size={10} style={{ color: "#00FF88" }} />
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#00FF88" }}>AI RECOMMENDED</span>
        </div>
      )}
    </button>
  );
}

interface LandingAnalysisProps {
  selectedDatasetId?: number | null;
}

export function LandingAnalysis({ selectedDatasetId }: LandingAnalysisProps) {
  const [activeSites, setActiveSites] = useState(sites);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const loadZones = useCallback(async () => {
    try {
      const zones = await getMissionZones();
      if (zones && zones.length > 0) {
        // Map backend MissionZone to UI Site format
        const mapped = zones.map((z, i) => ({
          ...sites[i % sites.length], // Keep visual constants (color, slope etc)
          id: z.zone_id,
          name: z.name,
          lat: z.latitude,
          lon: z.longitude,
          score: z.accessibility_score,
          ice: z.ice_probability,
          recommended: z.recommended
        }));
        setActiveSites(mapped);
        setIsMock(false);
      }
    } catch (err) {
      console.error("Failed to fetch mission zones, using static data");
      setIsMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAnalysis = useCallback(async () => {
    if (!selectedDatasetId) return;
    try {
      const result = await getAnalysisResult(selectedDatasetId);
      setAnalysisResult(result);
    } catch (err) {
      console.error("No analysis results for this dataset");
    }
  }, [selectedDatasetId]);

  useEffect(() => {
    loadZones();
    loadAnalysis();
  }, [loadZones, loadAnalysis]);

  const site = activeSites[selected];

  const radarData = [
    { subject: "Safety", A: site.score },
    { subject: "Slope", A: (10 - site.slope) * 10 },
    { subject: "Sunlight", A: site.sunlight },
    { subject: "Ice Prox.", A: site.ice },
    { subject: "Surface", A: (1 - site.rough) * 100 },
    { subject: "Temp OK", A: Math.max(0, (site.temp + 200)) },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopHeader 
        title="Landing Site Analysis" 
        subtitle={isMock ? "⚠ OFFLINE · Using reference data" : "AI-ranked landing zones with safety assessment"} 
      />

      {/* Recommended banner */}
      <div style={{
        margin: "12px 16px 0",
        background: "linear-gradient(90deg, rgba(0,255,136,0.12), rgba(0,229,255,0.08))",
        border: "1px solid rgba(0,255,136,0.2)", borderRadius: 10, padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle size={20} style={{ color: "#00FF88" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 14, color: "#00FF88" }}>
            Recommended: {activeSites.find(s => s.recommended)?.name || "Analyzing Site"} ({activeSites.find(s => s.recommended)?.crater || "Calculating"} Crater)
          </div>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: "#7A8BA8", marginTop: 2 }}>
            Score {activeSites.find(s => s.recommended)?.score.toFixed(1)}/100 · 
            Lowest slope at {activeSites.find(s => s.recommended)?.slope}° · 
            {activeSites.find(s => s.recommended)?.distIce} km from highest-probability ice deposit
          </div>
        </div>
        <div style={{ fontFamily: "JetBrains Mono", fontSize: 24, fontWeight: 700, color: "#00FF88" }}>94.2</div>
      </div>
      
      <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: "12px 16px 16px", gap: 14 }}>
        {/* Site list */}
        <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
          {activeSites.map((s, i) => (
            <SiteCard key={s.id} site={s} selected={selected === i} onClick={() => setSelected(i)} />
          ))}
        </div>

        {/* Main analysis */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Site detail header */}
          <div style={{
            background: "rgba(10,16,34,0.8)", border: `1px solid ${site.color}30`,
            borderRadius: 12, padding: 18,
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14,
          }}>
            {[
              { label: "Landing Score", value: site.score.toFixed(1), unit: "/100", color: site.color },
              { label: "Max Slope", value: `${site.slope}°`, unit: "", color: site.slope < 3 ? "#00FF88" : "#FFB800" },
              { label: "Surface Roughness", value: site.rough.toFixed(2), unit: "", color: site.rough < 0.15 ? "#00FF88" : "#FFB800" },
              { label: "Distance to Ice", value: `${site.distIce}`, unit: "km", color: site.distIce < 1 ? "#00FF88" : "#7A8BA8" },
            ].map((m) => (
              <div key={m.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 26, fontWeight: 700, color: m.color }}>
                  {m.value}<span style={{ fontSize: 12, opacity: 0.7 }}>{m.unit}</span>
                </div>
                <div style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8", marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Radar chart */}
            <div style={{
              background: "rgba(10,16,34,0.8)", border: "1px solid rgba(0,229,255,0.1)",
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5", marginBottom: 12 }}>
                Site Comparison Radar
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(0,229,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: "#7A8BA8" }} />
                  <Tooltip contentStyle={{ background: "#0D1530", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 6, fontFamily: "JetBrains Mono", fontSize: 10 }} />
                  <Radar name={site.name} dataKey="A" stroke={site.color} fill={site.color} fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Site details */}
            <div style={{
              background: "rgba(10,16,34,0.8)", border: "1px solid rgba(0,229,255,0.1)",
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5", marginBottom: 12 }}>
                {site.name} · Site Details
              </div>
              {[
                { label: "Coordinates", value: `${site.lat}°, ${site.lon}°` },
                { label: "Parent Crater", value: site.crater },
                { label: "Mean Temperature", value: `${site.temp}°C` },
                { label: "Solar Coverage", value: `${site.sunlight}%` },
                { label: "Ice Probability", value: `${site.ice}%` },
                { label: "Overall Safety", value: `${site.score}/100` },
              ].map((row) => (
                <div key={row.label} style={{
                  display: "flex", justifyContent: "space-between", padding: "8px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <span style={{ fontFamily: "Inter", fontSize: 12, color: "#7A8BA8" }}>{row.label}</span>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#E8EDF5" }}>{row.value}</span>
                </div>
              ))}

              <div style={{ marginTop: 14, background: "rgba(0,229,255,0.06)", borderRadius: 8, padding: "10px 12px", border: "1px solid rgba(0,229,255,0.12)" }}>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8", letterSpacing: "0.08em", marginBottom: 4 }}>AI MISSION RATIONALE</div>
                <div style={{ fontFamily: "Inter", fontSize: 11, color: "#E8EDF5", lineHeight: 1.6 }}>
                  {site.recommended
                    ? "Optimal balance of flat terrain, proximity to ice-rich PSR zones, and sustained solar power availability. Minimal hazard exposure with highest overall mission safety."
                    : "Secondary candidate with acceptable slope and surface conditions. Higher distance to primary ice deposits may require extended rover traversal."}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Results Integration */}
          {analysisResult && (
            <div style={{
              background: "rgba(10,16,34,0.8)", border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Cpu size={16} style={{ color: "#8B5CF6" }} />
                  <span style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>
                    Detection Evidence · {analysisResult.algorithm}
                  </span>
                </div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#7A8BA8" }}>
                  Proc. Time: {analysisResult.processing_time_s}s
                </div>
              </div>
              
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ color: "#7A8BA8", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <th style={{ padding: "8px 4px" }}>Region</th>
                      <th>Coords (Lat/Lon)</th>
                      <th>Est. Depth</th>
                      <th>Probability</th>
                      <th>Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.regions.map(region => (
                      <tr key={region.region_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "8px 4px", color: "#E8EDF5" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Droplets size={10} color="#00E5FF" />
                            {region.region_id}
                          </div>
                        </td>
                        <td style={{ fontFamily: "JetBrains Mono", color: "#7A8BA8" }}>
                          {region.latitude.toFixed(2)}°, {region.longitude.toFixed(2)}°
                        </td>
                        <td style={{ color: "#E8EDF5" }}>{region.depth_m}m</td>
                        <td>
                          <div style={{ 
                            padding: "2px 6px", borderRadius: 4, background: "rgba(0,255,136,0.1)", 
                            color: "#00FF88", display: "inline-block", fontSize: 10
                          }}>
                            {(region.probability * 100).toFixed(1)}%
                          </div>
                        </td>
                        <td style={{ color: "#7A8BA8" }}>{region.area_km2} km²</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
