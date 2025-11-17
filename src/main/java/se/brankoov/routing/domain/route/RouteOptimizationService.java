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

    private static final double END_WEIGHT = 0.0;

    public RouteOptimizationService(RoutingEngine routingEngine,
                                    GeocodingService geocodingService) {
        this.routingEngine = routingEngine;
        this.geocodingService = geocodingService;
    }

    public RouteOptimizationResponse optimize(RouteOptimizationRequest request) {

        // 1) låt motorn skapa grundstopp
        RouteOptimizationResponse base = routingEngine.optimize(request);

        // 2) geokoda stops som saknar coords
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

        // 3) geokoda start och slut
        GeocodingService.LatLng startPos = geocodingService
                .geocodeFirst(request.startAddress())
                .orElse(null);

        GeocodingService.LatLng endPos = geocodingService
                .geocodeFirst(request.endAddress())
                .orElse(null);

        // 4) sortera med NN + end-weighting
        List<StopResponse> ordered = reorderNearestNeighbour(enriched, startPos, endPos);

        // 5) sätt ordningsindex
        List<StopResponse> withOrder = addOrderIndex(ordered);

        return new RouteOptimizationResponse(withOrder, withOrder.size());
    }

    private List<StopResponse> reorderNearestNeighbour(
            List<StopResponse> stops,
            GeocodingService.LatLng startPos,
            GeocodingService.LatLng endPos
    ) {
        if (stops.size() <= 1) return stops;

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
            currentLat = startPos.lat();
            currentLng = startPos.lng();
        } else {
            StopResponse first = remaining.remove(0);
            ordered.add(first);
            currentLat = first.latitude();
            currentLng = first.longitude();
        }

        while (!remaining.isEmpty()) {
            StopResponse best = null;
            double bestScore = Double.MAX_VALUE;

            for (StopResponse c : remaining) {
                double dist = DistanceCalculator.distanceInKm(
                        currentLat, currentLng,
                        c.latitude(), c.longitude()
                );

                double endPenalty = 0.0;
                if (endPos != null) {
                    double distToEnd = DistanceCalculator.distanceInKm(
                            c.latitude(), c.longitude(),
                            endPos.lat(), endPos.lng()
                    );
                    endPenalty = distToEnd * END_WEIGHT;
                }

                double score = dist + endPenalty;

                if (score < bestScore) {
                    bestScore = score;
                    best = c;
                }
            }

            remaining.remove(best);
            ordered.add(best);
            currentLat = best.latitude();
            currentLng = best.longitude();
        }

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
