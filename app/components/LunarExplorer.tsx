import { useState, useRef, useEffect } from "react";
import { Layers, Info, Map as MapIcon, Maximize, Target, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { TopHeader } from "./TopHeader";
import { getAnalysisResult, IceRegion } from "../services/lunaiceApi";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// Required for Cesium to find its static assets (workers, images, etc.)
(window as any).CESIUM_BASE_URL = "/node_modules/cesium/Build/Cesium/";

const layers = [
  { id: "hydrogen", label: "Hydrogen Map", color: "#00E5FF", active: true },
  { id: "dfsar", label: "DFSAR CPR", color: "#8B5CF6", active: true },
  { id: "dem", label: "DEM Elevation", color: "#1DA1FF", active: false },
  { id: "slope", label: "Slope Map", color: "#FFB800", active: false },
  { id: "psr", label: "PSR Shadows", color: "#FF6B35", active: true },
  { id: "optical", label: "Optical Imagery", color: "#00FF88", active: false },
];

const features = [
  { name: "Shackleton Crater", lat: -89.67, lon: 0, h: 4.2, slope: 2.1, elev: -4280, rough: 0.12, ice: 87.4, color: "#00E5FF" },
  { name: "Haworth Crater", lat: -87.5, lon: -5.2, h: 3.8, slope: 3.4, elev: -3820, rough: 0.18, ice: 78.1, color: "#8B5CF6" },
  { name: "Nobile Crater", lat: -85.2, lon: 53.5, h: 2.9, slope: 4.1, elev: -3210, rough: 0.21, ice: 72.3, color: "#1DA1FF" },
  { name: "Amundsen Crater", lat: -84.5, lon: -84.7, h: 2.1, slope: 5.2, elev: -2900, rough: 0.25, ice: 65.8, color: "#00FF88" },
  { name: "Sverdrup Crater", lat: -88.1, lon: -76.3, h: 1.8, slope: 3.8, elev: -2560, rough: 0.19, ice: 61.2, color: "#FFB800" },
];

interface MoonMapProps {
  selectedFeature: number | null;
  onSelect: (i: number) => void;
  analysisRegions?: IceRegion[];
  activeLayers: Set<string>;
}

function MoonMap({ selectedFeature, onSelect, analysisRegions = [], activeLayers }: MoonMapProps) {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!cesiumContainerRef.current) return;

    // Initialize Viewer
    const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
      baseLayer: new Cesium.ImageryLayer(new Cesium.GridImageryProvider()),
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      selectionIndicator: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      timeline: false,
      animation: false,
      fullscreenButton: false,
      scene3DOnly: true,
    });

    // Set background to black
    viewer.scene.backgroundColor = Cesium.Color.BLACK;
    viewer.scene.skyBox.show = false;
    viewer.scene.sun.show = false;
    viewer.scene.moon.show = false;

    // Focus on South Pole initially
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, -90, 2000000),
    });

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
    };
  }, []);

  // Update markers and analysis regions
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.entities.removeAll();

    // Add Main Craters
    features.forEach((f, i) => {
      viewer.entities.add({
        name: f.name,
        position: Cesium.Cartesian3.fromDegrees(f.lon, f.lat),
        point: {
          pixelSize: selectedFeature === i ? 12 : 8,
          color: Cesium.Color.fromCssColorString(f.color),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: f.name,
          font: "12px JetBrains Mono",
          pixelOffset: new Cesium.Cartesian2(0, 20),
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          fillColor: Cesium.Color.WHITE,
        },
      });
    });

    // Add Detected Ice Regions
    analysisRegions.forEach((reg, i) => {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(reg.longitude, reg.latitude),
        point: {
          pixelSize: 4,
          color: Cesium.Color.fromCssColorString("#FF4D6A"),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
        },
      });
    });
  }, [selectedFeature, analysisRegions]);

  // Fly to selected feature
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || selectedFeature === null) return;

    const f = features[selectedFeature];
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(f.lon, f.lat, 100000),
      duration: 1.5,
    });
  }, [selectedFeature]);

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
      <div
        ref={cesiumContainerRef}
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
      />
      <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", flexDirection: "column", gap: 6, zIndex: 10 }}>
        {[
          { icon: ZoomIn, action: () => viewerRef.current?.camera.zoomIn(100000) },
          { icon: ZoomOut, action: () => viewerRef.current?.camera.zoomOut(100000) },
          { icon: RotateCcw, action: () => viewerRef.current?.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(0, -90, 2000000) }) },
        ].map(({ icon: Icon, action }, i) => (
          <button key={i} onClick={action} style={{
            width: 32, height: 32, borderRadius: 6, border: "1px solid rgba(0,229,255,0.2)",
            background: "rgba(10,16,34,0.9)", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", color: "#00E5FF",
          }}>
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}

interface LunarExplorerProps {
  selectedDatasetId?: number | null;
}

export function LunarExplorer({ selectedDatasetId }: LunarExplorerProps) {
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(["hydrogen", "dfsar", "psr"]));
  const [selectedFeature, setSelectedFeature] = useState<number | null>(0);
  const [analysisRegions, setAnalysisRegions] = useState<IceRegion[]>([]);

  useEffect(() => {
    const loadAnalysis = async () => {
      if (!selectedDatasetId) {
        setAnalysisRegions([]);
        return;
      }
      try {
        const data = await getAnalysisResult(selectedDatasetId);
        setAnalysisRegions(data.regions || []);
      } catch (err) {
        console.error("Failed to load analysis for explorer", err);
      }
    };
    loadAnalysis();
  }, [selectedDatasetId]);

  const sf = selectedFeature !== null ? features[selectedFeature] : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopHeader title="Lunar Explorer" subtitle="South Polar Region · Stereographic Projection" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Main map */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 12 }}>
          {/* Layer controls */}
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap",
            background: "rgba(10,16,34,0.8)", borderRadius: 10, padding: "10px 14px",
            border: "1px solid rgba(0,229,255,0.1)",
          }}>
            <Layers size={14} style={{ color: "#7A8BA8", marginRight: 4, flexShrink: 0, alignSelf: "center" }} />
            {layers.map((l) => (
              <button
                key={l.id}
                onClick={() => setActiveLayers((prev) => {
                  const next = new Set(prev);
                  if (next.has(l.id)) next.delete(l.id); else next.add(l.id);
                  return next;
                })}
                style={{
                  padding: "4px 10px", borderRadius: 5, border: `1px solid ${activeLayers.has(l.id) ? l.color + "60" : "rgba(255,255,255,0.08)"}`,
                  background: activeLayers.has(l.id) ? `${l.color}15` : "transparent",
                  color: activeLayers.has(l.id) ? l.color : "#7A8BA8",
                  cursor: "pointer", fontFamily: "JetBrains Mono", fontSize: 10,
                  transition: "all 0.2s",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
          {/* Map canvas */}
          <div style={{
            flex: 1, background: "rgba(10,16,34,0.8)", borderRadius: 12,
            border: "1px solid rgba(0,229,255,0.12)", overflow: "hidden",
            display: "flex",
          }}>
            <MoonMap 
              selectedFeature={selectedFeature} 
              onSelect={setSelectedFeature} 
              analysisRegions={analysisRegions}
            />
          </div>
        </div>

        {/* Right sidebar - Feature Inspector */}
        <div style={{
          width: 260, padding: 16, display: "flex", flexDirection: "column", gap: 12,
          borderLeft: "1px solid rgba(0,229,255,0.1)",
        }}>
          <div>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, color: "#E8EDF5", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <Info size={14} style={{ color: "#00E5FF" }} />
              Feature Inspector
            </div>
            <div style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8" }}>Click a point on the map</div>
          </div>

          {sf ? (
            <div style={{
              background: "rgba(13,21,48,0.8)", borderRadius: 10,
              border: `1px solid ${sf.color}30`, padding: 14,
            }}>
              <div style={{ fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 13, color: sf.color, marginBottom: 12 }}>
                {sf.name}
              </div>
              {[
                { label: "Latitude", value: `${sf.lat}°` },
                { label: "Longitude", value: `${sf.lon}°` },
                { label: "Hydrogen (wt%)", value: `${sf.h}%` },
                { label: "Avg Slope", value: `${sf.slope}°` },
                { label: "Elevation", value: `${sf.elev} m` },
                { label: "Roughness", value: sf.rough.toFixed(2) },
                { label: "Ice Probability", value: `${sf.ice}%` },
              ].map((row) => (
                <div key={row.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <span style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8" }}>{row.label}</span>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#E8EDF5" }}>{row.value}</span>
                </div>
              ))}
              <div style={{
                marginTop: 12, background: `${sf.color}15`, borderRadius: 8,
                border: `1px solid ${sf.color}30`, padding: "10px",
              }}>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8", letterSpacing: "0.08em" }}>ICE PROBABILITY</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 24, fontWeight: 700, color: sf.color }}>{sf.ice}%</div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginTop: 6 }}>
                  <div style={{ width: `${sf.ice}%`, height: "100%", background: sf.color, borderRadius: 2, boxShadow: `0 0 8px ${sf.color}` }} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontFamily: "Inter", fontSize: 12, color: "#7A8BA8", textAlign: "center", padding: 20 }}>
              Select a crater on the map to inspect
            </div>
          )}

          {/* Legend */}
          <div style={{ background: "rgba(13,21,48,0.8)", borderRadius: 10, border: "1px solid rgba(0,229,255,0.1)", padding: 14 }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 12, fontWeight: 600, color: "#E8EDF5", marginBottom: 10 }}>Site Legend</div>
            {analysisRegions.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF4D6A", border: "1px solid white", boxShadow: "0 0 6px #FF4D6A" }} />
                <span style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8" }}>Detected Ice ({analysisRegions.length})</span>
              </div>
            )}
            {features.map((f, i) => (
              <button
                key={i}
                onClick={() => setSelectedFeature(i)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 0", border: "none", background: "transparent",
                  cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.color, boxShadow: `0 0 6px ${f.color}`, flexShrink: 0 }} />
                <span style={{ fontFamily: "Inter", fontSize: 11, color: selectedFeature === i ? f.color : "#7A8BA8", flex: 1, textAlign: "left" }}>{f.name}</span>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: f.color }}>{f.ice}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
