# PRD — pvprospect

**Product name:** `pvprospect`  
**Document type:** Product Requirements Document  
**Version:** 1.2.1  
**Status:** Accepted draft for implementation update  
**Date:** 2026-05-22  
**Company:** Solar AI Solutions  
**Product profile:** Internal Tool  
**Current review URL:** `https://pvprospect2.preview.solaisol.com/`  
**Target MVP preview URL:** `https://pvprospect.preview.solaisol.com/` after cutover, unless owner decides to keep the `pvprospect2` preview host.  
**Primary user:** Solar AI Solutions operator / analyst / product owner  
**Commercial status:** Internal tool, not a product for sale.

---

## 0. Version 1.2.1 reliability note

Version 1.2.1 is a small reliability clarification for the single location input. It does not add new product scope. It prevents a common failure mode: coordinates inserted by map click or browser geolocation must always be understood correctly by the calculation flow.

Core rule:

```text
The selected location object is the source of truth.
The text input is a display/edit control, not the only source of truth.
```

When the app itself writes coordinates into the location input, calculation must use the confirmed internal `lat/lon` object directly and must not depend on reparsing the text string. Reparse the input only after the user manually edits the text.

This keeps the system simple, reliable, and fault-tolerant:

- no separate latitude/longitude fields on the main screen;
- no reverse geocoding after map click;
- no paid geocoding API;
- no autocomplete;
- no DMS/URL coordinate parsing in MVP;
- no hidden conversion magic or auto-swapping lat/lon;
- one canonical coordinate format in the input: `lat, lon` with dot decimals.

---

## 0.1. Version 1.2 change summary

Version 1.2 fixes a critical UX gap found after reviewing the working preview: the app has no address search field. For a tool whose purpose is fast production estimation, forcing the user to select only by map click or manually edit separate latitude/longitude fields is too technical.

Main changes from v1.1:

1. Replace the visible `Coordinates` card with a single **Location search bar**.
2. The placeholder must be:

```text
Enter address or coordinates
```

3. The search bar must accept:
   - an address or place name, e.g. `Lisbon, Portugal`;
   - coordinates, e.g. `38.7223, -9.1393`;
   - coordinates pasted with spaces or semicolons, where safely parseable.
4. When user selects a point on the map, the search bar must immediately show normalized coordinates, replacing the placeholder text.
5. When user focuses/clicks the search bar, its current value must be selected, so the user can immediately paste an address or coordinates.
6. Address-to-coordinate conversion must use a free, no-paid-API approach for MVP: **backend-side Nominatim search via OpenStreetMap**, with strict usage policy compliance, caching, and no autocomplete.
7. Coordinate parsing must happen locally/backend-side without any geocoding API call.
8. `Find my location` remains visible, but should become secondary to the search bar.
9. `Calculate` remains the primary CTA.
10. Main screen must remain extremely simple:

```text
Location search bar
Find my location
Map
System size, default 10 kWp
Calculate
Expert mode collapsed
```

11. Do not show a red error when a valid location already exists.
12. Do not show raw latitude/longitude as separate always-visible fields.
13. Keep all non-essential assumptions under collapsed `Expert mode`.
14. Keep `Confidence: medium` hidden/removed from normal user-facing result.
15. Keep developer/debug JSON hidden by default under `Developer details`.

---

## 1. Product summary

`pvprospect` is a simple internal Solar AI Solutions web tool for quick solar production prospecting from a map point or address.

The user enters an address or coordinates, uses browser geolocation, or clicks a point on the Leaflet map. Then the user enters only the system size and clicks `Calculate`.

The application sends backend-side provider requests to:

1. **PVGIS** — via the official PVGIS non-interactive API.
2. **PVWatts v8** — via the official PVWatts API.

The application normalizes both outputs and displays a clean production infographic focused on:

- annual production;
- monthly production;
- PVGIS vs PVWatts comparison;
- recommended average estimate.

The product must not feel like an engineering simulator. It must feel like a quick “solar production estimate in one click” tool.

---

## 2. Product promise

A Solar AI Solutions user can open the app, type an address or coordinates, enter system size, click `Calculate`, and immediately see a simple answer:

```text
Estimated annual production: 12,420 kWh/year

PVGIS: 12,760 kWh/year
PVWatts: 12,080 kWh/year
Recommended average: 12,420 kWh/year
Difference: 5.5%
```

The first result should be understandable without knowing what irradiance, azimuth, loss model, NSRDB, SARAH, or TMY means.

---

## 3. Problem

The current preview works technically, but it has two UX problems:

1. It exposes separate latitude/longitude fields, which are useful for developers but not natural for normal users.
2. It lacks address search, even though the natural first action for most people is to type a place or paste coordinates.

For the main job — fast production estimation — most users only need to answer:

```text
Where is the system?
How large is it?
How much will it produce?
```

Therefore, the first screen should be built around a single location input, not around separate technical coordinate fields.

---

## 4. Target users

### 4.1. Primary user

**Solar AI Solutions operator / analyst**

Uses `pvprospect` to quickly estimate solar production for a potential object, market, rooftop, land plot, or city.

### 4.2. Secondary user

**Product owner / CEO**

Uses the result as quick decision support before deeper analysis.

### 4.3. Future ecosystem user

Future SOLAI tools may use `pvprospect` output as a source of location-level solar production context.

Possible future integrations:

- `pvquote`;
- `pvdesign`;
- `pvdata`;
- `pvportal`;
- `solportugal`;
- internal market research tools.

For MVP, no cross-product integration is required.

---

## 5. Goals

### G1. Make the first action obvious

The user must immediately understand what to do:

```text
Enter address or coordinates → set system size → Calculate
```

### G2. Support map, address, coordinates, and geolocation

The app must support four location input paths:

1. Type address or place name.
2. Paste coordinates.
3. Click on map.
4. Use browser geolocation.

All four paths must produce the same internal result:

```text
lat
lon
location source
optional display label
```

### G3. Keep main UI child-simple

The normal user should not need to see:

- separate latitude field;
- separate longitude field;
- losses;
- tilt;
- azimuth;
- module type;
- mounting type;
- API provider settings;
- raw JSON.

These belong in `Expert mode` or `Developer details`.

### G4. Consolidated production infographic

The result must show:

- annual production;
- monthly production;
- PVGIS result;
- PVWatts result;
- average/recommended estimate;
- difference between providers.

### G5. Correct provider/API boundaries

The frontend must call only SOLAI backend APIs.

The backend is responsible for:

- parsing coordinates;
- geocoding addresses;
- calling PVGIS;
- calling PVWatts;
- normalizing results;
- consolidating results;
- caching where useful;
- protecting provider keys and rate limits.

---

## 6. Non-goals

`pvprospect` MVP does not do:

- full engineering design;
- roof polygon detection;
- shading analysis;
- 3D modelling;
- equipment selection;
- inverter/string sizing;
- financial modelling;
- commercial proposal generation;
- customer-facing proposal pages;
- CRM integration;
- multi-tenant SaaS packaging;
- paid geocoding API integration;
- autocomplete using public Nominatim;
- bulk geocoding;
- automatic reverse geocoding after every map click;
- public API for external users.

---

## 7. First useful result

**First useful result:**  
Consolidated PV production infographic for one selected location.

**Minimum required input:**

```text
Location: address, coordinates, map click, or browser geolocation
System size: default 10 kWp
```

**Primary user action:**

```text
Enter address or coordinates → Calculate
```

or:

```text
Click point on map → Calculate
```

**Output artifact:**  
A result screen showing:

- selected location;
- annual production estimate;
- monthly production estimate;
- PVGIS annual estimate;
- PVWatts annual estimate;
- difference percentage;
- recommended average estimate;
- basic assumptions;
- provider status.

**Not required before first useful result:**

- manual latitude/longitude editing;
- customer creation;
- project creation;
- roof polygon;
- module/inverter selection;
- detailed PV configuration;
- user training.

**Target time to first useful result:**  
Under 60 seconds in preview environment when geocoding and production providers respond normally.

---

## 8. MVP environment

MVP preview location:

```text
https://pvprospect2.preview.solaisol.com/
```

Target cutover location:

```text
https://pvprospect.preview.solaisol.com/
```

Expected deployment profile:

```text
Internal preview
Not public production
Not paid SaaS
Not customer-facing
```

Access model for MVP:

```text
Option A: basic internal auth
Option B: reverse proxy auth
Option C: IP allowlist / private preview access
```

The app must not be positioned as production-ready customer software.

---

## 9. Core user flow

### 9.1. Open app

User opens:

```text
https://pvprospect2.preview.solaisol.com/
```

The first screen shows:

- app name: `pvprospect`;
- short, plain-language subtitle;
- single location search bar;
- `Find my location` button;
- Leaflet map;
- system size input, default `10 kWp`;
- `Calculate` button;
- collapsed `Expert mode`.

Recommended subtitle:

```text
Quick solar electricity estimate from an address, coordinates, or map point.
```

Main placeholder:

```text
Enter address or coordinates
```

Optional helper text under input:

```text
Example: Lisbon, Portugal or 38.7223, -9.1393
```

### 9.2. Enter address

User types an address or place name:

```text
Lisbon, Portugal
```

Expected behavior:

1. App does not call geocoding API on every keystroke.
2. User presses `Enter` or clicks `Calculate`.
3. Backend geocodes the address via Nominatim search.
4. If there is one clear result, app places marker and proceeds.
5. If there are multiple likely results, app shows compact choices.
6. User selects the correct result.
7. App updates the search bar with a readable label or normalized coordinates.
8. User can calculate production.

### 9.3. Paste coordinates

User pastes coordinates:

```text
38.7223, -9.1393
```

Expected behavior:

1. App parses coordinates without external API call.
2. App validates latitude and longitude.
3. App places marker on map.
4. App normalizes input display to:

```text
38.722300, -9.139300
```

5. User can calculate immediately.

Supported coordinate formats for MVP:

```text
38.7223, -9.1393
38.7223 -9.1393
38.7223; -9.1393
lat: 38.7223, lon: -9.1393
```

Optional later formats:

```text
38°43'20.3"N 9°08'21.5"W
Google Maps URL
OpenStreetMap URL
Apple Maps URL
```

These URL/DMS formats are not required for MVP v1.2.

### 9.4. Click map

User clicks the map.

Expected behavior:

1. Marker appears at clicked point.
2. Search bar is immediately filled with normalized coordinates:

```text
50.228232, 29.452135
```

3. No separate latitude/longitude card is shown.
4. No reverse geocoding call is required.
5. User can click `Calculate`.

Important rule:

```text
Map click should not trigger automatic reverse geocoding in MVP.
```

Reason: coordinates are enough for PVGIS/PVWatts, and avoiding reverse geocoding keeps the app faster, simpler, and safer with Nominatim usage limits.

### 9.5. Focus search bar

When user clicks/focuses the location search bar:

1. Current value is selected automatically.
2. User can immediately paste a new address or coordinates.
3. If user starts typing, the previous marker may remain visually on the map, but the input becomes `dirty`.
4. If input is dirty and unresolved, `Calculate` should resolve location first.

Acceptance behavior:

```text
Focus input → select all current text
Type/paste new value → previous value replaced
Enter or Calculate → resolve new value
```

### 9.5.1. Confirmed location source of truth

The app must maintain a simple internal confirmed location state:

```ts
type ConfirmedLocation = {
  lat: number;
  lon: number;
  source: "map_click" | "browser_geolocation" | "manual_coordinates" | "address_geocoding";
  label: string | null;
};

type LocationInputState = {
  value: string;
  dirty: boolean;
  confirmedLocation: ConfirmedLocation | null;
};
```

Rules:

1. If the user clicks the map, the app sets `confirmedLocation` immediately and formats the input as coordinates.
2. If the user uses browser geolocation, the app sets `confirmedLocation` immediately and formats the input as coordinates.
3. If the user pastes valid coordinates, the app parses them, sets `confirmedLocation`, moves the marker, and formats the input as coordinates.
4. If the user manually types or pastes into the input, `dirty=true` until the text is resolved.
5. If `dirty=false` and `confirmedLocation` exists, `Calculate` must use `confirmedLocation.lat/lon` directly.
6. If `dirty=true`, `Calculate` first tries coordinate parsing, then address geocoding.
7. If resolving dirty input fails, the app must not silently overwrite the previous confirmed location.

This avoids a fragile round-trip where the app writes coordinates into the input and later fails to understand its own text.


### 9.6. Use browser geolocation

User clicks:

```text
Find my location
```

Expected behavior:

1. Browser asks for permission.
2. If allowed, app receives coordinates.
3. Marker moves to current location.
4. Search bar is filled with normalized coordinates.
5. User can calculate.

If permission is denied or unavailable:

```text
We could not access your location. Enter an address or coordinates instead.
```

### 9.7. Set system size

The only visible assumption outside Expert mode:

```text
System size: 10 kWp
```

Rules:

- default value: `10`;
- unit label: `kWp`;
- value must be positive;
- recommended MVP range: `0.1–100000 kWp`;
- if user enters invalid value, show inline validation.

### 9.8. Calculate

User clicks:

```text
Calculate
```

Backend performs:

```text
1. Resolve location if needed
2. Validate assumptions
3. Call PVGIS backend-side
4. Call PVWatts backend-side
5. Normalize provider outputs
6. Consolidate estimates
7. Return infographic-ready JSON
```

---

## 10. Location search and geocoding requirements

### FR-L1 — Single location search bar

The app must replace separate visible latitude/longitude fields with a single location search bar.

Placeholder:

```text
Enter address or coordinates
```

The input must accept:

- address;
- city;
- place name;
- coordinates.

Acceptance criteria:

- no separate visible `Latitude` and `Longitude` fields on the main screen;
- location input is visually primary;
- coordinates are still available in developer details or advanced context if needed;
- map click fills the search bar with coordinates;
- focus selects all current text.

### FR-L2 — Local coordinate parser

The app must parse coordinates before attempting geocoding.

Coordinate parser rules:

1. Trim whitespace.
2. Accept comma, semicolon, or whitespace separator.
3. Extract two decimal numbers.
4. Validate:

```text
latitude: -90 to 90
longitude: -180 to 180
```

5. If valid, set location source:

```text
manual_coordinates
```

6. Do not call Nominatim.

Acceptance criteria:

- valid coordinates place marker immediately;
- invalid coordinate-like text shows friendly validation;
- no external request is made for valid coordinates;
- parsed coordinates are normalized to 6 decimals in the input.

### FR-L2.1 — Coordinate round-trip reliability

The coordinate format generated by the app must be the easiest and most reliable format for the app to parse again.

Canonical display format:

```text
{latitude.toFixed(6)}, {longitude.toFixed(6)}
```

Example:

```text
50.228232, 29.452135
```

Rules:

1. The app always displays generated coordinates as `latitude, longitude`.
2. Decimal separator is always a dot, regardless of browser locale.
3. The comma is the coordinate separator, not a decimal separator.
4. Six decimals are enough for the MVP and avoid visually noisy coordinates.
5. The parser must always accept the exact canonical format produced by `formatCoordinatePair()`.
6. Map click and browser geolocation must set `confirmedLocation` directly; calculation must not depend on reparsing the displayed coordinate string.
7. If the user edits the input, then and only then the string is parsed again.
8. The MVP must not support DMS, Google Maps URLs, OpenStreetMap URLs, Apple Maps URLs, or automatic lat/lon swapping. These are future enhancements, not MVP requirements.

Minimal helper functions expected in implementation:

```ts
function formatCoordinatePair(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

function parseCoordinatePair(input: string): { lat: number; lon: number } | null {
  // Accept the canonical format first.
  // Also accept simple decimal degrees separated by comma, semicolon, or whitespace.
  // Return null instead of guessing when ambiguous.
}
```

Required regression tests:

```text
formatCoordinatePair(50.2282322739, 29.4521353011)
  -> "50.228232, 29.452135"
  -> parseCoordinatePair(...) returns lat=50.228232, lon=29.452135

formatCoordinatePair(-33.868820, 151.209290)
  -> "-33.868820, 151.209290"
  -> parseCoordinatePair(...) returns lat=-33.868820, lon=151.209290

"38.7223 -9.1393"
  -> parseCoordinatePair(...) returns lat=38.7223, lon=-9.1393

"38.7223; -9.1393"
  -> parseCoordinatePair(...) returns lat=38.7223, lon=-9.1393

"29.452135, 50.228232"
  -> must be treated as latitude=29.452135, longitude=50.228232, not auto-swapped
```

User-facing validation for ambiguous/wrong coordinate input:

```text
Use coordinates as latitude, longitude — for example: 50.228232, 29.452135.
```


### FR-L3 — Free address geocoding via Nominatim

For MVP, the simplest no-paid-API approach is to use **Nominatim public search** from the backend, not the browser.

Backend endpoint:

```http
POST /api/location/resolve
```

Request:

```json
{
  "query": "Lisbon, Portugal",
  "acceptLanguage": "en",
  "limit": 5
}
```

Backend logic:

```text
1. Try coordinate parser first.
2. If query is not coordinates, normalize query string.
3. Check local cache.
4. If cache miss, call Nominatim search.
5. Return up to 5 candidate results.
6. Store successful result list in cache.
```

Nominatim request pattern:

```http
GET https://nominatim.openstreetmap.org/search
  ?q=<encoded query>
  &format=jsonv2
  &limit=5
  &addressdetails=1
```

Optional parameters:

```text
accept-language=<user/browser language>
countrycodes=<comma-separated country hints, optional>
viewbox=<lon1,lat1,lon2,lat2>, optional future improvement
bounded=1, only if intentionally limiting to a region
email=<contact email>, if higher request volume is expected
```

Do not request polygon geometry in MVP:

```text
polygon_geojson=0
polygon_kml=0
polygon_svg=0
polygon_text=0
```

Returned fields to use:

```text
display_name
lat
lon
importance
place_id
osm_type
osm_id
address.country_code
boundingbox
```

Acceptance criteria:

- address geocoding works without a paid API;
- geocoding call happens backend-side;
- backend sends valid identifying User-Agent or Referer;
- backend enforces rate limiting;
- backend caches repeated queries;
- frontend shows up to 5 candidate results if there is ambiguity;
- user can select one candidate;
- selected candidate sets marker and fills search bar.

### FR-L4 — Nominatim usage policy compliance

The app must comply with public Nominatim usage policy.

Rules:

```text
Do not call Nominatim from frontend.
Do not implement autocomplete against public Nominatim.
Do not geocode on every keystroke.
Do not bulk geocode.
Do not reverse geocode on every map click.
Use max 1 request/second server-wide.
Use one backend process/queue for public Nominatim calls.
Cache repeated queries.
Provide valid User-Agent or Referer identifying pvprospect / Solar AI Solutions.
Display OpenStreetMap/Nominatim attribution where appropriate.
Make provider switchable by config.
```

Recommended backend User-Agent:

```text
pvprospect/1.2 (Solar AI Solutions; contact: <configured-contact-email>)
```

Nominatim provider settings must be configurable:

```text
GEOCODING_PROVIDER=nominatim
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
NOMINATIM_CONTACT_EMAIL=<optional>
NOMINATIM_RATE_LIMIT_RPS=1
```

Acceptance criteria:

- no request is fired per keystroke;
- pressing Enter or Calculate is the trigger;
- repeated same query is served from cache;
- if public Nominatim is unavailable or blocks the app, user can still use map click or coordinates;
- provider can be replaced later without UI rewrite.

### FR-L5 — Geocoding ambiguity UI

If Nominatim returns multiple candidates, show a compact selection list.

Example:

```text
Choose location
1. Lisbon, Portugal
2. Lisbon, New Hampshire, United States
3. Lisbon, North Dakota, United States
```

Each candidate must show enough context:

- main name / display label;
- country;
- optional state/region;
- coordinates only in secondary text.

Acceptance criteria:

- ambiguous address does not silently choose a wrong location if multiple high-level matches exist;
- selecting candidate updates marker;
- selected candidate updates location input;
- `Calculate` continues after selection.

### FR-L6 — No reverse geocoding in MVP main flow

MVP must not reverse geocode every map click.

When user clicks map, display coordinates in the search bar.

Reverse geocoding may be added later only if:

- it is triggered explicitly;
- it is backend-side;
- it is rate-limited;
- it is cached;
- it does not slow down map selection.

Reason:

```text
PVGIS and PVWatts need coordinates, not postal address.
Address labels are nice-to-have, not required for first useful result.
```

---

## 11. Main screen UX requirements

### 11.1. Desired layout

Recommended first-screen structure:

```text
Header
  pvprospect
  Quick solar electricity estimate from an address, coordinates, or map point.

Main card / panel
  Location search bar: Enter address or coordinates
  Find my location button
  Map
  System size: [10] kWp
  Calculate button
  Expert mode collapsed
```

Alternative desktop layout is allowed:

```text
Left: Map
Right: Location search + system size + Calculate + Expert mode
```

But location search must be more prominent than technical assumptions.

### 11.2. Primary controls

Only these controls should be visible by default:

```text
Location input
Find my location
System size
Calculate
```

All other fields must be hidden under `Expert mode`:

```text
Losses
Tilt
Azimuth
Module type
Mounting type
PVGIS settings
PVWatts settings
Debug/provider controls
```

### 11.3. Expert mode

Collapsed label:

```text
Expert mode
```

Optional helper text:

```text
Advanced assumptions such as tilt, azimuth, losses, module type, and mounting type.
```

Default values inside Expert mode:

```text
Losses: 14%
Tilt: 35 degrees
Azimuth: 180 degrees in common solar convention; backend converts for each provider
Module type: standard/crystSi equivalent
Mounting type: free/open rack equivalent
Array type for PVWatts: fixed open rack
```

Rules:

- Expert mode must be collapsed by default.
- Changes in Expert mode must be reflected in assumptions summary.
- Normal users should not need Expert mode for basic estimate.

### 11.4. Validation copy

Avoid scary or premature red errors.

Do not show:

```text
Select a point on the map or enter valid coordinates.
```

when a valid location is already present.

Better empty state:

```text
Enter an address, paste coordinates, click the map, or use your location.
```

Better invalid state:

```text
We could not understand this location. Try an address like “Lisbon, Portugal” or coordinates like “38.7223, -9.1393”.
```

### 11.5. Button naming

Use:

```text
Calculate
```

Do not use:

```text
Analyze prospect
```

Reason: `Calculate` is simpler and matches the user’s mental model.

---

## 12. Production provider requirements

### 12.1. Frontend-to-backend API

Frontend must call only SOLAI backend.

Main calculation endpoint:

```http
POST /api/prospect-runs
```

Request:

```json
{
  "locationInput": "Lisbon, Portugal",
  "lat": 38.7223,
  "lon": -9.1393,
  "locationSource": "nominatim_search",
  "systemSizeKwp": 10,
  "lossPercent": 14,
  "moduleType": "standard",
  "mountingType": "free",
  "tiltDegrees": 35,
  "azimuthDegrees": 180
}
```

Rules:

- If `lat`/`lon` are already resolved, backend validates and calculates.
- If only `locationInput` is provided, backend resolves it first.
- If `locationInput` is coordinates, backend parses coordinates before geocoding.
- If geocoding returns multiple candidates, backend may return `needs_location_choice` instead of running production calculation.

Response statuses:

```text
success
partial
needs_location_choice
invalid_location
provider_error
failed
```

### 12.2. PVGIS adapter

Backend must include dedicated `pvgisAdapter`.

Recommended PVGIS tool:

```text
PVcalc
```

Recommended endpoint:

```text
https://re.jrc.ec.europa.eu/api/v5_3/PVcalc
```

Required request method:

```text
GET
```

Default query parameters:

```text
lat=<decimal latitude>
lon=<decimal longitude>
peakpower=<systemSizeKwp>
loss=<lossPercent>
angle=<tiltDegrees>
aspect=<pvgisAspectDegrees>
outputformat=json
browser=0
```

Important azimuth/aspect rule:

```text
UI solar azimuth convention: 180 = South, 90 = East, 270 = West, 0/360 = North.
PVGIS aspect convention: 0 = South, -90 = East, 90 = West, 180 = North.
```

Therefore backend must convert UI azimuth to PVGIS `aspect`.

Suggested conversion:

```ts
function uiAzimuthToPvgisAspect(uiAzimuth: number): number {
  let aspect = uiAzimuth - 180;
  if (aspect > 180) aspect -= 360;
  if (aspect < -180) aspect += 360;
  return aspect;
}
```

Examples:

```text
UI 180 South -> PVGIS 0
UI 90 East   -> PVGIS -90
UI 270 West  -> PVGIS 90
UI 0 North   -> PVGIS -180 or 180
```

Do not use `optimalangles=1` for the main two-provider comparison unless the same equivalent assumptions can be applied to PVWatts. For comparable results, both providers should use the same visible/default assumptions.

Required PVGIS output extraction:

```text
annual production:
outputs.totals.fixed.E_y

monthly production:
outputs.monthly.fixed[*].E_m
```

Handling:

- frontend must not call PVGIS directly;
- backend must set `outputformat=json` explicitly;
- backend must handle `429 Too Many Requests`;
- backend must handle `529 Site is overloaded`;
- backend should cache recent identical requests;
- raw PVGIS response must not be shown on main result screen.

### 12.3. PVWatts v8 adapter

Backend must include dedicated `pvwattsAdapter`.

Recommended endpoint:

```text
https://developer.nlr.gov/api/pvwatts/v8.json
```

Required request method:

```text
GET
```

Required parameters for MVP:

```text
api_key=<server-side API key>
lat=<decimal latitude>
lon=<decimal longitude>
system_capacity=<systemSizeKwp>
azimuth=<uiAzimuthDegrees>
tilt=<tiltDegrees>
array_type=<pvwattsArrayType>
module_type=<pvwattsModuleType>
losses=<lossPercent>
timeframe=monthly
```

PVWatts convention:

```text
azimuth: 180 = South, 90 = East, 270 = West, 0 = North
```

Therefore, UI azimuth can be passed to PVWatts directly.

Default mapping:

```text
moduleType standard -> module_type=0
moduleType premium  -> module_type=1
moduleType thinfilm -> module_type=2

mountingType free/open rack -> array_type=0
mountingType roof/fixed roof -> array_type=1, if intentionally selected
```

Required PVWatts output extraction:

```text
annual production:
outputs.ac_annual

monthly production:
outputs.ac_monthly[0..11]
```

Handling:

- API key must stay server-side;
- frontend must never receive API key;
- backend must handle `429 Too Many Requests`;
- backend must distinguish API errors from valid low/zero production results;
- backend should cache recent identical requests;
- raw PVWatts response must not be shown on main result screen.

---

## 13. Result screen requirements

### 13.1. Remove confidence label

Do not show:

```text
Confidence: medium
```

or similar labels in the normal result UI.

Reason: this label adds little value and may confuse users.

Confidence may remain internally in normalized JSON or developer details.

### 13.2. Top result cards

Recommended top section:

```text
Estimated annual production
12,420 kWh/year
1,242 kWh/kWp/year for 10 kWp

Recommended average
12,420 kWh/year
Based on PVGIS and PVWatts

Difference between models
5.5%
```

Do not show a `Best month` card.

### 13.3. Monthly chart

The monthly chart must compare PVGIS and PVWatts directly.

Accepted chart concept:

```text
PVGIS and PVWatts shown in one monthly comparison chart using two related shades.
The recommended average is shown as a thin horizontal tick/line for each month.
```

Important chart semantics:

PVGIS and PVWatts are alternative estimates, not additive values. Therefore the chart may visually use a two-shade stacked/overlaid style, but it must not imply:

```text
PVGIS + PVWatts = total production
```

Recommended implementation options, in priority order:

1. **Grouped monthly columns**: PVGIS and PVWatts side-by-side, average as a thin line/tick.
2. **Overlapped/two-shade columns**: both values in one monthly slot, average as a line/tick.
3. **Two-tone range column**: min/max provider range as a vertical bar, average as a line/tick.

If using a “stacked column” visual, label it internally as a comparison/range chart and avoid any visual that suggests summing providers.

Chart requirements:

- x-axis: Jan–Dec;
- y-axis: kWh/month;
- two provider values visible;
- average visible;
- legend: PVGIS, PVWatts, Average;
- values may appear on hover or labels;
- chart must be readable on laptop and tablet.

### 13.4. Source comparison table

Keep a simple comparison table under the chart.

Example:

```text
Source      Annual production      Specific yield
PVGIS       12,760 kWh/year         1,276 kWh/kWp/year
PVWatts     12,080 kWh/year         1,208 kWh/kWp/year
Average     12,420 kWh/year         1,242 kWh/kWp/year
Difference  5.5%
```

Rules:

- Use `PVWatts`, not `PVWATTS` in UI text unless all-caps is used intentionally in chart legend.
- Units must always be visible.
- Difference must be calculated only between successful real provider results.

### 13.5. Assumptions summary

Assumptions summary should remain visible but compact.

Visible fields:

```text
Location
System size
Tilt
Azimuth
Losses
```

Optional collapsed details:

```text
Module type
Mounting type
Provider endpoints
Provider statuses
```

### 13.6. Developer details

Rename technical details to:

```text
Developer details
```

Rules:

- collapsed by default;
- no giant raw JSON block visible by default;
- show summary first;
- raw JSON available only behind `Show raw JSON`;
- no secrets, API keys, full stack traces or internal file paths.

---

## 14. Normalization and consolidation requirements

### 14.1. Internal normalized schema

```ts
type LocationSource =
  | "map_click"
  | "manual_coordinates"
  | "browser_geolocation"
  | "nominatim_search"
  | "unknown";

type ProspectLocation = {
  lat: number;
  lon: number;
  inputText: string;
  displayLabel: string | null;
  source: LocationSource;
  geocodingProvider?: "nominatim" | null;
  geocodingPlaceId?: string | number | null;
  osmType?: string | null;
  osmId?: string | number | null;
};

type ProviderSource = "pvgis" | "pvwatts";

type ProviderStatus =
  | "success"
  | "failed"
  | "partial"
  | "disabled"
  | "timeout"
  | "rate_limited";

type ProspectAssumptions = {
  systemSizeKwp: number;
  lossPercent: number;
  tiltDegrees: number;
  uiAzimuthDegrees: number;
  moduleType: "standard" | "premium" | "thinfilm";
  mountingType: "free" | "roof";
};

type MonthlyProduction = {
  month: number; // 1-12
  kwh: number;
  kwhPerKwp: number;
};

type SourceEstimate = {
  source: ProviderSource;
  status: ProviderStatus;
  annualKwh: number | null;
  annualKwhPerKwp: number | null;
  monthly: MonthlyProduction[];
  warnings: string[];
  metadata: Record<string, unknown>;
};

type ConsolidatedEstimate = {
  annualKwh: number | null;
  annualKwhPerKwp: number | null;
  monthly: MonthlyProduction[];
  deltaPercent: number | null;
  providerCount: number;
  recommendationLabel: string;
};
```

### 14.2. Consolidation rules

If both PVGIS and PVWatts succeed:

```text
recommended = average(PVGIS, PVWatts)
difference = abs(PVGIS - PVWatts) / average(PVGIS, PVWatts) * 100
```

If only one provider succeeds:

```text
recommended = successful provider
show warning: Only one provider returned a result.
```

If both fail:

```text
show failure state
allow retry
```

Do not show confidence label in normal UI.

### 14.3. Monthly average

For every month:

```text
monthly_average = average(successful provider monthly values)
```

If one provider fails for a month:

```text
monthly_average = successful provider value
```

If both missing:

```text
monthly_average = null
```

---

## 15. Data model additions

### ProspectRun

```text
id
created_at
created_by
location_input
location_display_label
location_source
lat
lon
system_size_kwp
loss_percent
tilt_degrees
ui_azimuth_degrees
pvgis_aspect_degrees
module_type
mounting_type
status
annual_kwh
annual_kwh_per_kwp
source_delta_percent
warnings_json
```

### ProspectSourceResult

```text
id
prospect_run_id
source
status
annual_kwh
annual_kwh_per_kwp
monthly_json
assumptions_json
metadata_json
warnings_json
raw_response_ref
created_at
```

### GeocodingCache

Recommended if PostgreSQL exists:

```text
id
provider
normalized_query
accept_language
result_json
created_at
last_used_at
expires_at
```

Cache TTL suggestion for MVP:

```text
30 days
```

Cache behavior:

- cache successful query result lists;
- cache empty results for shorter period, e.g. 24 hours;
- do not cache private/confidential addresses if that becomes a concern;
- for internal MVP, normal address cache is acceptable.

### ProspectSettings

```text
id
default_system_size_kwp
default_loss_percent
default_tilt_degrees
default_ui_azimuth_degrees
default_module_type
default_mounting_type
pvgis_base_url
pvwatts_base_url
geocoding_provider
nominatim_base_url
cache_ttl_days
updated_at
updated_by
```

---

## 16. Error states

### 16.1. Invalid location input

```text
We could not understand this location. Try an address like “Lisbon, Portugal” or coordinates like “38.7223, -9.1393”.
```

### 16.2. Address not found

```text
No location found. Try a more specific address, city, or coordinates.
```

### 16.3. Multiple locations found

```text
Choose the correct location.
```

### 16.4. Geocoding unavailable

```text
Address search is temporarily unavailable. You can still click the map or paste coordinates.
```

### 16.5. PVGIS unavailable

```text
PVGIS is temporarily unavailable. Showing PVWatts-only result if available.
```

### 16.6. PVWatts unavailable

```text
PVWatts is temporarily unavailable. Showing PVGIS-only result if available.
```

### 16.7. Both production providers fail

```text
We could not calculate production for this location right now. Please try again.
```

---

## 17. Non-functional requirements

### 17.1. Performance

Targets:

```text
Initial page load: acceptable for internal preview
Coordinate parse: instant
Nominatim geocoding: usually under a few seconds
PVGIS request: usually a few seconds
PVWatts request: usually a few seconds
Full result target: under 60 seconds when providers respond
```

### 17.2. Reliability

Backend must implement:

- timeouts;
- provider status;
- safe retry where appropriate;
- no infinite waiting;
- graceful degradation;
- cache for geocoding and production providers where useful;
- server-side logging without secrets.

### 17.3. Security

MVP must not expose:

- PVWatts API key;
- secrets;
- raw `.env` values;
- internal file paths;
- stack traces;
- provider credentials.

### 17.4. Privacy

MVP should avoid personal data.

Stored data is expected to be:

- address/location query;
- coordinates;
- assumptions;
- production estimates;
- provider metadata;
- internal user id if auth exists.

Do not submit confidential/private customer data to public Nominatim.

### 17.5. Units

All output must explicitly show units:

```text
kWp
kWh
kWh/year
kWh/month
kWh/kWp/year
kWh/kWp/month
%
```

### 17.6. Responsive behavior

MVP should be desktop-first, but result screen should remain readable on tablet and mobile.

Location input must remain usable on mobile.

---

## 18. Suggested stack

Recommended stack:

```text
Profile: Internal Tool
Frontend: Next.js App Router + React
Language: TypeScript strict
Map: Leaflet
Styling: Tailwind CSS
Component layer: shadcn/Radix/Base UI-style components
Validation: Zod
Backend: Next.js route handlers / server actions
Database: PostgreSQL + Prisma, if saving history/settings/cache
Deployment: Docker Compose on VPS
Preview URL: pvprospect2.preview.solaisol.com
Testing: Vitest + Playwright smoke flow
```

Database is strongly recommended for v1.2 if implementing geocoding cache and result history.

---

## 19. Acceptance criteria

### 19.1. Location UX acceptance

- Main screen has one prominent location search bar.
- Placeholder says `Enter address or coordinates`.
- Separate latitude/longitude fields are not visible on main screen.
- User can paste valid coordinates and marker updates.
- User can type address and resolve it to coordinates.
- User can click map and input updates to coordinates.
- User can click `Find my location` and input updates to coordinates.
- Clicking/focusing the input selects the current value.
- `Calculate` works after any valid location path.
- No red validation error appears while a valid location exists.

### 19.2. Coordinate and geocoding acceptance

- Coordinate parser runs before Nominatim.
- Valid coordinates do not trigger geocoding call.
- App-generated coordinates use the canonical `lat, lon` format with six decimals and dot decimals.
- Map click sets internal `confirmedLocation` directly and fills the input with canonical coordinates.
- Browser geolocation sets internal `confirmedLocation` directly and fills the input with canonical coordinates.
- If `confirmedLocation` exists and the input is not dirty, `Calculate` uses the internal coordinates directly.
- The app does not need to reparse its own generated coordinate string before calculation.
- If the user edits the input, the app first tries coordinate parsing, then address geocoding.
- The app never auto-swaps latitude and longitude in MVP.
- Address geocoding happens backend-side.
- Public Nominatim is not called from frontend.
- No autocomplete calls to public Nominatim.
- Geocoding is triggered only by Enter, Calculate, or explicit search action.
- Backend rate-limits Nominatim to max 1 request/second server-wide.
- Backend sends valid identifying User-Agent or Referer.
- Backend caches repeated geocoding queries.
- Multiple geocoding candidates can be shown and selected.
- If geocoding fails, user can still use map click or coordinates.

### 19.3. Main calculation acceptance

- `Calculate` is the primary CTA.
- Default system size is `10 kWp`.
- All advanced assumptions are under collapsed `Expert mode`.
- Backend calls PVGIS server-side.
- Backend calls PVWatts server-side.
- PVWatts API key is never exposed to frontend.
- PVGIS and PVWatts results are normalized.
- Annual production is shown.
- Monthly production is shown.
- Provider comparison is shown.
- Recommended average is shown.
- Difference percentage is shown.
- No `Confidence: medium` label is shown in normal UI.
- No `Best month` card is shown.

### 19.4. Chart acceptance

- Monthly chart compares PVGIS and PVWatts.
- Provider values use two related shades.
- Recommended average is shown as a line/tick/marker.
- Chart does not imply PVGIS + PVWatts should be added.
- Chart has legend and units.
- Annual source comparison table exists below or near chart.

### 19.5. Developer details acceptance

- Technical/debug section is renamed `Developer details`.
- Section is collapsed by default.
- Raw JSON is not shown by default.
- Raw JSON is available only behind explicit `Show raw JSON`.
- No secrets or API keys appear in developer details.

---

## 20. Risks and open questions

### R1 — Public Nominatim is suitable only for modest internal usage

Public Nominatim is acceptable for internal MVP if usage is low, request-triggered by user action, cached, and rate-limited.

If usage grows, the app should switch to one of:

```text
self-hosted Nominatim
self-hosted Photon/Pelias
commercial geocoding provider
country-specific geocoder
```

The geocoding provider must remain configurable.

### R2 — Address geocoding may return wrong or ambiguous results

Address search can produce multiple or unexpected results.

Mitigation:

- show candidate list when ambiguous;
- always store final coordinates;
- allow map correction after geocoding;
- display coordinates in developer details.

### R3 — Public geocoding and confidential addresses

Do not submit confidential customer addresses to public geocoding services without policy review.

For internal MVP this is acceptable only for non-sensitive prospecting.

### R4 — PVGIS and PVWatts are not identical models

Differences are expected because providers use different datasets, assumptions and models.

The UI must communicate that the recommended value is a preliminary average, not final engineering truth.

### R5 — Azimuth convention mistakes can corrupt comparison

PVGIS and PVWatts use different orientation conventions.

Mitigation:

- keep UI convention simple;
- convert for PVGIS in backend;
- add unit tests for azimuth conversion.

---

## 21. MVP definition

MVP v1.2 is accepted when:

```text
A Solar AI Solutions user can open pvprospect2.preview.solaisol.com,
enter an address or coordinates, use browser location, or click the map,
set only the system size if needed,
click Calculate,
and receive a clean annual/monthly PV production infographic comparing PVGIS and PVWatts,
with a recommended average and no unnecessary technical noise on the main screen.
```

The interface should be simple enough that a non-technical user can use it without explanation.

---

## 22. Official references reviewed

**PVGIS API non-interactive service**  
https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en

**PVWatts v8 API**  
https://developer.nlr.gov/docs/solar/pvwatts/v8/

**Nominatim Usage Policy**  
https://operations.osmfoundation.org/policies/nominatim/

**Nominatim Search API**  
https://nominatim.org/release-docs/latest/api/Search/

**Nominatim Reverse API**  
https://nominatim.org/release-docs/latest/api/Reverse/
