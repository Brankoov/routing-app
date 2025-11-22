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
import se.brankoov.routing.infra.ors.OrsMatrixService;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

@Service
public class RouteOptimizationService {

    private final RoutingEngine routingEngine;
    private final GeocodingService geocodingService;
    private final RouteRepository routeRepository;
    private final UserRepository userRepository;
    private final OrsMatrixService orsMatrixService; // <--- NYTT

    public RouteOptimizationService(RoutingEngine routingEngine,
                                    GeocodingService geocodingService,
                                    RouteRepository routeRepository,
                                    UserRepository userRepository,
                                    OrsMatrixService orsMatrixService) {
        this.routingEngine = routingEngine;
        this.geocodingService = geocodingService;
        this.routeRepository = routeRepository;
        this.userRepository = userRepository;
        this.orsMatrixService = orsMatrixService;
    }

    public RouteOptimizationResponse optimize(RouteOptimizationRequest request) {
        // 1. Hämta grunddata (Geokoda allt först!)
        // Vi skapar en lista med ALLA punkter: [Start, ...Stopp..., Slut]

        // A. Geokoda Start
        GeocodingService.LatLng startPos = geocodingService
                .geocodeFirst(request.startAddress())
                .orElseThrow(() -> new RuntimeException("Could not geocode start address"));

        // B. Geokoda alla stopp
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

        // C. Geokoda Slut
        GeocodingService.LatLng endPos = geocodingService
                .geocodeFirst(request.endAddress())
                .orElseThrow(() -> new RuntimeException("Could not geocode end address"));


        // 2. Förbered lista för Matrix-anrop
        // Ordningen i listan till ORS blir: Index 0=Start, 1..N=Stopp, N+1=Slut
        List<List<Double>> matrixRequestCoords = new ArrayList<>();

        // Lägg till start [lon, lat] OBS: ORS vill ha Longitud först!
        matrixRequestCoords.add(List.of(startPos.lng(), startPos.lat()));

        // Lägg till alla stopp
        for (StopResponse s : stopsWithCoords) {
            if (s.longitude() != null && s.latitude() != null) {
                matrixRequestCoords.add(List.of(s.longitude(), s.latitude()));
            } else {
                // Om vi misslyckades geokoda ett stopp, hoppa över det i optimeringen (eller kasta fel)
                // För enkelhetens skull kastar vi fel nu så vi märker det.
                throw new RuntimeException("Failed to geocode stop: " + s.address());
            }
        }

        // Lägg till slut
        matrixRequestCoords.add(List.of(endPos.lng(), endPos.lat()));


        // 3. Hämta Tids-Matris från ORS! 🚀
        // durations[i][j] = sekunder att köra från punkt i till j
        double[][] durations = orsMatrixService.getDurations(matrixRequestCoords);


        // 4. Optimera ordningen med "Nearest Neighbour" baserat på TID
        List<StopResponse> orderedStops = solveTspNearestNeighbour(stopsWithCoords, durations);


        // 5. Sätt ordningsindex
        List<StopResponse> finalResult = IntStream.range(0, orderedStops.size())
                .mapToObj(i -> {
                    var s = orderedStops.get(i);
                    return new StopResponse(s.id(), s.label(), s.address(), s.latitude(), s.longitude(), i);
                })
                .toList();

        return new RouteOptimizationResponse(finalResult, finalResult.size());
    }

    /**
     * Enkel TSP-lösare: Börja på Start, hitta stoppet med kortast körtid, åk dit, upprepa.
     */
    private List<StopResponse> solveTspNearestNeighbour(List<StopResponse> stops, double[][] durations) {
        List<StopResponse> remaining = new ArrayList<>(stops);
        List<StopResponse> ordered = new ArrayList<>();

        // Index 0 i durations-matrisen är START-punkten.
        // Index 1..N är stoppen i 'stops'-listan.
        // Sista index är SLUT-punkten.

        int currentIndex = 0; // Vi börjar på START (index 0 i matrisen)

        // Så länge vi har stopp kvar att besöka...
        while (!remaining.isEmpty()) {
            int bestStopIndexInRemaining = -1;
            double minDuration = Double.MAX_VALUE;

            // Kolla avstånd till alla kvarvarande stopp
            for (int i = 0; i < remaining.size(); i++) {
                StopResponse candidate = remaining.get(i);

                // Hitta vilket index denna kandidat hade i den ursprungliga matrisen.
                // Eftersom 'remaining' krymper måste vi veta original-indexet.
                // Matrix-index för stopp X är: (stops.indexOf(candidate) + 1) eftersom Start är 0.
                int matrixIndex = stops.indexOf(candidate) + 1;

                double durationToCandidate = durations[currentIndex][matrixIndex];
                System.out.println("Kollar stopp: " + candidate.address() + " -> Tid: " + durationToCandidate + " sekunder");
                if (durationToCandidate < minDuration) {
                    minDuration = durationToCandidate;
                    bestStopIndexInRemaining = i;
                }
            }

            // Flytta det bästa stoppet till 'ordered'
            StopResponse nextStop = remaining.remove(bestStopIndexInRemaining);
            System.out.println("🏆 Valde nästa stopp: " + nextStop.address() + " (Tid: " + minDuration + "s)");
            ordered.add(nextStop);

            // Uppdatera currentIndex till det stopp vi just valde
            currentIndex = stops.indexOf(nextStop) + 1;
        }

        return ordered;
    }

    // --- SPARA & HÄMTA (Samma som förut) ---

    @Transactional
    public RouteEntity saveRoute(SaveRouteRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserEntity currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        RouteEntity entity = new RouteEntity(
                request.name(),
                request.description(),
                request.startAddress(),
                request.endAddress()
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