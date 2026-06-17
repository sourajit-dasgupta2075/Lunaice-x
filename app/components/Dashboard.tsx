import { useState, useEffect, useCallback } from "react";
import {
  getDashboardStats,
  getIceDetectionOverview,
  DashboardStats,
  IceRegion,
} from "../services/lunaiceApi";
import {
  Droplets,
  MapPin,
  FlaskConical,
  TrendingUp,
  Activity
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { TopHeader } from "./TopHeader";

function KPICard({ label, value, unit, sub, icon: Icon, color, trend }: {
  label: string; value: string; unit: string; sub: string; icon: any; color: string; trend?: string;
}) {
  const [count, setCount] = useState(0);
  const target = parseFloat(value.replace(/,/g, ""));

  useEffect(() => {
    let start = 0;
    const steps = 40;
    const inc = Math.max(target / steps, 0.1);
    const timer = setInterval(() => {
      start += inc;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else if (target % 1 === 0) setCount(Math.floor(start));
      else setCount(parseFloat(start.toFixed(1)));
    }, 30);
    return () => clearInterval(timer);
  }, [target]);

  const displayVal = isNaN(target) ? value : (count >= 1000 ? count.toLocaleString() : count.toFixed(target % 1 !== 0 ? 1 : 0));

  return (
    <div style={{
      background: "rgba(10,16,34,0.8)", backdropFilter: "blur(16px)",
      border: `1px solid ${color}22`, borderRadius: 12, padding: "20px",
      position: "relative", overflow: "hidden",
      boxShadow: `0 4px 30px ${color}0A, inset 0 1px 0 ${color}18`,
      transition: "border-color 0.3s, box-shadow 0.3s",
      cursor: "default",
    }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = `${color}55`;
        el.style.boxShadow = `0 8px 40px ${color}20`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = `${color}22`;
        el.style.boxShadow = `0 4px 30px ${color}0A, inset 0 1px 0 ${color}18`;
      }}
    >
      <div style={{
        position: "absolute", top: 0, right: 0, width: 100, height: 100,
        background: `radial-gradient(circle at 80% 20%, ${color}12, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}15`, border: `1px solid ${color}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={20} style={{ color }} />
        </div>
        {trend && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(0,255,136,0.1)", borderRadius: 6,
            padding: "3px 8px",
          }}>
            <TrendingUp size={11} style={{ color: "#00FF88" }} />
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#00FF88" }}>{trend}</span>
          </div>
        )}
      </div>
      <div style={{ fontFamily: "JetBrains Mono", fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
        {displayVal}
        <span style={{ fontSize: 13, fontWeight: 400, color: `${color}99`, marginLeft: 4 }}>{unit}</span>
      </div>
      <div style={{ fontFamily: "Space Grotesk", fontSize: 13, color: "#E8EDF5", marginTop: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8", marginTop: 3 }}>{sub}</div>
    </div>
  );
}

const iceData = [
  { name: "Jan", detected: 32, confirmed: 18, depth: 0.8 },
  { name: "Feb", detected: 45, confirmed: 28, depth: 1.1 },
  { name: "Mar", detected: 58, confirmed: 35, depth: 1.3 },
  { name: "Apr", detected: 71, confirmed: 44, depth: 1.5 },
  { name: "May", detected: 89, confirmed: 58, depth: 1.7 },
  { name: "Jun", detected: 112, confirmed: 74, depth: 2.0 },
  { name: "Jul", detected: 134, confirmed: 91, depth: 2.2 },
  { name: "Aug", detected: 156, confirmed: 108, depth: 2.4 },
  { name: "Sep", detected: 178, confirmed: 125, depth: 2.6 },
  { name: "Oct", detected: 203, confirmed: 148, depth: 2.8 },
  { name: "Nov", detected: 225, confirmed: 167, depth: 3.0 },
  { name: "Dec", detected: 247, confirmed: 189, depth: 3.2 },
];

const regionData = [
  { region: "Shackleton", prob: 87, area: 42 },
  { region: "Haworth", prob: 78, area: 31 },
  { region: "Nobile", prob: 72, area: 28 },
  { region: "Amundsen", prob: 65, area: 19 },
  { region: "Sverdrup", prob: 61, area: 15 },
];

const radarData = [
  { subject: "DFSAR CPR", A: 92 },
  { subject: "H-Map", A: 85 },
  { subject: "PSR Cover", A: 78 },
  { subject: "DEM Slope", A: 88 },
  { subject: "Optical", A: 70 },
  { subject: "Temp", A: 94 },
];

const alertItems = [
  { type: "warning", msg: "High CPR anomaly in Shackleton Sector B", time: "2m ago" },
  { type: "info", msg: "New DEM dataset uploaded – processing complete", time: "14m ago" },
  { type: "success", msg: "Landing site Alpha confirmed – safety score 96%", time: "1h ago" },
  { type: "info", msg: "Rover path recalculated – energy saving 12%", time: "2h ago" },
];

const TYPE_COLORS: Record<string, string> = {
  "Massive Subsurface Ice": "#00E5FF",
  "Regolith-Ice Mixture": "#8B5CF6",
  "Surface Frost": "#00FF88",
  "Lithic Scattering / Rock": "#FF4D6A",
  "Unknown": "#7A8BA8",
};

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [regions, setRegions] = useState<IceRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, overview] = await Promise.all([
        getDashboardStats(),
        getIceDetectionOverview(),
      ]);
      setStats(statsData);
      setRegions(overview.regions || []);
      setIsMock(false);
    } catch (err) {
      console.error("Dashboard API failed, falling back to mock data:", err);
      setIsMock(true);
      setStats({
        total_datasets: 12,
        total_regions_detected: 247,
        high_confidence_regions: 38,
        mean_ice_probability: 84.2,
        total_coverage_km2: 124.5,
        recommended_mission_zones: 5,
        last_updated: new Date().toISOString(),
        ice_type_breakdown: [
          { ice_type: "Massive Subsurface Ice", count: 42, mean_purity_pct: 82.5 },
          { ice_type: "Regolith-Ice Mixture", count: 128, mean_purity_pct: 34.2 },
          { ice_type: "Surface Frost", count: 65, mean_purity_pct: 12.8 },
          { ice_type: "Lithic Scattering / Rock", count: 12, mean_purity_pct: 4.1 },
        ]
      });
      // Map static data to the regions state as fallback
      setRegions((regionData || []).map(r => ({
        region_id: r.region,
        probability: r.prob,
        area_km2: r.area,
        latitude: 0, longitude: 0, depth_m: 0, concentration_pct: 0,
        cpr: 0, // Default value for mock data
        ice_type: "Unknown", // Default value for mock data
        purity_pct: 0 // Default value for mock data
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    loadDashboardData();
  }, [loadDashboardData]);

  const dynamicRegionData =
  (regions && regions.length > 0)
    ? regions.filter(r => r && r.region_id).map((r) => ({
        region: r.region_id,
        // Ensure probability is on a 0-100 scale for the chart
        prob: (r.probability || 0) > 1 ? r.probability : (r.probability || 0) * 100,
        area: r.area_km2 || 0,
      })).slice(0, 5)
    : regionData;

  if (loading && !stats) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#00E5FF",
          fontFamily: "JetBrains Mono",
        }}
      >
        Loading Dashboard...
      </div>
    );
  }

  if (!stats) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#FF4D6A",
          fontFamily: "JetBrains Mono",
        }}
      >
        Failed to load dashboard data
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopHeader 
        title="Mission Dashboard" 
        subtitle={isMock 
          ? "⚠ OFFLINE MODE · Using simulated data (API unreachable)" 
          : "LUNAICE-X · Real-time Mission Intelligence"
        } 
      />
      <div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    padding: "12px 24px 0 24px",
  }}
>
  <button
    onClick={loadDashboardData}
    disabled={loading}
    style={{
      background: "rgba(0,229,255,0.1)",
      border: "1px solid rgba(0,229,255,0.3)",
      color: "#00E5FF",
      borderRadius: 8,
      padding: "8px 14px",
      cursor: "pointer",
      fontFamily: "JetBrains Mono",
      fontSize: 11,
    }}
  >
    {loading ? "Refreshing..." : "Refresh Data"}
  </button>
</div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        {/* KPI Row */}
      <div
        style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
     }}
>
  <KPICard
    label="Detected Ice Regions"
    value={(stats?.total_regions_detected ?? 0).toString()}
    unit="zones"
    sub="ML-detected deposits"
    icon={Droplets}
    color="#00E5FF"
  />

  <KPICard
    label="Mean Ice Probability"
    value={(stats?.mean_ice_probability ?? 0).toFixed(1)}
    unit="%"
    sub="Average confidence"
    icon={Activity}
    color="#8B5CF6"
  />

  <KPICard
    label="Mission Landing Zones"
    value={(stats?.recommended_mission_zones ?? 0).toString()}
    unit="sites"
    sub="Recommended locations"
    icon={MapPin}
    color="#00FF88"
  />

  <KPICard
    label="Ice Coverage (Total)"
    value={(stats?.total_coverage_km2 ?? 0).toFixed(1)}
    unit="km²"
    sub="Potential resource area"
    icon={FlaskConical}
    color="#1DA1FF"
  />
</div>

        {/* Charts Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          {/* Ice Detection Timeline */}
          <div style={{
            background: "rgba(10,16,34,0.8)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(0,229,255,0.12)", borderRadius: 12, padding: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, color: "#E8EDF5" }}>Ice Detection Timeline</div>
                <div style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8" }}>Cumulative detections — 2024</div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {[{ label: "Detected", color: "#00E5FF" }, { label: "Confirmed", color: "#8B5CF6" }].map(l => (
                  <div key={l.label} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                    <span style={{ fontFamily: "Inter", fontSize: 10, color: "#7A8BA8" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={iceData}>
                <defs>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "#7A8BA8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "#7A8BA8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#0D1530", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 11 }}
                  labelStyle={{ color: "#E8EDF5" }} itemStyle={{ color: "#00E5FF" }}
                />
                <Area type="monotone" dataKey="detected" stroke="#00E5FF" strokeWidth={2} fill="url(#cyanGrad)" />
                <Area type="monotone" dataKey="confirmed" stroke="#8B5CF6" strokeWidth={2} fill="url(#purpleGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Radar chart */}
          <div style={{
            background: "rgba(10,16,34,0.8)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(0,229,255,0.12)", borderRadius: 12, padding: 20,
          }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, color: "#E8EDF5", marginBottom: 4 }}>Data Layer Coverage</div>
            <div style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8", marginBottom: 8 }}>Quality score per dataset</div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(0,229,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: "#7A8BA8" }} />
                <Radar name="Score" dataKey="A" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Region probability */}
          <div style={{
            background: "rgba(10,16,34,0.8)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(0,229,255,0.12)", borderRadius: 12, padding: 20,
          }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, color: "#E8EDF5", marginBottom: 4 }}>Top Ice Regions by Probability</div>
            <div style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8", marginBottom: 16 }}>AI confidence scores</div>
            <ResponsiveContainer width="100%" height={180}>
              {/* Create a copy before sorting to avoid mutating constants */}
              <BarChart data={[...dynamicRegionData].sort((a, b) => ((b as any).prob || 0) - ((a as any).prob || 0))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: "#7A8BA8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="region" tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "#E8EDF5" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0D1530", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 11 }} />
                <Bar dataKey="prob" fill="#00E5FF" fillOpacity={0.8} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ice Type Distribution - NEW */}
          <div style={{
            background: "rgba(10,16,34,0.8)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(0,229,255,0.12)", borderRadius: 12, padding: 20,
          }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, color: "#E8EDF5", marginBottom: 4 }}>Ice Type Distribution</div>
            <div style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8", marginBottom: 8 }}>Aggregated across all analyses</div>
            {(stats?.ice_type_breakdown && stats.ice_type_breakdown.length > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.ice_type_breakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.ice_type_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.ice_type] || TYPE_COLORS["Unknown"]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0D1530", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 11 }}
                    labelStyle={{ color: "#E8EDF5" }}
                    formatter={(value: any, name: any, item: any) => {
                      const payload = item?.payload || item;
                      if (payload) {
                        const purity = typeof payload.mean_purity_pct === 'number' ? payload.mean_purity_pct.toFixed(1) : "0.0";
                        return [`${value} regions`, payload.ice_type || "Unknown", `Purity: ${purity}%`];
                      }
                      return [value, name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 10, fontFamily: "Inter", paddingTop: 10 }}
                    formatter={(value: any, entry: any) => {
                      const payload = entry?.payload || entry;
                      if (payload && payload.ice_type) {
                        return <span style={{ color: entry.color }}>{payload.ice_type} ({payload.count || 0})</span>;
                      }
                      return value;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ fontFamily: "Inter", fontSize: 12, color: "#7A8BA8", textAlign: "center", padding: 40 }}>
                No ice type data available yet. Run an analysis!
              </div>
            )}
          </div>

          {/* Alerts */}
          <div style={{
            background: "rgba(10,16,34,0.8)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(0,229,255,0.12)", borderRadius: 12, padding: 20,
          }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, color: "#E8EDF5", marginBottom: 4 }}>Mission Alerts</div>
            <div style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8", marginBottom: 16 }}>Real-time system events</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {alertItems.map((a, i) => {
                const colors: Record<string, string> = { warning: "#FFB800", info: "#00E5FF", success: "#00FF88" };
                const color = colors[a.type];
                return (
                  <div key={i} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    background: `${color}08`, border: `1px solid ${color}20`,
                    borderRadius: 8, padding: "10px 12px",
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, marginTop: 5, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "Inter", fontSize: 12, color: "#E8EDF5" }}>{a.msg}</div>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8", marginTop: 2 }}>{a.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
