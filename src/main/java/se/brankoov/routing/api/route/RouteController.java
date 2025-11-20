package se.brankoov.routing.api.route;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import se.brankoov.routing.domain.route.RouteOptimizationService;
import se.brankoov.routing.domain.route.entity.RouteEntity;

@RestController
@RequestMapping("/api/routes")
public class RouteController {

    private static final Logger log = LoggerFactory.getLogger(RouteController.class);

    private final RouteOptimizationService routeService;

    public RouteController(RouteOptimizationService routeService) {
        this.routeService = routeService;
    }

    @PostMapping("/optimize")
    public ResponseEntity<RouteOptimizationResponse> optimize(
            @Valid @RequestBody RouteOptimizationRequest request
    ) {
        log.info("Received optimize request with {} stops", request.stops().size());

        RouteOptimizationResponse response = routeService.optimize(request);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(response);
    }
    @PostMapping("/save")
    public ResponseEntity<RouteEntity> save(@Valid @RequestBody SaveRouteRequest request) {
        log.info("Saving route: {}", request.name());

        RouteEntity saved = routeService.saveRoute(request);

        return ResponseEntity.ok(saved);
    }
}
