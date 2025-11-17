package se.brankoov.routing.domain.route;

import org.springframework.stereotype.Service;
import se.brankoov.routing.api.route.RouteOptimizationRequest;
import se.brankoov.routing.api.route.RouteOptimizationResponse;
import se.brankoov.routing.api.route.StopRequest;
import se.brankoov.routing.api.route.StopResponse;
import se.brankoov.routing.domain.geocode.GeocodingService;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

@Service
public class RouteOptimizationService {

    private final RoutingEngine routingEngine;
    private final GeocodingService geocodingService;

    public RouteOptimizationService(RoutingEngine routingEngine,
                                    GeocodingService geocodingService) {
        this.routingEngine = routingEngine;
        this.geocodingService = geocodingService;
    }

    public RouteOptimizationResponse optimize(RouteOptimizationRequest request) {
        // 1) låt motorn göra sin grundgrej (just nu: paketera stops)
        RouteOptimizationResponse base = routingEngine.optimize(request);

        // 2) geokoda stops som saknar lat/lng
        List<StopResponse> enriched = base.orderedStops().stream()
                .map(s -> {
                    Double lat = s.latitude();
                    Double lng = s.longitude();

                    if (lat == null || lng == null) {
                        var maybe = geocodingService.geocodeFirst(s.address());
                        if (maybe.isPresent()) {
                            lat = maybe.get().lat();
                            lng = maybe.get().lng();
                        }
                    }

                    return new StopResponse(
                            s.id(),
                            s.label(),
                            s.address(),
                            lat,
                            lng,
                            s.order()
                    );
                })
                .toList();

        // 3) geokoda startAddress (om möjligt)
        GeocodingService.LatLng startPos = geocodingService
                .geocodeFirst(request.startAddress())
                .orElse(null);

        // 4) sortera stops med nearest neighbour, med startAddress som start om vi har coords
        List<StopResponse> ordered = reorderNearestNeighbour(enriched, startPos);

        // 5) sätt nya order-index
        List<StopResponse> withOrder = addOrderIndex(ordered);

        return new RouteOptimizationResponse(withOrder, withOrder.size());
    }

    /**
     * Enkel nearest neighbour:
     * - om startPos != null: börja från startAddress
     * - annars: börja från första stoppet
     * - stops utan koordinater läggs sist i oförändrad ordning
     */
    private List<StopResponse> reorderNearestNeighbour(List<StopResponse> stops,
                                                       GeocodingService.LatLng startPos) {
        if (stops.size() <= 1) {
            return stops;
        }

        List<StopResponse> withCoords = new ArrayList<>();
        List<StopResponse> withoutCoords = new ArrayList<>();

        for (StopResponse s : stops) {
            if (s.latitude() == null || s.longitude() == null) {
                withoutCoords.add(s);
            } else {
                withCoords.add(s);
            }
        }

        if (withCoords.size() <= 1) {
            List<StopResponse> combined = new ArrayList<>(withCoords);
            combined.addAll(withoutCoords);
            return combined;
        }

        List<StopResponse> remaining = new ArrayList<>(withCoords);
        List<StopResponse> ordered = new ArrayList<>();

        Double currentLat;
        Double currentLng;

        if (startPos != null) {
            // börja vid startAddress (depot etc)
            currentLat = startPos.lat();
            currentLng = startPos.lng();
        } else {
            // fallback: börja vid första stoppet
            StopResponse first = remaining.remove(0);
            ordered.add(first);
            currentLat = first.latitude();
            currentLng = first.longitude();
        }

        while (!remaining.isEmpty()) {
            StopResponse next = null;
            double best = Double.MAX_VALUE;

            for (StopResponse candidate : remaining) {
                double d = DistanceCalculator.distanceInKm(
                        currentLat, currentLng,
                        candidate.latitude(), candidate.longitude()
                );
                if (d < best) {
                    best = d;
                    next = candidate;
                }
            }

            remaining.remove(next);
            ordered.add(next);
            currentLat = next.latitude();
            currentLng = next.longitude();
        }

        // lägg stops utan coords sist
        ordered.addAll(withoutCoords);
        return ordered;
    }

    private List<StopResponse> addOrderIndex(List<StopResponse> stops) {
        return IntStream.range(0, stops.size())
                .mapToObj(i -> {
                    var s = stops.get(i);
                    return new StopResponse(
                            s.id(),
                            s.label(),
                            s.address(),
                            s.latitude(),
                            s.longitude(),
                            i
                    );
                })
                .toList();
    }
}
