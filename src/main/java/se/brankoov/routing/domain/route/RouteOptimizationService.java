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
import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;

@Service
public class RouteOptimizationService {

    // Vi nollställer denna. Vi litar på 2-Opt istället för "gissningar".
    private static final double END_WEIGHT = 0.0;

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
        matrixRequestCoords.add(List.of(startPos.lng(), startPos.lat())); // Index 0
        for (StopResponse s : stopsWithCoords) {
            if (s.longitude() != null && s.latitude() != null) {
                matrixRequestCoords.add(List.of(s.longitude(), s.latitude())); // Index 1..N
            } else {
                throw new RuntimeException("Failed to geocode stop: " + s.address());
            }
        }
        matrixRequestCoords.add(List.of(endPos.lng(), endPos.lat())); // Sista Index

        // 5. Hämta Matris
        double[][] durations = orsMatrixService.getDurations(matrixRequestCoords);

        System.out.println("✅ ORS Matrix svarade! Storlek: " + durations.length + "x" + durations[0].length);

        // 6. Initial lösning (Nearest Neighbour)
        List<StopResponse> initialRoute = solveTspNearestNeighbour(stopsWithCoords, durations);

        // 7. Förbättra lösningen med 2-Opt (Tar bort korsningar och sicksack)
        List<StopResponse> optimizedRoute = optimizeTwoOpt(initialRoute, durations, stopsWithCoords);

        // 8. Hämta Geometri (Vägen)
        List<List<Double>> finalPath = new ArrayList<>();
        finalPath.add(List.of(startPos.lng(), startPos.lat()));
        for (StopResponse s : optimizedRoute) {
            finalPath.add(List.of(s.longitude(), s.latitude()));
        }
        finalPath.add(List.of(endPos.lng(), endPos.lat()));

        String geometry = orsDirectionsService.getRouteGeometry(finalPath);

        // 9. Returnera
        List<StopResponse> finalResult = IntStream.range(0, optimizedRoute.size())
                .mapToObj(i -> {
                    var s = optimizedRoute.get(i);
                    return new StopResponse(s.id(), s.label(), s.address(), s.latitude(), s.longitude(), i);
                })
                .toList();

        return new RouteOptimizationResponse(finalResult, finalResult.size(), geometry);
    }

    /**
     * Grundläggande Nearest Neighbour
     */
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
                // Vi lägger till en LITEN straffavgift för avstånd till målet,
                // men mycket mindre än förut (0.001) bara för att bryta lika-lägen.
                double timeToFinish = durations[matrixIndex][endIndex] * 0.001;

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

    /**
     * 2-OPT OPTIMERING: Rätar ut "korsningar" och onödiga omvägar.
     */
    private List<StopResponse> optimizeTwoOpt(List<StopResponse> route, double[][] durations, List<StopResponse> originalStops) {
        List<StopResponse> improvedRoute = new ArrayList<>(route);
        boolean improvement = true;
        int loopCount = 0;

        // Vi kör loopen tills vi inte hittar några fler förbättringar
        while (improvement && loopCount < 50) {
            improvement = false;
            loopCount++;

            // Gå igenom alla par av kanter (i och k)
            for (int i = 0; i < improvedRoute.size() - 1; i++) {
                for (int k = i + 1; k < improvedRoute.size(); k++) {

                    // Beräkna nuvarande avstånd
                    double currentDist = calculateSegmentCost(improvedRoute, durations, originalStops, i, k);

                    // Skapa en ny rutt där vi vänder på segmentet mellan i och k
                    List<StopResponse> newRoute = twoOptSwap(improvedRoute, i, k);

                    // Beräkna nytt avstånd
                    double newDist = calculateSegmentCost(newRoute, durations, originalStops, i, k);

                    // Om det blev bättre, behåll ändringen!
                    if (newDist < currentDist) {
                        improvedRoute = newRoute;
                        improvement = true;
                        // System.out.println("🔄 2-Opt förbättring hittad! (" + currentDist + " -> " + newDist + ")");
                    }
                }
            }
        }
        return improvedRoute;
    }

    // Hjälpmetod för att vända på en del av listan
    private List<StopResponse> twoOptSwap(List<StopResponse> route, int i, int k) {
        List<StopResponse> newRoute = new ArrayList<>();
        // 1. Ta allt fram till i
        for (int c = 0; c <= i - 1; c++) newRoute.add(route.get(c));

        // 2. Ta segmentet från i till k, men BAKLÄNGES
        for (int c = k; c >= i; c--) newRoute.add(route.get(c));

        // 3. Ta resten
        for (int c = k + 1; c < route.size(); c++) newRoute.add(route.get(c));

        return newRoute;
    }

    // Hjälpmetod för att räkna kostnad för en del av rutten
    // Vi behöver originalStops för att hitta rätt index i duration-matrisen
    private double calculateSegmentCost(List<StopResponse> route, double[][] durations, List<StopResponse> originalStops, int i, int k) {
        // Hitta Start-index (0) i matrisen
        int prevMatrixIndex = (i == 0) ? 0 : originalStops.indexOf(route.get(i - 1)) + 1;

        double cost = 0;

        // Summera kostnaden för segmentet vi kollar på
        for (int c = i; c <= k; c++) {
            int currentMatrixIndex = originalStops.indexOf(route.get(c)) + 1;
            cost += durations[prevMatrixIndex][currentMatrixIndex];
            prevMatrixIndex = currentMatrixIndex;
        }

        // Lägg till kostnaden till nästa punkt efter k (eller slutet)
        int nextMatrixIndex = (k + 1 < route.size())
                ? originalStops.indexOf(route.get(k + 1)) + 1
                : durations.length - 1; // Sista index i matrisen är End Address

        cost += durations[prevMatrixIndex][nextMatrixIndex];

        return cost;
    }

    // --- SPARA & HÄMTA ---
    @Transactional
    public RouteEntity saveRoute(SaveRouteRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity currentUser = userRepository.findByUsername(username).orElseThrow();
        RouteEntity entity = new RouteEntity(request.name(), request.description(), request.startAddress(), request.endAddress(), request.geometry());
        entity.setOwner(currentUser);
        request.stops().forEach(s -> entity.addStop(new RouteStopEntity(s.label(), s.address(), s.latitude(), s.longitude(), s.order())));
        return routeRepository.save(entity);
    }

    public List<RouteEntity> getMyRoutes() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return routeRepository.findAllByOwnerUsername(username);
    }
}