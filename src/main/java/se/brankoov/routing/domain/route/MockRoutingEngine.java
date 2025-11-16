package se.brankoov.routing.domain.route;

import org.springframework.stereotype.Component;
import se.brankoov.routing.api.route.RouteOptimizationRequest;
import se.brankoov.routing.api.route.RouteOptimizationResponse;
import se.brankoov.routing.api.route.StopRequest;
import se.brankoov.routing.api.route.StopResponse;
import se.brankoov.routing.domain.geocode.GeocodingService;

import java.util.Comparator;
import java.util.List;
import java.util.stream.IntStream;

@Component
public class MockRoutingEngine implements RoutingEngine {



    @Override
    public RouteOptimizationResponse optimize(RouteOptimizationRequest request) {
        List<StopResponse> ordered = request.stops().stream()
                .sorted(Comparator.comparing(StopRequest::id))
                .map(stop -> new StopResponse(
                        stop.id(),
                        stop.label(),
                        stop.address(),
                        stop.latitude(),
                        stop.longitude(),
                        0 // vi sätter rätt order sen
                ))
                .toList();

        List<StopResponse> withOrder = addOrderIndex(ordered);
        return new RouteOptimizationResponse(withOrder, withOrder.size());
    }

    private List<StopResponse> addOrderIndex(List<StopResponse> stops) {
        return IntStream.range(0, stops.size())
                .mapToObj(i -> {
                    StopResponse s = stops.get(i);
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
