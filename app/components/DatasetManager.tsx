import { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Download,
  Cpu,
  RefreshCw,
  X,
  Loader2
} from "lucide-react";
import { TopHeader } from "./TopHeader";

import {
  listDatasets,
  uploadDataset,
  deleteDataset,
  analyzeDataset,
  getDatasetPreview,
  Dataset,
} from "../services/lunaiceApi";

const statusColors: Record<string, string> = {
  processed: "#00FF88",
  processing: "#FFB800",
  queued: "#7A8BA8",
  error: "#FF4D6A",
};

interface DatasetManagerProps {
  onAnalyzeComplete?: (datasetId: number) => void;
}

function GeometryPreviewModal({ data, onClose }: { data: any, onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#00E5FF";
    ctx.fillStyle = "rgba(0, 229, 255, 0.1)";
    ctx.lineWidth = 1.5;

    const features = data.features || [];
    if (features.length === 0) return;

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const allCoords: any[] = [];

    features.forEach((f: any) => {
      const processCoords = (coords: any) => {
        if (typeof coords[0] === 'number') {
          const [x, y] = coords;
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        } else {
          coords.forEach(processCoords);
        }
      };
      processCoords(f.geometry.coordinates);
    });

    const pad = 40;
    const dx = maxX - minX, dy = maxY - minY;
    const scale = Math.min((W - pad) / dx, (H - pad) / dy);

    const tx = (x: number) => (x - minX) * scale + (W - dx * scale) / 2;
    const ty = (y: number) => H - ((y - minY) * scale + (H - dy * scale) / 2);

    // Draw features
    features.forEach((f: any) => {
      const drawGeom = (coords: any, type: string) => {
        if (type === 'Point') {
          ctx.beginPath();
          ctx.arc(tx(coords[0]), ty(coords[1]), 4, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        } else if (type === 'LineString' || type === 'Polygon') {
          const ring = type === 'Polygon' ? coords[0] : coords;
          ctx.beginPath();
          ring.forEach((p: any, i: number) => {
            if (i === 0) ctx.moveTo(tx(p[0]), ty(p[1]));
            else ctx.lineTo(tx(p[0]), ty(p[1]));
          });
          if (type === 'Polygon') ctx.fill();
          ctx.stroke();
        } else if (type === 'MultiPolygon') {
          coords.forEach((poly: any) => drawGeom(poly, 'Polygon'));
        }
      };
      drawGeom(f.geometry.coordinates, f.geometry.type);
    });
  }, [data]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(5, 8, 22, 0.85)", backdropFilter: "blur(8px)"
    }}>
      <div style={{
        background: "#0A1022", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 16,
        padding: 24, width: 640, position: "relative"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16, background: "transparent", border: "none",
          cursor: "pointer", color: "#7A8BA8"
        }}>
          <X size={20} />
        </button>
        <div style={{ fontFamily: "Space Grotesk", fontSize: 16, fontWeight: 600, color: "#E8EDF5", marginBottom: 4 }}>
          Geometry Preview
        </div>
        <div style={{ fontFamily: "Inter", fontSize: 12, color: "#7A8BA8", marginBottom: 20 }}>
          Visualizing raw shapefile features (Projection: Lat/Lon)
        </div>
        <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
          <canvas ref={canvasRef} width={592} height={400} />
        </div>
      </div>
    </div>
  );
}

export function DatasetManager({ onAnalyzeComplete }: DatasetManagerProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const data = await listDatasets();
      setDatasets(data);
    } catch (err) {
      console.error("Failed to load datasets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploaded(false);
      setUploadProgress(20);

      await uploadDataset(file);

      setUploadProgress(100);

      await loadDatasets();

      setTimeout(() => {
        setUploading(false); // Stop uploading animation
        setUploaded(true);
      }, 500);
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    await handleUpload(file);
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this dataset and all associated analysis results? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteDataset(id);
      await loadDatasets();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePreview = async (id: number) => {
    setPreviewLoading(id);
    try {
      const data = await getDatasetPreview(id);
      setPreviewData(data);
    } catch (err) {
      console.error(err);
      alert("Geometry preview failed. Ensure the dataset contains a valid shapefile.");
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleAnalyze = async (id: number) => {
    setAnalyzingId(id);
    try {
      const result = await analyzeDataset(id);
      onAnalyzeComplete?.(id);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {previewData && <GeometryPreviewModal data={previewData} onClose={() => setPreviewData(null)} />}
      <TopHeader
        title="Dataset Manager"
        subtitle="Upload and manage mission data sources"
      />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Upload Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${
              dragging ? "#00E5FF" : "rgba(0,229,255,0.2)"
            }`,
            borderRadius: 16,
            padding: "40px 24px",
            background: dragging
              ? "rgba(0,229,255,0.06)"
              : "rgba(10,16,34,0.5)",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            cursor: "pointer",
          }}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              await handleUpload(file);
            }}
          />

          <Upload size={32} color="#00E5FF" />

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#E8EDF5",
              }}
            >
              Drop datasets here or click to browse
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#7A8BA8",
              }}
            >
              GeoTIFF · PNG · CSV · GeoJSON
            </div>
          </div>
        </div>

        {(uploading || uploaded) && (
          <div
            style={{
              background: "rgba(10,16,34,0.8)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span>
                {uploaded ? "Upload Complete" : "Uploading Dataset"}
              </span>

              <span>{uploadProgress}%</span>
            </div>

            <div
              style={{
                height: 6,
                background: "#111",
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: "100%",
                  background: uploaded
                    ? "#00FF88"
                    : "linear-gradient(90deg,#00E5FF,#1DA1FF)",
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        )}

        {/* Dataset Table */}
        <div
          style={{
            background: "rgba(10,16,34,0.8)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                color: "#E8EDF5",
                fontWeight: 600,
              }}
            >
              Mission Datasets
            </div>

            <div
              style={{
                color: "#7A8BA8",
                fontSize: 12,
              }}
            >
              {datasets.length} files
            </div>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th>File Name</th>
                <th>Type</th>
                <th>Upload Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {datasets.map((d) => (
                <tr key={d.id}>
                  <td style={{ padding: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <FileText size={14} />
                      {d.filename}
                    </div>
                  </td>

                  <td>{d.filetype}</td>

                  <td>
                    {new Date(d.uploaded_at).toLocaleDateString()}
                  </td>

                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            d.is_analyzed ? statusColors.processed : statusColors.queued,
                        }}
                      />
                      {d.is_analyzed ? "PROCESSED" : "PENDING"}
                    </div>
                  </td>

                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                      }}
                    >
                      <button 
                        onClick={() => handlePreview(d.id)}
                        disabled={previewLoading === d.id}
                        style={{ color: previewLoading === d.id ? "#7A8BA8" : "#00E5FF" }}
                      >
                        {previewLoading === d.id ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                      </button>

                      <button>
                        <Download size={12} />
                      </button>

                      <button 
                        onClick={() => handleAnalyze(d.id)}
                        disabled={analyzingId === d.id}
                        style={{ color: analyzingId === d.id ? "#7A8BA8" : "#8B5CF6" }}
                        title="Run AI Analysis"
                      >
                        {analyzingId === d.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Cpu size={12} />
                        )}
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(d.id)
                        }
                      >
                        <Trash2
                          size={12}
                          color="#FF4D6A"
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {datasets.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: 30,
                      color: "#7A8BA8",
                    }}
                  >
                    No datasets uploaded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}