import { useState, useEffect } from "react";
import { getIceDetectionOverview, IceRegion } from "../services/lunaiceApi";
import { TopHeader } from "./TopHeader";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { FlaskConical, Target, ShieldCheck, Activity } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  "Massive Subsurface Ice": "#00E5FF",
  "Regolith-Ice Mixture": "#8B5CF6",
  "Surface Frost": "#00FF88",
  "Lithic Scattering / Rock": "#FF4D6A",
};

export function IceCharacterization() {
  const [regions, setRegions] = useState<IceRegion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getIceDetectionOverview();
        setRegions(data.regions || []);
      } catch (err) {
        console.error("Failed to load characterization data", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Group data for Pie Chart
  const compositionData = Object.entries(
    regions.reduce((acc, r) => {
      acc[r.ice_type] = (acc[r.ice_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  if (loading) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#00E5FF" }}>CHARACTERIZING DEPOSITS...</div>;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopHeader title="Ice Characterization" subtitle="Multi-modal spectral signature analysis" />
      
      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Composition Chart */}
          <div style={{ background: "rgba(10,16,34,0.8)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 12, padding: 20 }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, color: "#E8EDF5", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <FlaskConical size={16} color="#00E5FF" /> Ice Type Distribution
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={compositionData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {compositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.name] || "#7A8BA8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#050816", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "Inter", paddingTop: 20 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "rgba(10,16,34,0.8)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(0,255,136,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck color="#00FF88" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#7A8BA8" }}>MEAN ICE PURITY</div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "JetBrains Mono", color: "#00FF88" }}>
                  {(regions.reduce((a, b) => a + b.purity_pct, 0) / regions.length || 0).toFixed(1)}%
                </div>
              </div>
            </div>
            <div style={{ background: "rgba(10,16,34,0.8)", border: "1px solid rgba(139,92,246,0.1)", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity color="#8B5CF6" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#7A8BA8" }}>AVG. CPR SIGNATURE</div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "JetBrains Mono", color: "#8B5CF6" }}>
                  {(regions.reduce((a, b) => a + b.cpr, 0) / regions.length || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div style={{ background: "rgba(10,16,34,0.8)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 16, borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600 }}>
            Deposit Classification Log
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ background: "rgba(255,255,255,0.02)", color: "#7A8BA8", textAlign: "left" }}>
              <tr>
                <th style={{ padding: 12 }}>Region ID</th>
                <th>Ice Type</th>
                <th>CPR (Anomalous)</th>
                <th>Estimated Purity</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {regions.map(r => (
                <tr key={r.region_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td style={{ padding: 12, fontFamily: "JetBrains Mono", color: "#00E5FF" }}>{r.region_id}</td>
                  <td style={{ color: "#E8EDF5" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: TYPE_COLORS[r.ice_type] || "#7A8BA8" }} />
                      {r.ice_type}
                    </div>
                  </td>
                  <td style={{ fontFamily: "JetBrains Mono", color: r.cpr > 1.2 ? "#00FF88" : "#7A8BA8" }}>{r.cpr.toFixed(2)}</td>
                  <td>
                    <div style={{ width: 80, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
                      <div style={{ width: `${r.purity_pct}%`, height: "100%", background: "#00E5FF", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 9, color: "#7A8BA8", marginTop: 2, display: "block" }}>{r.purity_pct}% PURE</span>
                  </td>
                  <td>
                    <span style={{ 
                      padding: "2px 6px", borderRadius: 4, 
                      background: r.probability > 0.8 ? "rgba(0,255,136,0.1)" : "rgba(255,184,0,0.1)", 
                      color: r.probability > 0.8 ? "#00FF88" : "#FFB800", fontSize: 10 
                    }}>
                      {(r.probability * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ 
          background: "linear-gradient(90deg, rgba(139,92,246,0.1), transparent)", 
          border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: 16, display: "flex", gap: 12 
        }}>
          <Target size={18} color="#8B5CF6" />
          <div style={{ fontSize: 11, color: "#7A8BA8", lineHeight: 1.5 }}>
            <strong style={{ color: "#E8EDF5", display: "block", marginBottom: 2 }}>Scientific Calibration Note:</strong>
            CPR (Circular Polarization Ratio) values &gt; 1.0 indicate subsurface volume scattering characteristic of ice. Values &gt; 1.4 inside PSR zones represent primary targets for massive ice extraction.
          </div>
        </div>
      </div>
    </div>
  );
}