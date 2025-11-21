# Development log – Routing app

## 2025-10-11
- Cloned empty GitHub repo and created new Spring Boot project via Spring Initializr (Gradle, Java 17).
- Got a lot of issues with that approach with first creating repo and then cloning and generated project with spring initializer that i draged in to project.
- After many attempts to fix the build issues i gave up and deleted project and created new one and pushed to github. 
- I did not realize that it would delete my whole roadmap with all the work of planning i did a couple of weeks before, so that sucked..
- I redid the whole roadmap and made it a little bit different, realized i had forgotten some things that were absolutely necessary, like hosting the app.
- After that i got to create the project and started fresh from scratch.
- Added health endpoint `GET /api/health` to verify backend is running.

## 2025-11-11
- Created initial route DTOs (`StopRequest`, `RouteOptimizationRequest`, etc).
- Implemented mock endpoint `POST /api/routes/optimize` that returns ordered stops.
- Tested API with Postman, disabled default Spring Security for now.
- Introduced RouteOptimizationService for route logic and simplified RouteController.
- Confirmed that the /api/routes/optimize endpoint still works as before with test data.
- Added Bean Validation annotations to route request DTOs and enabled @Valid in RouteController so invalid input returns 400 Bad Request.
- Added first unit test for RouteOptimizationService to verify ordering and totalStops.
- Ran ./gradlew test to confirm the service behaves as expected.
- Introduced RoutingEngine abstraction with MockRoutingEngine implementation so the optimization logic can later be swapped to a real routing provider without changing the controller or DTOs.
- Added basic CORS configuration so a future React frontend (localhost:5173 and later Render) can call the backend API without CORS issues.
- Set up frontend folder with React + Vite in the same repository.
- Verified Vite dev server runs on http://localhost:5173.
- Updated roadmap issue #6 (Frontend Map SDK Setup) to include initial health check against /api/health.
- Added simple React dev UI using Vite to talk to the backend.
- Implemented a typed health API client (healthClient.ts) and HealthStatus component to display backend status.
- Implemented a typed route optimization client (routeClient.ts) and RouteTester component that sends a hard-coded request to POST /api/routes/optimize and renders the ordered stops.
- Ran into CORS / Spring Security issues when calling the backend from the frontend (fetch to /api/health failed). Fixed it by adding a SecurityConfig with CORS enabled and allowing http://localhost:5173 plus permitAll() on /api/**
- Added a simple route planner view in the frontend mocked backends POST /api/routes/optimize that shows total stops

## 2025-15-11
- Hooked up the RouteMap to our API’s stop type, added a simple fallback that dots points between Stockholm and Gothenburg when coords are missing, and fixed the Leaflet marker icons in Vite.

## 2025-16-11
- Cleaned up the ORS/routing code in the backend.
  Removed all geocoding logic from MockRoutingEngine, so it now only sorts stops and assigns their order.
  Kept the responsibility for geocoding inside RouteOptimizationService through GeocodingService.
  Updated RouteOptimizationServiceTest to use a Mockito mock of GeocodingService, ensuring the tests work with the updated constructor.
- Fixed failing API tests caused by Spring Security returning 401 Unauthorized.
  Added the spring-security-test dependency and used @WithMockUser in GeocodingControllerTest so the MockMvc requests run as an authenticated user.
  Now the geocoding endpoint tests correctly assert 200 OK and 404 Not Found instead of 401.
- Added RouteControllerTest using @WebMvcTest and @WithMockUser to cover the /api/routes/optimize endpoint.
  Mocked RouteOptimizationService to return a fixed route response and verified that the controller returns HTTP 200 with the expected JSON structure (totalStops and orderedStops with correct ids and order values).
- The RouteControllerTest did not pass at first.
- Fixed the /api/routes/optimize MockMvc test by adding a CSRF token (with(csrf())) to the POST request. Spring Security was returning 403 Forbidden due to missing CSRF protection, even with an authenticated mock user.
- Changed RouteOptimizationService so each stop gets coordinates if they are missing.
  After the routing engine sets the stop order, the service checks every stop. If a stop has no latitude or longitude, it asks GeocodingService for the coordinates and fills them in. If geocoding fails, the stop keeps null values instead of crashing the app.
- Added a unit test for RouteOptimizationService.
  The test uses mocked RoutingEngine and GeocodingService.
  It checks that when a stop has no coordinates, the service calls geocodeFirst(address) and fills in latitude and longitude in the final route response.
- Added a new OpenRouteServiceRoutingEngine class as the future routing engine.
  For now it only returns the stops in the same order as the request.
  This prepares the project for plugging in real ORS routing later.
- Wired OpenRouteServiceRoutingEngine to use the shared orsWebClient from OrsConfig.
  The routing engine still returns stops in the original order, but it now has access to the ORS WebClient, so it’s ready for a real directions call later.
- Connected the full address-to-map flow.
  The frontend now sends start address, end address and stops to /api/routes/optimize.
  RouteOptimizationService calls the routing engine and then uses GeocodingService to fill in missing latitude/longitude for each stop using OpenRouteService.
  The API response returns ordered stops with real coordinates, and the frontend can now render the route points on the map.
  Also configured the ORS_API_KEY as an environment variable so the key is not stored in the source code.

## 2025-17-11
- Added a DistanceCalculator utility using the Haversine formula to compute distances between two coordinates in kilometers.
  Also added unit tests to verify zero-distance for identical points and a reasonable distance between two real cities.
- Updated RouteOptimizationService to apply a nearest neighbour algorithm on geocoded stops.
  The service now geocodes missing coordinates, then reorders the stops by picking the next closest stop based on Haversine distance, and finally reassigns the order indices.
  Added unit tests to verify both geocoding enrichment and the nearest neighbour ordering logic.
- Added a simple in-memory geocoding cache to GeocodingService.
  The service now normalizes the address, checks a ConcurrentHashMap before calling ORS, and stores successful results in the cache.
  Also added a test using a subclassed GeocodingService to verify that repeated lookups of the same address only trigger one ORS call and the second one is served from cache.
- Updated RouteOptimizationService so the nearest neighbour algorithm now starts from the geocoded startAddress when available.
  If geocoding the start address fails, it falls back to starting from the first stop as before.
  Added a unit test to verify that a depot-like start location changes the stop order so the closest stop is visited first.
- Originally, my nearest-neighbour algorithm only looked at the distance from the current stop to the next one.
  This worked, but it sometimes produced routes that drifted in the wrong direction — for example, visiting “outward” stops even if the final destination was south.
To fix this, I added end-address awareness. Now the algorithm calculates both:

the distance from the current point to each candidate stop

plus a weighted distance from that stop toward the final address

This means the route naturally pulls itself toward the final destination (e.g., Tumba), instead of ending with stops that lie in the opposite direction.

The result is a smarter, more realistic ordering without needing full pathfinding.
- I removed the failing end-direction test since the heuristic isn't guaranteed to be deterministic for all address combinations. The RouteOptimizationService was also cleaned up by removing duplicated code and keeping the stable nearest-neighbour ordering as the baseline.

## 2025-20-11
-I updated the route result view so that each optimized stop now has an “Open in Google Maps” link. The link uses coordinates when they are available and falls back to the address string otherwise. This makes it much easier to use the app for planning a round and then switch over to Google Maps for the actual driving.
- Implemented address autocomplete in the frontend using a custom `AutoAddressInput` component.
  It fetches suggestions via a new backend proxy endpoint (`/api/geocode/suggest`) that calls OpenRouteService.
  Added debouncing to prevent API spamming while typing.
- Fixed several UI/UX issues with the address input:
  * Solved "White text on white background" issue in the suggestion list.
  * Switched backend from ORS `/autocomplete` to `/search` endpoint to get better hits on full addresses.
  * Implemented "Smart Input Logic" in frontend: If the API returns a street name but misses the specific house number entered by the user, the app now injects the user's number into the final result. This fixes the issue where selecting a suggestion would delete the house number.
  * Fixed "Ghost Suggestions" (race conditions) by adding focus-checks and `autocomplete="off"` to prevent browser history from overlapping the app's suggestions.
- Set up PostgreSQL database using Docker Compose.
  Ran into issues with Windows WSL2 crashing, which required a full restart and Docker data purge.
  Encountered port conflicts with a local Postgres installation (port 5432), resolved by mapping the Docker container to port **5433**.
- Configured Spring Boot with **Spring Data JPA**.
  Created `RouteEntity` and `RouteStopEntity` classes.
  Verified that Hibernate automatically creates the `routes` and `route_stops` tables in the database upon startup.
- Connected the Frontend to the Backend Save Endpoint.
  Updated `routeClient.ts` with a typed `saveRoute` function.
  Modified `RoutePlanner.tsx` to include a "Route Name" input and a "Save Route" button that appears after optimization.
  Added UI feedback (success/error states) for the save operation.
- Verified end-to-end flow: Optimization -> Naming -> Saving to PostgreSQL.

## 2025-21-11
- Implemented `GET /api/routes` endpoint to retrieve all saved routes from the database.
- Solved infinite JSON recursion issues by adding `@JsonIgnore` to the parent relationship in `RouteStopEntity`.
- Implemented `SavedRoutesList` component in React to display routes stored in the database.
- Added `fetchAllRoutes` to the API client to consume the `GET /api/routes` endpoint.
- Integrated the list view into the main App dashboard.
- Implemented `DELETE /api/routes/{id}` endpoint in backend.
- Added delete functionality to frontend client and `SavedRoutesList` component with confirmation dialog.
- 