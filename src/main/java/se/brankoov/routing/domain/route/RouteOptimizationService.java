package se.brankoov.routing.domain.route;

import org.springframework.stereotype.Service;
import se.brankoov.routing.api.route.RouteOptimizationRequest;
import se.brankoov.routing.api.route.RouteOptimizationResponse;
import se.brankoov.routing.api.route.StopRequest;
import se.brankoov.routing.api.route.StopResponse;

import java.util.Comparator;
import java.util.List;

@Service
public class RouteOptimizationService {

    public RouteOptimizationResponse optimize(RouteOptimizationRequest request) {
        // 🔹 Just nu: låtsas-optimering.
        // Sorterar bara stoppen på id och bygger ett svar.

        List<StopResponse> ordered = request.stops().stream()
                .sorted(Comparator.comparing(StopRequest::id))
                .map(stop -> new StopResponse(
                        stop.id(),
                        stop.label(),
                        stop.address(),
                        stop.latitude(),
                        stop.longitude(),
                        0 // vi sätter rätt order strax
                ))
                .toList();

        // sätt "order" fältet 0,1,2,...
        List<StopResponse> withOrder = addOrderIndex(ordered);

        return new RouteOptimizationResponse(withOrder, withOrder.size());
    }

    private List<StopResponse> addOrderIndex(List<StopResponse> stops) {
        // bygger en ny lista där order = index i listan
        return java.util.stream.IntStream.range(0, stops.size())
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
