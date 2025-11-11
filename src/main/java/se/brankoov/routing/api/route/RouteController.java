package se.brankoov.routing.api.route;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/routes")
public class RouteController {

    @PostMapping("/optimize")
    public RouteOptimizationResponse optimizeRoute(
            @RequestBody RouteOptimizationRequest request
    ) {
        // Just nu: behåll ordningen som frontend skickar in,
        // men sätt ett "order"-index på varje stopp.
        List<StopResponse> ordered = new ArrayList<>();

        int index = 0;
        for (StopRequest stop : request.stops()) {
            ordered.add(new StopResponse(
                    stop.id(),
                    stop.label(),
                    stop.address(),
                    stop.latitude(),
                    stop.longitude(),
                    index++
            ));
        }

        return new RouteOptimizationResponse(
                ordered,
                ordered.size()
        );
    }
}
