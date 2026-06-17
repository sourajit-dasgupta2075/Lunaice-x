import { useState, useEffect } from "react";
import { Cpu, Activity, Clock, Layers, Droplets, Map as MapIcon, ChevronLeft } from "lucide-react";
import { TopHeader } from "./TopHeader";
import { getAnalysisResult, AnalysisResult } from "../services/lunaiceApi";

interface AnalysisPageProps {
  datasetId: number | null;
}

export function AnalysisPage({ datasetId }: AnalysisPageProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientId] = useState(() => {
    try {
      return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    } catch {
      return "client-" + Math.random().toString(36).substring(2, 9);
    }
  });

  const loadResults = async () => {
    if (!datasetId) {
      setError("No dataset selected for analysis.");
      setLoading(false);
      return;
    }
    try {
      const data = await getAnalysisResult(datasetId);
      console.log("Analysis Response from Backend:", data); // Debugging log
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to load analysis results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();

    // Set up WebSocket connection for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/${clientId}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (
        (message.type === "ANALYSIS_COMPLETED" || message.type === "ANALYSIS_FAILED") &&
        message.dataset_id === datasetId
      ) {
        console.log("Received WebSocket notification:", message);
        loadResults(); // Refresh data now that analysis is done
      }
    };

    socket.onerror = (err) => console.error("WebSocket Error:", err);

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [datasetId, clientId]);

  if (loading || (result && result.status === "processing")) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#00E5FF", fontFamily: "JetBrains Mono" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Activity className="animate-spin" size={32} />
          <span>RETRIEVING SPECTRAL ANALYSIS...</span>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#FF4D6A", padding: 40, textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 24, marginBottom: 12 }}>⚠ ANALYSIS ERROR</div>
          <div style={{ color: "#7A8BA8", fontFamily: "Inter" }}>{error || "Unknown error occurred"}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopHeader title={`Analysis Results: Dataset #${datasetId}`} subtitle={`Algorithm: ${result.algorithm}`} />
      
      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { label: "Status", value: result.status.toUpperCase(), icon: Layers, color: "#00FF88" },
            { label: "Time Taken", value: `${result.processing_time_s}s`, icon: Clock, color: "#00E5FF" },
            { label: "Detected Regions", value: result.regions_detected, icon: MapIcon, color: "#8B5CF6" },
            { label: "Mean Probability", value: `${(result.mean_probability * 100).toFixed(1)}%`, icon: Activity, color: "#1DA1FF" },
            { label: "Total Ice Volume", value: `${(result.ice_volume_estimate?.total_volume_km3 ?? 0).toFixed(3)}`, unit: "km³", icon: Droplets, color: "#00FF88" },
            { label: "Total Ice Mass", value: `${((result.ice_volume_estimate?.total_mass_kg ?? 0) / 1e12).toFixed(2)}`, unit: "trillion kg", icon: Droplets, color: "#FFB800" },
            { label: "Olympic Pools", value: `${(result.ice_volume_estimate?.equivalent_olympic_pools ?? 0).toLocaleString()}`, icon: Droplets, color: "#FF4D6A" },
          ].map((card, i) => (
            <div key={i} style={{ background: "rgba(10,16,34,0.8)", border: `1px solid ${card.color}30`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#7A8BA8", fontSize: 11, marginBottom: 8 }}>
                <card.icon size={14} /> {card.label}
              </div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 22, fontWeight: 700, color: card.color }}>
                {card.value}
                {card.unit && <span style={{ fontSize: 13, fontWeight: 400, color: `${card.color}99`, marginLeft: 4 }}>{card.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Regions Table */}
        <div style={{ background: "rgba(10,16,34,0.8)", borderRadius: 12, border: "1px solid rgba(0,229,255,0.1)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
            <Droplets size={16} color="#00E5FF" />
            <span style={{ fontWeight: 600, color: "#E8EDF5" }}>Detected Ice Deposits</span>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#7A8BA8", textAlign: "left", background: "rgba(255,255,255,0.02)" }}>
                  <th style={{ padding: 14 }}>Region ID</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Depth (m)</th>
                  <th>Probability</th>
                  <th>Confidence</th>
                  <th>Concentration</th>
                  <th>Area (km²)</th>
                </tr>
              </thead>
              <tbody>
                {result.regions.map((region) => (
                  <tr key={region.region_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: 14, color: "#00E5FF", fontFamily: "JetBrains Mono" }}>{region.region_id}</td>
                    <td style={{ color: "#E8EDF5" }}>{region.latitude.toFixed(4)}°</td>
                    <td style={{ color: "#E8EDF5" }}>{region.longitude.toFixed(4)}°</td>
                    <td style={{ color: "#7A8BA8" }}>{region.depth_m}m</td>
                    <td>
                      <div style={{ 
                        display: "inline-block", padding: "2px 8px", borderRadius: 4, 
                        background: "rgba(0,255,136,0.1)", color: "#00FF88", fontSize: 11 
                      }}>
                        {(region.probability * 100).toFixed(1)}%
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const prob = region.probability;
                        let label = "Low";
                        let color = "#FF4D6A";
                        if (prob > 0.8) { label = "High"; color = "#00FF88"; }
                        else if (prob > 0.5) { label = "Medium"; color = "#FFB800"; }
                        return (
                          <div style={{ 
                            padding: "2px 8px", borderRadius: 4, 
                            background: `${color}15`, color: color, 
                            fontSize: 10, display: "inline-block",
                            border: `1px solid ${color}30`,
                            fontFamily: "JetBrains Mono"
                          }}>
                            {label}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ color: "#E8EDF5" }}>{region.concentration_pct}%</td>
                    <td style={{ color: "#7A8BA8" }}>{region.area_km2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dashboard Integration Footer */}
        <div style={{
          marginTop: "auto", padding: "16px 24px", borderRadius: 12,
          background: "linear-gradient(90deg, rgba(0,229,255,0.05), rgba(139,92,246,0.05))",
          border: "1px solid rgba(0,229,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div style={{ color: "#7A8BA8", fontSize: 12, fontFamily: "Inter" }}>
            Mission intelligence has been updated. This analysis is now aggregated into global dashboard statistics.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#00FF88", fontSize: 11, fontFamily: "JetBrains Mono", flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF88", boxShadow: "0 0 8px #00FF88" }} />
            DATA PERSISTED
          </div>
        </div>
      </div>
    </div>
  );
}