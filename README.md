# Location Image Generation API

This API generates location-based map images with optional GeoJSON overlays and markers.

## Endpoints

### 1. Simple Location Marker (`/simple/:z/:x/:y`)

Generates a map tile with a simple red marker at the specified coordinates.

#### Parameters

**Path Parameters:**
- `z` (number, required)
  - Zoom level
  - Range: 8-19
  - Example: `18`

- `x` (string, required)
  - X coordinate in RD (Rijksdriehoek) format
  - Range: 0-300000
  - Supports both dot and comma decimal separators
  - Example: `153895,01042669` or `153895.01042669`

- `y` (string, required)
  - Y coordinate in RD (Rijksdriehoek) format
  - Range: 300000-650000
  - Supports both dot and comma decimal separators
  - Example: `473352,618162258` or `473352.618162258`

#### Response
- Content-Type: `image/png`
- A 256x256 pixel PNG image with a red marker at the specified location

### 2. Complex Location Visualization (`/:z/:x/:y`)

Generates a map tile with support for GeoJSON overlays and custom styling.

#### Parameters

**Path Parameters:**
- `z` (number, required)
  - Zoom level
  - Range: 8-19
  - Example: `18`

- `x` (string, required)
  - X coordinate in RD (Rijksdriehoek) format
  - Range: 0-300000
  - Supports both dot and comma decimal separators
  - Example: `153895,01042669`

- `y` (string, required)
  - Y coordinate in RD (Rijksdriehoek) format
  - Range: 300000-650000
  - Supports both dot and comma decimal separators
  - Example: `473352,618162258`

**Query Parameters:**
- `geojson` (string, optional)
  - GeoJSON string for drawing shapes on the map
  - Supported types: Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon
  - Example: `{"type":"Polygon","coordinates":[[[5.37112,52.2482],[5.37100,52.2482],[5.37093,52.2482],[5.37100,52.2481],[5.37112,52.2482]]]}`

- `achtergrond` (string, optional)
  - Background map type
  - Default: OpenStreetMap
  - Available options: [Your available background options]

- `kleur` (string, optional)
  - Color for the GeoJSON overlay
  - Default: [Your default color]
  - Format: CSS color string

#### Response
- Content-Type: `image/png`
- A 256x256 pixel PNG image with the specified overlays and styling

## Error Responses

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`
  - Invalid coordinates
  - Invalid zoom level
  - Malformed GeoJSON
  - Invalid parameter values

- `500 Internal Server Error`
  - Server-side processing errors
  - Tile fetching failures

## Examples

1. Simple marker:
```
/simple/18/153895,01042669/473352,618162258
```
2. Complex visualization with a polygon:
```
/18/153895,01042669/473352,618162258?geojson={"type":"Polygon","coordinates":[[[5.37112,52.2482],[5.37100,52.2482],[5.37093,52.2482],[5.37100,52.2481],[5.37112,52.2482]]]}
```
3. Point with custom color and aerial background:
```
/18/153895,01042669/473352,618162258?geojson={"type":"Point","coordinates":[5.37112,52.2482]}&kleur=blue&achtergrond=luchtfoto
```
4. Geometry is larger than the tile for the given zoomlevel
```
/18/153895,01042669/473352,618162258?geojson={"type":"Point","coordinates":[5.37112,52.2482]}&kleur=blue&achtergrond=luchtfoto](http://localhost:3000/18/154770,468190803/474184,251336475?geojson={%22type%22:%22Polygon%22,%22coordinates%22:[[[5.38278216309193,52.2562557918378],[5.38279688301171,52.2562460855801],[5.38281515993667,52.2562564760924],[5.38290739409822,52.2563089319556],[5.38395095418157,52.255616717084],[5.38487484025629,52.2550038707427],[5.38489077396512,52.2550128947526],[5.38412972430972,52.2555175865507],[5.38304672599775,52.2562357583561],[5.38290796353383,52.2563277793205],[5.38280386693488,52.2562682047226],[5.38278216309193,52.2562557918378]]]})
```
