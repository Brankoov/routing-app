package se.brankoov.routing.infra.ors.routing;

import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import se.brankoov.routing.api.route.RouteOptimizationRequest;
import se.brankoov.routing.api.route.RouteOptimizationResponse;
import se.brankoov.routing.api.route.StopResponse;
import se.brankoov.routing.domain.route.RoutingEngine;

import java.util.List;
import java.util.stream.IntStream;

@Component
public class OpenRouteServiceRoutingEngine implements RoutingEngine {

    private final WebClient orsWebClient;

    public OpenRouteServiceRoutingEngine(WebClient orsWebClient) {
        this.orsWebClient = orsWebClient;
    }

    @Override
    public RouteOptimizationResponse optimize(RouteOptimizationRequest request) {
        // Detta är bara en dummy som returnerar stoppen i samma ordning som de kom in
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
                            i,
                            s.comment()
                    );
                })
                .toList();

        // HÄR VAR FELET: Vi lägger till 'null' sist för geometry-fältet
        return new RouteOptimizationResponse(stops, stops.size(), null, 0L);
    }
}