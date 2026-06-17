
  # LUNAICE-X Web Platform

  This is a code bundle for Design LUNAICE-X Web Platform. 

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
# 🌙 LUNAICE-X

### AI-Powered Lunar Ice Detection and Mission Planning Platform

LUNAICE-X is an advanced geospatial analytics platform designed to support lunar exploration missions through automated ice detection, resource assessment, landing site evaluation, and mission planning using Chandrayaan-2 lunar datasets.

The platform combines modern web technologies, geospatial processing, artificial intelligence, and mission analysis workflows to identify potential subsurface water ice deposits and generate actionable insights for future lunar exploration.

---

# 🚀 Project Overview

Water ice is one of the most valuable resources on the Moon, enabling:

* Human habitation
* Rocket fuel production
* Oxygen extraction
* Long-duration lunar missions

LUNAICE-X provides an end-to-end system for:

* Uploading Chandrayaan-2 datasets
* Processing geospatial lunar data
* Detecting potential ice-bearing regions
* Estimating ice concentration and coverage
* Recommending mission zones
* Supporting future rover and landing-site planning

---

# 🎯 Objectives

The platform aims to:

* Identify high-probability lunar ice regions
* Analyze Chandrayaan-2 geospatial datasets
* Generate mission-ready intelligence products
* Support future landing-site selection
* Provide a scalable framework for integrating radar and spectral datasets

---

# ✨ Key Features

## 📂 Dataset Management

* Upload Chandrayaan-2 datasets
* ZIP file support
* Dataset validation
* Dataset catalog management
* Metadata extraction

### Supported Formats

* Shapefiles (.shp)
* ZIP archives (.zip)
* Geospatial attribute tables (.dbf)
* Projection files (.prj)

---

## 🛰 Ice Detection Engine

The core analysis engine performs:

* Geospatial feature extraction
* Region identification
* Ice probability estimation
* Concentration assessment
* Coverage calculation

Generated metrics include:

* Ice probability score
* Estimated concentration
* Estimated depth
* Surface coverage area
* Region ranking

---

## 📊 Dashboard Analytics

Interactive dashboard displaying:

* Total datasets processed
* Total regions detected
* High-confidence detections
* Average ice probability
* Coverage statistics
* Mission recommendations

---

## 🔍 Analysis Results

For every processed dataset:

* Processing status
* Detection statistics
* Region count
* Mean probability
* Detailed region analysis

Each region includes:

| Field         | Description                 |
| ------------- | --------------------------- |
| Region ID     | Unique detection identifier |
| Latitude      | Lunar latitude              |
| Longitude     | Lunar longitude             |
| Probability   | Ice occurrence probability  |
| Concentration | Estimated ice concentration |
| Depth         | Estimated subsurface depth  |
| Area          | Estimated coverage area     |

---

## 🗺 Mission Zone Recommendations

The system identifies mission candidates using:

* Ice probability
* Resource concentration
* Accessibility metrics
* Exploration value

Output includes:

* Recommended zones
* Scientific priority
* Landing suitability indicators

---

# 🏗 System Architecture

Frontend (React + TypeScript)
↓
API Layer
↓
FastAPI Backend
↓
Ice Detection Engine
↓
Geospatial Processing
↓
Analysis Results
↓
Mission Planning Layer

---

# ⚙ Technology Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Lucide Icons

## Backend

* FastAPI
* Python
* Pydantic
* Uvicorn

## Geospatial Processing

* GeoPandas
* Shapely
* Fiona
* PyProj

## Data Processing

* NumPy
* Pandas

## APIs

* REST API
* JSON-based communication

---

# 📡 API Endpoints

## Health

GET /health

Returns application status.

---

## Dashboard Statistics

GET /dashboard/stats

Returns platform statistics.

---

## Dataset Management

GET /datasets

List datasets.

GET /datasets/{id}

Retrieve dataset details.

DELETE /datasets/{id}

Delete dataset.

POST /datasets/upload

Upload dataset ZIP file.

---

## Analysis

POST /analyze/{dataset_id}

Run ice detection analysis.

Returns:

* Regions detected
* Ice probabilities
* Concentration estimates
* Coverage metrics

---

## Ice Detection Overview

GET /ice-detection

Returns aggregated detection statistics.

---

## Mission Zones

GET /mission-zones

Returns recommended exploration zones.

---

# 📈 Example Analysis Output

```json
{
  "dataset_id": 1,
  "status": "completed",
  "regions_detected": 1358,
  "mean_probability": 0.60,
  "processing_time_s": 1.7
}
```

---

# 🧪 Current Capabilities

✅ Dataset upload

✅ Shapefile parsing

✅ Geospatial region extraction

✅ Ice probability estimation

✅ Analysis dashboard

✅ Mission zone generation

✅ REST API integration

✅ Frontend-backend synchronization

---

# 🔮 Planned Enhancements

## Lunar Globe Visualization

* Interactive Moon map
* Detection overlays
* Heatmaps

---

## Landing Site Selection

* Scientific value scoring
* Safety assessment
* Accessibility analysis

---

## Rover Traverse Planning

* Path optimization
* Hazard avoidance
* Energy estimation

---

## DEM Terrain Analysis

* Slope calculation
* Crater detection
* Hazard mapping

---

## Radar Data Integration

Future support for:

* DFSAR products
* SAR backscatter analysis
* Polarimetric processing

---

## Spectral Ice Detection

Future integration of:

* Chandrayaan-2 IIRS data
* Reflectance analysis
* Spectral signature detection

---

## Machine Learning

Potential future models:

* XGBoost
* Random Forest
* LightGBM

For advanced ice classification and prediction.

---

# 🛠 Installation

## Backend

```bash
cd backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload
```

Backend runs on:

```text
http://localhost:8000
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

# 📂 Project Structure

```text
LUNAICE-X
│
├── frontend/
│   ├── src/
│   ├── pages/
│   ├── components/
│   └── services/
│
├── backend/
│   ├── api/
│   ├── models/
│   ├── services/
│   ├── analysis/
│   └── uploads/
│
├── datasets/
├── docs/
└── README.md
```

---

# 🌍 Scientific Motivation

The lunar poles contain permanently shadowed regions that may preserve water ice deposits for billions of years.

Identifying and characterizing these deposits is critical for:

* Artemis missions
* ISRO lunar exploration
* In-Situ Resource Utilization (ISRU)
* Sustainable lunar bases

LUNAICE-X provides a scalable framework for transforming lunar datasets into actionable mission intelligence.

---

# 👨‍💻 Author

Sourajit Dasgupta

AI • Geospatial Analytics • Lunar Exploration • Full Stack Development

---

# 📜 License

MIT License

---

# 🚀 Future Vision

Transform LUNAICE-X into a comprehensive lunar mission planning platform capable of:

* Ice detection
* Resource estimation
* Landing site optimization
* Rover navigation
* Scientific mission simulation

Supporting the next generation of lunar exploration missions.
