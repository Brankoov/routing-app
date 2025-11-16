package se.brankoov.routing.infra.ors.routing;
import org.springframework.web.reactive.function.client.WebClient;

import org.springframework.stereotype.Component;
import se.brankoov.routing.api.route.RouteOptimizationRequest;
import se.brankoov.routing.api.route.RouteOptimizationResponse;
import se.brankoov.routing.api.route.StopResponse;
import se.brankoov.routing.domain.route.RoutingEngine;

import java.util.List;
import java.util.stream.IntStream;


/**
 * Very early skeleton for real ORS routing.
 * This does NOT use ORS yet.
 * It just returns the stops in the same order as the request.
 */
@Component
public class OpenRouteServiceRoutingEngine implements RoutingEngine {

    private final WebClient orsWebClient;

    public OpenRouteServiceRoutingEngine(WebClient orsWebClient) {
        this.orsWebClient = orsWebClient;
    }

    @Override
    public RouteOptimizationResponse optimize(RouteOptimizationRequest request) {
        // just nu: fortfarande bara enkel ordning, ingen riktig ORS-anrop än


        List<StopResponse> stops = IntStream
                .range(0, request.stops().size())
                .mapToObj(i -> {
                    var s = request.stops().get(i);
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

        return new RouteOptimizationResponse(stops, stops.size());
    }
}

