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
            // --- HÄR KOPIERAR VI KOMMENTAREN ---
            return new StopResponse(s.id(), s.label(), s.address(), lat, lng, 0, s.comment());
        }).toList();

        // 3. Geokoda Slut
        GeocodingService.LatLng endPos = geocodingService
                .geocodeFirst(request.endAddress())
                .orElseThrow(() -> new RuntimeException("Could not geocode end address"));


        // 4. Bygg Matrix Request
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

        // 6. Bestäm ordning
        List<StopResponse> finalRouteOrder;

        if (request.optimize()) {
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
            System.out.println("Hoppar över optimering. Använder originalordning.");
            finalRouteOrder = new ArrayList<>(stopsWithCoords);
        }

        // 7. Hämta Geometri
        List<List<Double>> finalPath = new ArrayList<>();
        finalPath.add(List.of(startPos.lng(), startPos.lat()));
        for (StopResponse s : finalRouteOrder) {
            finalPath.add(List.of(s.longitude(), s.latitude()));
        }
        finalPath.add(List.of(endPos.lng(), endPos.lat()));

        String geometry = orsDirectionsService.getRouteGeometry(finalPath);

        // 8. Räkna ut total tid
        long totalSeconds = calculateTotalDuration(finalRouteOrder, durations, stopsWithCoords);

        // 9. Returnera (Uppdatera ordningsnummer index och behåll kommentar)
        List<StopResponse> finalResult = IntStream.range(0, finalRouteOrder.size())
                .mapToObj(i -> {
                    var s = finalRouteOrder.get(i);
                    // --- HÄR MÅSTE KOMMENTAREN MED OCKSÅ ---
                    return new StopResponse(s.id(), s.label(), s.address(), s.latitude(), s.longitude(), i, s.comment());
                })
                .toList();

        return new RouteOptimizationResponse(finalResult, finalResult.size(), geometry, totalSeconds);
    }

    private long calculateTotalDuration(List<StopResponse> route, double[][] durations, List<StopResponse> originalStops) {
        return (long) calculateTotalCost(route, durations, originalStops);
    }

    private double calculateTotalCost(List<StopResponse> route, double[][] durations, List<StopResponse> originalStops) {
        double totalTime = 0;
        int endIndex = durations.length - 1;
        int prevMatrixIndex = 0;

        for (StopResponse stop : route) {
            int currentMatrixIndex = originalStops.indexOf(stop) + 1;
            totalTime += durations[prevMatrixIndex][currentMatrixIndex];
            prevMatrixIndex = currentMatrixIndex;
        }
        totalTime += durations[prevMatrixIndex][endIndex];
        return totalTime;
    }

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

    private List<StopResponse> solveSimulatedAnnealing(List<StopResponse> currentRoute, double[][] durations, List<StopResponse> originalStops) {
        if (currentRoute.size() < 2) {
            return currentRoute;
        }

        List<StopResponse> bestRoute = new ArrayList<>(currentRoute);
        List<StopResponse> currentSolution = new ArrayList<>(currentRoute);

        double currentCost = calculateTotalCost(currentSolution, durations, originalStops);
        double bestCost = currentCost;

        double temperature = 5000.0;
        double coolingRate = 0.98;
        double absoluteTemperature = 0.1;

        while (temperature > absoluteTemperature) {
            int n = currentSolution.size();
            int i = (int) (Math.random() * n);
            int k = (int) (Math.random() * n);

            if (i >= k) {
                int temp = i; i = k; k = temp;
            }

            if (i == k) {
                temperature *= coolingRate;
                continue;
            }

            List<StopResponse> newSolution = twoOptSwap(currentSolution, i, k);
            double newCost = calculateTotalCost(newSolution, durations, originalStops);

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

    @Transactional
    public RouteEntity saveRoute(SaveRouteRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        RouteEntity route;

        if (request.id() != null) {
            route = routeRepository.findById(request.id())
                    .orElseThrow(() -> new RuntimeException("Route not found with id: " + request.id()));

            boolean isOwner = route.getOwner().getUsername().equals(username);
            boolean isAdmin = "ADMIN".equals(currentUser.getRole());

            if (!isOwner && !isAdmin) {
                throw new RuntimeException("Du har inte behörighet att redigera denna rutt.");
            }

        } else {
            route = new RouteEntity();
            route.setOwner(currentUser);
        }

        route.setName(request.name());
        route.setDescription(request.description());
        route.setStartAddress(request.startAddress());
        route.setEndAddress(request.endAddress());
        route.setGeometry(request.geometry());
        route.setTotalDuration(request.totalDuration());
        route.setAverageStopDuration(request.averageStopDuration());

        route.getStops().clear();
        if (request.stops() != null) {
            request.stops().forEach(s -> {
                RouteStopEntity stopEntity = new RouteStopEntity(
                        s.label(), s.address(), s.latitude(), s.longitude(), s.order()
                );
                // --- HÄR SPARAR VI KOMMENTAREN TILL DATABASEN ---
                stopEntity.setComment(s.comment());

                route.addStop(stopEntity);
            });
        }

        return routeRepository.save(route);
    }

    public List<RouteEntity> getMyRoutes() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return routeRepository.findAllByOwnerUsername(username);
    }

    // --- NY METOD: DISPATCH / TILLDELA RUTT ---
    @Transactional
    public void assignRouteToUser(Long routeId, String targetUsername) {
        // 1. Hämta originalrutten
        RouteEntity originalRoute = routeRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        // 2. Hämta mottagaren
        UserEntity targetUser = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        // 3. Skapa kopian (Nytt ID genereras automatiskt)
        RouteEntity newRoute = new RouteEntity();
        newRoute.setOwner(targetUser); // <-- Här byter vi ägare!
        newRoute.setName(originalRoute.getName() + " (Tilldelad)");
        newRoute.setDescription(originalRoute.getDescription());
        newRoute.setStartAddress(originalRoute.getStartAddress());
        newRoute.setEndAddress(originalRoute.getEndAddress());
        newRoute.setGeometry(originalRoute.getGeometry());
        newRoute.setTotalDuration(originalRoute.getTotalDuration());
        newRoute.setAverageStopDuration(originalRoute.getAverageStopDuration());

        // 4. Kopiera alla stopp (VIKTIGT: Skapa nya objekt så de inte delar ID)
        if (originalRoute.getStops() != null) {
            for (RouteStopEntity originalStop : originalRoute.getStops()) {
                RouteStopEntity newStop = new RouteStopEntity(
                        originalStop.getLabel(),
                        originalStop.getAddress(),
                        originalStop.getLatitude(),
                        originalStop.getLongitude(),
                        originalStop.getOrderIndex()
                );
                // Kopiera kommentaren/nyckeln också!
                newStop.setComment(originalStop.getComment());

                newRoute.addStop(newStop);
            }
        }

        // 5. Spara kopian
        routeRepository.save(newRoute);
    }
}