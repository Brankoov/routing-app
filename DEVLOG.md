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