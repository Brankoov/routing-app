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

    private static final double END_WEIGHT = 0.2;

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
            return new StopResponse(s.id(), s.label(), s.address(), lat, lng, 0);
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

        // 6. Optimera (NN + 2-Opt)
        List<StopResponse> initialRoute = solveTspNearestNeighbour(stopsWithCoords, durations);
        List<StopResponse> optimizedRoute = optimizeTwoOpt(initialRoute, durations, stopsWithCoords);

        // 7. Hämta Geometri
        List<List<Double>> finalPath = new ArrayList<>();
        finalPath.add(List.of(startPos.lng(), startPos.lat()));
        for (StopResponse s : optimizedRoute) {
            finalPath.add(List.of(s.longitude(), s.latitude()));
        }
        finalPath.add(List.of(endPos.lng(), endPos.lat()));

        String geometry = orsDirectionsService.getRouteGeometry(finalPath);

        // 8. Räkna ut total tid (NYTT!)
        long totalSeconds = calculateTotalDuration(optimizedRoute, durations, stopsWithCoords);

        // 9. Returnera
        List<StopResponse> finalResult = IntStream.range(0, optimizedRoute.size())
                .mapToObj(i -> {
                    var s = optimizedRoute.get(i);
                    return new StopResponse(s.id(), s.label(), s.address(), s.latitude(), s.longitude(), i);
                })
                .toList();

        return new RouteOptimizationResponse(finalResult, finalResult.size(), geometry, totalSeconds);
    }

    // --- HJÄLPMETOD FÖR TID ---
    private long calculateTotalDuration(List<StopResponse> route, double[][] durations, List<StopResponse> originalStops) {
        long totalTime = 0;
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

    // --- TSP LÖSARE (Samma som förut) ---
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

    @Transactional
    public RouteEntity saveRoute(SaveRouteRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // HÄR SKER ANROPET. KOLLA NOGA ATT ORDNINGEN ÄR RÄTT:
        RouteEntity entity = new RouteEntity(
                request.name(),                 // 1. String
                request.description(),          // 2. String
                request.startAddress(),         // 3. String
                request.endAddress(),           // 4. String
                request.geometry(),             // 5. String
                request.totalDuration(),        // 6. Long
                request.averageStopDuration()   // 7. Integer <--- Denna måste matcha Request
        );

        entity.setOwner(currentUser);

        request.stops().forEach(s -> {
            RouteStopEntity stopEntity = new RouteStopEntity(
                    s.label(), s.address(), s.latitude(), s.longitude(), s.order()
            );
            entity.addStop(stopEntity);
        });

        return routeRepository.save(entity);
    }

    public List<RouteEntity> getMyRoutes() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return routeRepository.findAllByOwnerUsername(username);
    }
}