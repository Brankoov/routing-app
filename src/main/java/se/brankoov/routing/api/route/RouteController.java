package se.brankoov.routing.api.route;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import se.brankoov.routing.domain.route.RouteOptimizationService;

@RestController
@RequestMapping("/api/routes")
public class RouteController {

    private static final Logger log = LoggerFactory.getLogger(RouteController.class);

    private final RouteOptimizationService routeService;

    public RouteController(RouteOptimizationService routeService) {
        this.routeService = routeService;
    }

    @PostMapping("/optimize")
    public ResponseEntity<RouteOptimizationResponse> optimize(@RequestBody RouteOptimizationRequest request) {
        log.info("Received optimize request with {} stops", request.stops().size());

        RouteOptimizationResponse response = routeService.optimize(request);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(response);
    }
}
