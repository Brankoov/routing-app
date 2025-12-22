package se.brankoov.routing.domain.route;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.brankoov.routing.api.route.RouteOptimizationRequest;
import se.brankoov.routing.api.route.RouteOptimizationResponse;
import se.brankoov.routing.api.route.SaveRouteRequest;
import se.brankoov.routing.api.route.StopResponse;
import se.brankoov.routing.domain.auth.UserEntity;
import se.brankoov.routing.domain.auth.UserRepository;
import se.brankoov.routing.domain.geocode.GeocodingService;
import se.brankoov.routing.domain.route.entity.RouteEntity;
import se.brankoov.routing.domain.route.entity.RouteRepository;
import se.brankoov.routing.domain.route.entity.RouteStopEntity;
import se.brankoov.routing.infra.ors.OrsDirectionsService;
import se.brankoov.routing.infra.ors.OrsMatrixService;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

@Service
public class RouteOptimizationService {

    private static final double END_WEIGHT = 0.1;

    private final RoutingEngine routingEngine;
    private final GeocodingService geocodingService;
    private final RouteRepository routeRepository;
    private final UserRepository userRepository;
    private final OrsMatrixService orsMatrixService;
    private final OrsDirectionsService orsDirectionsService;

    public RouteOptimizationService(RoutingEngine routingEngine,
                                    GeocodingService geocodingService,
                                    RouteRepository routeRepository,
                                    UserRepository userRepository,
                                    OrsMatrixService orsMatrixService,
                                    OrsDirectionsService orsDirectionsService) {
        this.routingEngine = routingEngine;
        this.geocodingService = geocodingService;
        this.routeRepository = routeRepository;
        this.userRepository = userRepository;
        this.orsMatrixService = orsMatrixService;
        this.orsDirectionsService = orsDirectionsService;
    }

    public RouteOptimizationResponse optimize(RouteOptimizationRequest request) {
        // 1. Geokoda Start
        GeocodingService.LatLng startPos = geocodingService
                .geocodeFirst(request.startAddress())
                .orElseThrow(() -> new RuntimeException("Could not geocode start address"));

        // 2. Geokoda Stopp
        List<StopResponse> stopsWithCoords = request.stops().stream().map(s -> {
            Double lat = s.latitude();
            Double lng = s.longitude();
            if (lat == null || lng == null) {
                var maybe = geocodingService.geocodeFirst(s.address());
                if (maybe.isPresent()) {
                    lat = maybe.get().lat();
                    lng = maybe.get().lng();
                }
            }
            return new StopResponse(s.id(), s.label(), s.address(), lat, lng, 0); // Order sätts senare
        }).toList();

        // 3. Geokoda Slut
        GeocodingService.LatLng endPos = geocodingService
                .geocodeFirst(request.endAddress())
                .orElseThrow(() -> new RuntimeException("Could not geocode end address"));


        // 4. Bygg Matrix Request (Behövs för tidsberäkning oavsett om vi optimerar eller ej)
        List<List<Double>> matrixRequestCoords = new ArrayList<>();
        matrixRequestCoords.add(List.of(startPos.lng(), startPos.lat()));
        for (StopResponse s : stopsWithCoords) {
            if (s.longitude() != null && s.latitude() != null) {
                matrixRequestCoords.add(List.of(s.longitude(), s.latitude()));
            } else {
                throw new RuntimeException("Failed to geocode stop: " + s.address());
            }
        }
        matrixRequestCoords.add(List.of(endPos.lng(), endPos.lat()));

        // 5. Hämta Matris
        double[][] durations = orsMatrixService.getDurations(matrixRequestCoords);
        System.out.println("✅ ORS Matrix svarade! Storlek: " + durations.length + "x" + durations[0].length);

        // 6. Bestäm ordning (Optimera ELLER behåll originalordning)
        List<StopResponse> finalRouteOrder;

        if (request.optimize()) {
            // --- KÖR OPTIMERING (TSP + SA) ---
            System.out.println("Startar optimering...");
            List<StopResponse> bestRouteSoFar = solveTspNearestNeighbour(stopsWithCoords, durations);
            bestRouteSoFar = optimizeTwoOpt(bestRouteSoFar, durations, stopsWithCoords);

            double minDuration = calculateTotalCost(bestRouteSoFar, durations, stopsWithCoords);
            int ITERATIONS = 50;
            System.out.println("Kör " + ITERATIONS + " iterationer av Simulated Annealing...");

            for (int i = 0; i < ITERATIONS; i++) {
                List<StopResponse> candidate = solveSimulatedAnnealing(new ArrayList<>(bestRouteSoFar), durations, stopsWithCoords);
                double cost = calculateTotalCost(candidate, durations, stopsWithCoords);
                if (cost < minDuration) {
                    minDuration = cost;
                    bestRouteSoFar = new ArrayList<>(candidate);
                }
            }
            finalRouteOrder = bestRouteSoFar;
        } else {
            // --- BEHÅLL ORIGINALORDNING ---
            System.out.println("Hoppar över optimering. Använder originalordning.");
            finalRouteOrder = new ArrayList<>(stopsWithCoords);
        }

        // 7. Hämta Geometri (Vägbeskrivning för den valda ordningen)
        List<List<Double>> finalPath = new ArrayList<>();
        finalPath.add(List.of(startPos.lng(), startPos.lat()));
        for (StopResponse s : finalRouteOrder) {
            finalPath.add(List.of(s.longitude(), s.latitude()));
        }
        finalPath.add(List.of(endPos.lng(), endPos.lat()));

        String geometry = orsDirectionsService.getRouteGeometry(finalPath);

        // 8. Räkna ut total tid
        long totalSeconds = calculateTotalDuration(finalRouteOrder, durations, stopsWithCoords);

        // 9. Returnera (Uppdatera ordningsnummer index)
        List<StopResponse> finalResult = IntStream.range(0, finalRouteOrder.size())
                .mapToObj(i -> {
                    var s = finalRouteOrder.get(i);
                    return new StopResponse(s.id(), s.label(), s.address(), s.latitude(), s.longitude(), i);
                })
                .toList();

        return new RouteOptimizationResponse(finalResult, finalResult.size(), geometry, totalSeconds);
    }

    // --- HJÄLPMETOD FÖR TID (Long för API-svar) ---
    private long calculateTotalDuration(List<StopResponse> route, double[][] durations, List<StopResponse> originalStops) {
        return (long) calculateTotalCost(route, durations, originalStops);
    }

    // --- HJÄLPMETOD FÖR KOSTNAD (Double för intern optimering) ---
    private double calculateTotalCost(List<StopResponse> route, double[][] durations, List<StopResponse> originalStops) {
        double totalTime = 0;
        int endIndex = durations.length - 1;
        int prevMatrixIndex = 0; // Start

        for (StopResponse stop : route) {
            int currentMatrixIndex = originalStops.indexOf(stop) + 1;
            totalTime += durations[prevMatrixIndex][currentMatrixIndex];
            prevMatrixIndex = currentMatrixIndex;
        }
        // Till slut
        totalTime += durations[prevMatrixIndex][endIndex];
        return totalTime;
    }

    // --- TSP LÖSARE (Nearest Neighbour) ---
    private List<StopResponse> solveTspNearestNeighbour(List<StopResponse> stops, double[][] durations) {
        List<StopResponse> remaining = new ArrayList<>(stops);
        List<StopResponse> ordered = new ArrayList<>();
        int endIndex = durations.length - 1;
        int currentIndex = 0;

        while (!remaining.isEmpty()) {
            int bestStopIndex = -1;
            double bestScore = Double.MAX_VALUE;

            for (int i = 0; i < remaining.size(); i++) {
                StopResponse candidate = remaining.get(i);
                int matrixIndex = stops.indexOf(candidate) + 1;

                double timeToCandidate = durations[currentIndex][matrixIndex];
                double timeToFinish = durations[matrixIndex][endIndex] * END_WEIGHT;

                double score = timeToCandidate + timeToFinish;

                if (score < bestScore) {
                    bestScore = score;
                    bestStopIndex = i;
                }
            }
            StopResponse next = remaining.remove(bestStopIndex);
            ordered.add(next);
            currentIndex = stops.indexOf(next) + 1;
        }
        return ordered;
    }

    // --- 2-OPT ---
    private List<StopResponse> optimizeTwoOpt(List<StopResponse> route, double[][] durations, List<StopResponse> originalStops) {
        List<StopResponse> improvedRoute = new ArrayList<>(route);
        boolean improvement = true;
        int loopCount = 0;

        while (improvement && loopCount < 50) {
            improvement = false;
            loopCount++;
            for (int i = 0; i < improvedRoute.size() - 1; i++) {
                for (int k = i + 1; k < improvedRoute.size(); k++) {
                    double currentDist = calculateSegmentCost(improvedRoute, durations, originalStops, i, k);
                    List<StopResponse> newRoute = twoOptSwap(improvedRoute, i, k);
                    double newDist = calculateSegmentCost(newRoute, durations, originalStops, i, k);

                    if (newDist < currentDist) {
                        improvedRoute = newRoute;
                        improvement = true;
                    }
                }
            }
        }
        return improvedRoute;
    }

    private List<StopResponse> twoOptSwap(List<StopResponse> route, int i, int k) {
        List<StopResponse> newRoute = new ArrayList<>();
        for (int c = 0; c <= i - 1; c++) newRoute.add(route.get(c));
        for (int c = k; c >= i; c--) newRoute.add(route.get(c));
        for (int c = k + 1; c < route.size(); c++) newRoute.add(route.get(c));
        return newRoute;
    }

    private double calculateSegmentCost(List<StopResponse> route, double[][] durations, List<StopResponse> originalStops, int i, int k) {
        int prevMatrixIndex = (i == 0) ? 0 : originalStops.indexOf(route.get(i - 1)) + 1;
        double cost = 0;
        for (int c = i; c <= k; c++) {
            int currentMatrixIndex = originalStops.indexOf(route.get(c)) + 1;
            cost += durations[prevMatrixIndex][currentMatrixIndex];
            prevMatrixIndex = currentMatrixIndex;
        }
        int nextMatrixIndex = (k + 1 < route.size())
                ? originalStops.indexOf(route.get(k + 1)) + 1
                : durations.length - 1;
        cost += durations[prevMatrixIndex][nextMatrixIndex];
        return cost;
    }

    // --- SIMULATED ANNEALING (Uppdaterade parametrar för Multi-Start) ---
    private List<StopResponse> solveSimulatedAnnealing(List<StopResponse> currentRoute, double[][] durations, List<StopResponse> originalStops) {
        List<StopResponse> bestRoute = new ArrayList<>(currentRoute);
        List<StopResponse> currentSolution = new ArrayList<>(currentRoute);

        double currentCost = calculateTotalCost(currentSolution, durations, originalStops);
        double bestCost = currentCost;

        // Parametrar justerade för bredare sökning
        double temperature = 5000.0;
        double coolingRate = 0.98;
        double absoluteTemperature = 0.1;

        while (temperature > absoluteTemperature) {
            int n = currentSolution.size();

            // Slumpa två index
            int i = (int) (Math.random() * (n - 1));
            int k = (int) (Math.random() * (n - 1));

            if (i >= k) {
                int temp = i; i = k; k = temp;
            }
            if (i == k) {
                continue;
            }

            // Utför en slumpmässig 2-opt swap
            List<StopResponse> newSolution = twoOptSwap(currentSolution, i, k);
            double newCost = calculateTotalCost(newSolution, durations, originalStops);

            // Ska vi acceptera?
            if (newCost < currentCost) {
                currentSolution = newSolution;
                currentCost = newCost;

                if (currentCost < bestCost) {
                    bestRoute = new ArrayList<>(currentSolution);
                    bestCost = currentCost;
                }
            } else {
                double acceptanceProbability = Math.exp((currentCost - newCost) / temperature);
                if (Math.random() < acceptanceProbability) {
                    currentSolution = newSolution;
                    currentCost = newCost;
                }
            }
            temperature *= coolingRate;
        }

        return bestRoute;
    }

    // --- SAVE ROUTE (UPPDATERAD FÖR ATT HANTERA REDIGERING OCH SÄKERHET) ---
    @Transactional
    public RouteEntity saveRoute(SaveRouteRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        RouteEntity route;

        // Om request har ett ID så uppdaterar vi befintlig rutt
        if (request.id() != null) {
            route = routeRepository.findById(request.id())
                    .orElseThrow(() -> new RuntimeException("Route not found with id: " + request.id()));

            // SÄKERHETSKOLL:
            // Är den inloggade personen ägaren? Eller en ADMIN?
            boolean isOwner = route.getOwner().getUsername().equals(username);
            boolean isAdmin = "ADMIN".equals(currentUser.getRole());

            if (!isOwner && !isAdmin) {
                throw new RuntimeException("Du har inte behörighet att redigera denna rutt.");
            }
            // OBS: Vi sätter INTE owner här. Vi behåller den gamla ägaren.

        } else {
            // Skapa ny rutt om inget ID finns
            route = new RouteEntity();
            route.setOwner(currentUser);
        }

        // Uppdatera fälten (gemensamt för både nytt och uppdatering)
        route.setName(request.name());
        route.setDescription(request.description());
        route.setStartAddress(request.startAddress());
        route.setEndAddress(request.endAddress());
        route.setGeometry(request.geometry());
        route.setTotalDuration(request.totalDuration());
        route.setAverageStopDuration(request.averageStopDuration());

        // Rensa gamla stopp och lägg till de nya
        route.getStops().clear();
        if (request.stops() != null) {
            request.stops().forEach(s -> {
                RouteStopEntity stopEntity = new RouteStopEntity(
                        s.label(), s.address(), s.latitude(), s.longitude(), s.order()
                );
                // addStop-hjälpmetoden i RouteEntity sätter relationen korrekt
                route.addStop(stopEntity);
            });
        }

        return routeRepository.save(route);
    }

    public List<RouteEntity> getMyRoutes() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return routeRepository.findAllByOwnerUsername(username);
    }

    /**
     * Patchar matrisen: Om två stopp är väldigt nära varandra geografiskt (fågelvägen),
     * anta att vi kan "gå över gatan" eller göra en snabb sväng, oavsett vad trafikreglerna säger.
     */
    private void patchMatrixWithWalkingPhysics(double[][] durations, List<StopResponse> stopsWithCoords, GeocodingService.LatLng startPos, GeocodingService.LatLng endPos) {
        List<GeocodingService.LatLng> allPoints = new ArrayList<>();
        allPoints.add(startPos);
        for (StopResponse s : stopsWithCoords) {
            allPoints.add(new GeocodingService.LatLng(s.latitude(), s.longitude()));
        }
        allPoints.add(endPos);

        double WALKING_SPEED_M_S = 1.4; // Ca 5 km/h
        double MAX_WALK_DIST_METERS = 80; // Om det är under 80m, tillåt "gång"

        for (int i = 0; i < durations.length; i++) {
            for (int j = 0; j < durations.length; j++) {
                if (i == j) continue;

                GeocodingService.LatLng p1 = allPoints.get(i);
                GeocodingService.LatLng p2 = allPoints.get(j);

                double distMeters = DistanceCalculator.distanceInKm(p1.lat(), p1.lng(), p2.lat(), p2.lng()) * 1000;

                if (distMeters < MAX_WALK_DIST_METERS) {
                    double walkingTime = distMeters / WALKING_SPEED_M_S;
                    double totalCheatTime = walkingTime + 15;

                    if (totalCheatTime < durations[i][j]) {
                        durations[i][j] = totalCheatTime;
                    }
                }
            }
        }
    }
}