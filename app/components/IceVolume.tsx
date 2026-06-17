import { useState, useEffect } from "react";
import { getLatestIceVolume, IceVolumeResult, IceVolumeBreakdown } from "../services/lunaiceApi";
import { TopHeader } from "./TopHeader";

export function IceVolume() {
  const [data, setData] = useState<IceVolumeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVolume = async () => {
      try {
        const res = await getLatestIceVolume();
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load ice volume estimation.");
      } finally {
        setLoading(false);
      }
    };
    fetchVolume();
  }, []);

  if (loading)
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400" /></div>;

  if (error)
    return <div className="p-6 text-red-400 bg-red-950/30 rounded-lg border border-red-800 m-6">⚠ {error}</div>;

  if (!data) return null;

  const maxVol = Math.max(...data.regions.map(r => r.volume_km3));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopHeader title="Ice Volume Estimator" subtitle="Quantitative subsurface H2O resource estimates" />
      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "white" }}>Resource Assessment</h1>
          <p style={{ color: "#7A8BA8", marginTop: 4 }}>Method: Colaprete et al. (2010) calibrated against DFSAR datasets.</p>
        </div>

        {/* Formula box */}
        <div style={{ background: "rgba(13,21,48,0.9)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 10, color: "#7A8BA8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Estimation Formula</p>
          <p style={{ fontFamily: "JetBrains Mono", color: "#00E5FF", fontSize: 13 }}>
            Volume (m³) = Area (m²) × Depth (m) × (Concentration% ÷ 100)
          </p>
          <p style={{ fontFamily: "JetBrains Mono", color: "#00E5FF", fontSize: 13, marginTop: 4 }}>
            Mass (kg)  = Volume × 917 kg/m³ <span style={{ color: "#7A8BA8" }}>(ice density)</span>
          </p>
          <p style={{ fontSize: 11, color: "#7A8BA8", marginTop: 10, fontStyle: "italic" }}>{data.methodology}</p>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { label: "Total Volume", value: `${data.total_volume_km3.toFixed(4)}`, unit: "km³", color: "#00E5FF" },
            { label: "Total Mass", value: `${(data.total_mass_kg / 1e9).toFixed(2)}`, unit: "Tg", color: "#8B5CF6" },
            { label: "Metric Tons", value: data.total_mass_metric_tons.toLocaleString(), unit: "MT", color: "#1DA1FF" },
            { label: "Olympic Pools", value: `${data.equivalent_olympic_pools.toFixed(0)}`, unit: "units", color: "#00FF88" },
          ].map((card) => (
            <div key={card.label} style={{ background: "rgba(10,16,34,0.8)", border: `1px solid ${card.color}30`, borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 10, color: "#7A8BA8", textTransform: "uppercase", marginBottom: 6 }}>{card.label}</p>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 700, color: card.color }}>
                {card.value} <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>{card.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Per-region breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "white" }}>Per-Region Breakdown</h2>
          {data.regions.map(r => <RegionVolumeCard key={r.region_id} region={r} maxVol={maxVol} />)}
        </div>

        {/* Scale comparison */}
        <ScaleComparison totalMassKg={data.total_mass_kg} pools={data.equivalent_olympic_pools} />
      </div>
    </div>
  );
}

function RegionVolumeCard({ region: r, maxVol }: { region: IceVolumeBreakdown; maxVol: number }) {
  const barPct = maxVol > 0 ? (r.volume_km3 / maxVol) * 100 : 0;
  return (
    <div style={{ background: "rgba(10,16,34,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontFamily: "JetBrains Mono", color: "#E8EDF5", fontWeight: 600 }}>{r.region_id}</span>
        <span style={{ fontFamily: "JetBrains Mono", color: "#00E5FF", fontSize: 12 }}>{r.volume_km3.toFixed(6)} km³</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2, marginBottom: 16 }}>
        <div style={{ width: `${barPct}%`, height: "100%", background: "linear-gradient(90deg, #00E5FF, #8B5CF6)", borderRadius: 2 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { label: "Area", value: `${r.area_km2} km²` },
          { label: "Est. Depth", value: `${r.depth_m} m` },
          { label: "Conc.", value: `${r.concentration_pct}%` },
          { label: "Mass", value: `${(r.mass_kg / 1e6).toFixed(2)} Gg` },
          { label: "Vol (L)", value: r.volume_liters.toLocaleString() },
          { label: "Pools", value: r.equivalent_olympic_pools.toFixed(1) },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(0,0,0,0.2)", padding: "6px 10px", borderRadius: 6 }}>
            <div style={{ fontSize: 9, color: "#7A8BA8", marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: "#E8EDF5", fontFamily: "JetBrains Mono" }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScaleComparison({ totalMassKg, pools }: { totalMassKg: number; pools: number }) {
  const comparisons = [
    { label: "Olympic Swimming Pools", value: pools.toFixed(1), icon: "🏊" },
    { label: "ISS Crew (6) Supply Days", value: Math.round(totalMassKg / 3 / 365).toLocaleString(), icon: "🚀" },
    { label: "H2+O2 Rocket Launches", value: Math.round(totalMassKg / 800000).toLocaleString(), icon: "🛸" },
    { label: "Moon Base (12) Years", value: Math.round(totalMassKg / (12 * 730)).toLocaleString(), icon: "🌕" },
  ];
  return (
    <div style={{ background: "rgba(10,16,34,0.8)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 12, padding: 20 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 4 }}>Resource Scale Perspective</h2>
      <p style={{ fontSize: 11, color: "#7A8BA8", marginBottom: 16 }}>Operational benchmarks if 100% of detected ice is recovered.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {comparisons.map(c => (
          <div key={c.label} style={{ textAlign: "center", background: "rgba(0,229,255,0.04)", padding: 16, borderRadius: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#00E5FF", fontFamily: "JetBrains Mono" }}>{c.value}</div>
            <div style={{ fontSize: 9, color: "#7A8BA8", marginTop: 4, lineHeight: 1.3 }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}