# Property GIS Application

A web-based GIS application for exploring property, road, and street-address data using the ArcGIS Maps SDK for JavaScript.

The application provides property filtering, map navigation, drawing and measurement tools, property/road spatial analysis, Shapefile import/export, and feature storage through an ASP.NET Core backend API.

---

## Technology Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- ArcGIS Maps SDK for JavaScript 4.32
- ArcGIS REST Services
- shpjs for Shapefile import
- shp-write for Shapefile export

### Backend

- ASP.NET Core / .NET 8
- C#
- REST API
- JSON file storage
- IIS hosting

---

## ArcGIS Data Source

The application uses the following ArcGIS MapServer:

`https://maps.orc.govt.nz/arcgis/rest/services/PropertyExternal/MapServer`

Layers used by the application:

| Layer ID | Layer |
|---|---|
| 0 | ORC Properties |
| 2 | Street Address |
| 3 | Roads |

The GIS data uses New Zealand Transverse Mercator 2000:

`WKID 2193 - NZTM2000`

---

## Main Features

The application provides:

- Territorial Authority filtering
- Locality filtering
- Road selection
- Property selection
- Street Address lookup
- Automatic map navigation
- Property highlighting
- Road highlighting
- Property measurements
- Property-to-road distance calculation
- Coordinate display
- Drawing tools
- Live drawing measurements
- Spatial intersection analysis
- Property overlap percentage calculation
- Shapefile import
- Shapefile export
- Feature saving through the backend API
- Duplicate feature protection

---

## Property Search Flow

The main property-selection workflow is:

```text
Territorial Authority
        ↓
Locality
        ↓
Road
        ↓
15 m Road Buffer
        ↓
Intersect Properties
        ↓
Display Properties
        ↓
Select Property
        ↓
Street Address
```

When a road is selected, the application creates a 15-meter buffer around the road and queries the Properties layer for intersecting properties.

---

## Drawing and Spatial Analysis

The ArcGIS Sketch widget supports:

- Point
- Polyline
- Polygon
- Rectangle
- Circle

Drawings are stored in a dedicated `GraphicsLayer`.

Measurements are stored in a separate measurement layer.

### Polygon Measurements

For polygon drawings, the application can calculate:

- Side lengths
- Area
- Perimeter

### Polyline Measurements

For polylines, the application calculates:

- Individual segment lengths
- Total length

### Property Intersection

When the user manually draws a polygon, the application queries properties intersecting the drawing.

Only properties belonging to the current road/property selection are included.

The overlap percentage is calculated as:

```text
Overlap % = (Intersection Area / Property Area) × 100
```

For example:

```text
Property Area     = 1000 m²
Intersection Area = 250 m²

Overlap = 25%
```

---

## Property-to-Road Distance

The application calculates the minimum distance between a property boundary and a road.

Each property boundary segment is compared against each road segment.

The closest pair of points is retained as the minimum distance.

Because the application uses NZTM2000 (`WKID 2193`), coordinate-based distance calculations are represented in meters.

---

## Shapefile Support

### Import

The application supports uploading zipped Shapefiles.

Import flow:

```text
Shapefile ZIP
      ↓
shpjs
      ↓
GeoJSON
      ↓
ArcGIS Geometry
      ↓
Coordinate Projection
      ↓
Graphic
      ↓
Map
```

Uploaded Shapefiles are displayed on the map and the map automatically zooms to the imported features.

Uploaded Shapefiles do not trigger the manual Sketch property-intersection workflow.

### Export

User drawings can also be exported as Shapefiles.

Export flow:

```text
ArcGIS Geometry
      ↓
Projection to WGS84
      ↓
GeoJSON
      ↓
Shapefile
      ↓
ZIP Download
```

---

## Coordinate Systems

The application primarily works with:

### WGS84

```text
WKID: 4326
Units: Degrees
Coordinates: Longitude / Latitude
```

### NZTM2000

```text
WKID: 2193
Units: Meters
Coordinates: Easting / Northing
```

ArcGIS projection utilities are used when geometries need to be converted between coordinate systems.

Creating a `SpatialReference` identifies the coordinate system:

```js
const sourceSR = new SpatialReference({ wkid: 4326 });
```

Actual coordinate conversion is performed using:

```js
projection.project(geometry, targetSR);
```

---

# Frontend Structure

```text
property-gis-vanilla/
│
├── CSS/
│
├── js/
│   │
│   ├── filters/
│   │
│   ├── lib/
│   │
│   ├── map/
│   │   ├── CoordinateTool.js
│   │   ├── GisMap.js
│   │   ├── MapHighlight.js
│   │   ├── MapLayers.js
│   │   ├── MapMeasurements.js
│   │   ├── MapNavigation.js
│   │   └── MapSketch.js
│   │
│   ├── property/
│   │   ├── FeatureDetails.js
│   │   ├── FeatureSave.js
│   │   ├── ParcelMeasurements.js
│   │   └── PropertyPopup.js
│   │
│   ├── services/
│   │   ├── apis/
│   │   │   ├── featureApiService.js
│   │   │   └── featurePayload.js
│   │   │
│   │   └── arcgis/
│   │
│   └── app.js
│
├── index.html
└── README.md
```

---

## Frontend Architecture

The application follows a modular structure.

### `app.js`

Acts as the main application coordinator.

It manages:

- Application state
- Filter workflow
- Property selection
- Road selection
- Sketch intersection workflow
- Communication between modules

### `map/`

Contains ArcGIS map functionality such as:

- Map initialization
- Layers
- Navigation
- Highlighting
- Sketch tools
- Measurements
- Coordinates

### `property/`

Contains property-related functionality such as:

- Feature details
- Property measurements
- Popups
- Feature saving

### `services/arcgis/`

Contains ArcGIS query and data-access logic.

### `services/apis/`

Contains communication with the ASP.NET Core backend API and API payload creation.

---

# Backend

The backend provides a REST API for storing selected GIS features.

The API uses JSON file storage.

Main endpoint:

```text
/api/features
```

---

## API Endpoints

### Get All Features

```http
GET /api/features
```

Returns all saved features.

### Get Feature

```http
GET /api/features/{layerId}/{featureId}
```

Returns one feature using its Layer ID and Feature ID.

### Save Feature

```http
POST /api/features
```

Validates and saves a feature.

Duplicate detection uses:

```text
LayerId + FeatureId
```

If the feature already exists, the API returns:

```text
409 Conflict
```

---

## Supported Geometry Types

The backend accepts:

```text
point
line
polyline
polygon
multipolygon
```

---

## JSON Storage

Features are stored in:

```text
Data/features.json
```

The storage service supports:

- Reading all features
- Reading a single feature
- Saving a feature
- Duplicate detection
- Thread-safe file access

A `SemaphoreSlim` is used to prevent multiple requests from reading/writing the JSON file simultaneously.

Writes are first created in a temporary file:

```text
features.json.tmp
```

The temporary file is then moved over the main JSON file.

---

# Running Locally

## Frontend

The frontend must be served through a web server rather than opened directly using `file://`.

During development it can be served using a local development server.

Example:

```text
http://localhost:5500
```

---

## Backend

From the backend project directory:

```bash
dotnet run
```

The API can then be accessed using the URL shown in the .NET console.

---

# IIS Deployment

Both the frontend and backend can be hosted using IIS.

## Backend

Publish the ASP.NET Core project:

```bash
dotnet publish -c Release
```

Copy the published output to the IIS deployment directory.

Example:

```text
C:\inetpub\backEnd\INOVAR_BackEnd
```

The backend can be configured as an IIS Application:

```text
/backend
```

Example API URL:

```text
http://localhost/backend/api/features
```

The IIS Application Pool should use:

```text
.NET CLR Version: No Managed Code
Managed Pipeline Mode: Integrated
```

The .NET 8 Hosting Bundle must also be installed on the IIS server.

The IIS Application Pool identity requires write permission to the backend `Data` directory because the API creates and updates:

```text
Data/features.json
Data/features.json.tmp
```

---

# Frontend IIS Deployment

Copy the frontend project to the IIS web root.

Example:

```text
C:\inetpub\wwwroot\Project_NewZeland
```

The application can then be opened using:

```text
http://localhost/Project_NewZeland/
```

For another computer on the same network, use the IIS server's IPv4 address:

```text
http://SERVER-IP/Project_NewZeland/
```

Example:

```text
http://192.168.1.50/Project_NewZeland/
```

The other computer must be able to reach the IIS server and the required IIS/Windows Firewall rules must allow HTTP traffic.

---

## Backend URL in Production

The frontend should use a relative API URL:

```js
const API_URL = "/backend/api/features";
```

Avoid:

```js
const API_URL = "http://localhost/backend/api/features";
```

Using a relative URL means the frontend automatically communicates with the backend on the same server.

For example, if the user opens:

```text
http://192.168.1.50/Project_NewZeland/
```

the API request automatically targets:

```text
http://192.168.1.50/backend/api/features
```

This also avoids unnecessary cross-origin requests when the frontend and backend are hosted under the same IIS origin.

---

# IIS Structure

A typical deployment can look like:

```text
IIS
│
└── Default Web Site - Port 80
    │
    ├── Project_NewZeland
    │   ├── index.html
    │   ├── CSS/
    │   └── js/
    │
    └── backend
        └── ASP.NET Core API
```

URLs:

```text
Frontend:
http://SERVER-IP/Project_NewZeland/

Backend:
http://SERVER-IP/backend/api/features
```

---

# Important Notes

- Do not use `localhost` in frontend API URLs when other computers need to access the application.
- Use relative backend URLs when frontend and backend are hosted on the same IIS server.
- Ensure IIS has access to the frontend directory.
- Ensure the backend Application Pool has write permission to the `Data` directory.
- Install the .NET 8 Hosting Bundle before hosting the ASP.NET Core API on IIS.
- Ensure Port 80 is accessible through Windows Firewall when the application needs to be accessed from other computers.
- Computers accessing a private IP address must normally be on the same reachable network.
- Keep the ArcGIS service accessible from client browsers.

---

# Deployment Checklist

Before sharing the application with another user, verify:

```text
[ ] IIS is running
[ ] Frontend opens through IIS
[ ] Backend API opens through IIS
[ ] API URL uses /backend/api/features
[ ] .NET 8 Hosting Bundle is installed
[ ] Backend Data folder has write permission
[ ] Port 80 is allowed through Windows Firewall
[ ] Server IPv4 address is correct
[ ] Client computer can reach the server
[ ] ArcGIS layers load correctly
[ ] Property filters work
[ ] Sketch tools work
[ ] Shapefile upload works
[ ] Shapefile download works
[ ] Feature saving works
```

---

## Project Summary

The Property GIS Application combines ArcGIS spatial functionality with a modular Vanilla JavaScript frontend and an ASP.NET Core backend.

The system supports property exploration, road-based property searches, spatial measurements, drawing analysis, Shapefile workflows, and persistent feature storage while remaining lightweight and framework-independent.