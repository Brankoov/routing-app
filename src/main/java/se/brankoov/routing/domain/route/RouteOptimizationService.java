package se.brankoov.routing.domain.route;

import org.springframework.stereotype.Service;
import se.brankoov.routing.api.route.RouteOptimizationRequest;
import se.brankoov.routing.api.route.RouteOptimizationResponse;
import se.brankoov.routing.api.route.StopResponse;
import se.brankoov.routing.domain.geocode.GeocodingService;

import java.util.List;

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
        // 1) Låt motorn bestämma ordning (mock just nu)
        RouteOptimizationResponse base = routingEngine.optimize(request);

        // 2) Geokoda adresser som saknar lat/lng
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
                            lat,   // kan vara null om geokod misslyckas
                            lng,   // kan vara null om geokod misslyckas
                            s.order()
                    );
                })
                .toList();

        return new RouteOptimizationResponse(enriched, enriched.size());
    }
}
