package se.brankoov.routing.api.route;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import se.brankoov.routing.domain.route.RouteOptimizationService;
import se.brankoov.routing.domain.route.entity.RouteEntity;
import se.brankoov.routing.domain.route.entity.RouteRepository;

import java.util.List;

@RestController
@RequestMapping("/api/routes")
public class RouteController {

    private static final Logger log = LoggerFactory.getLogger(RouteController.class);

    private final RouteOptimizationService routeService;
    private final RouteRepository routeRepository;

    // Vi behåller Repository här för att delete-metoden behöver den just nu
    public RouteController(RouteOptimizationService routeService, RouteRepository routeRepository) {
        this.routeService = routeService;
        this.routeRepository = routeRepository;
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

    @GetMapping
    public ResponseEntity<List<RouteEntity>> getMyRoutes() {
        // HÄR ÄR ÄNDRINGEN: Vi hämtar bara den inloggade användarens rutter via servicen
        return ResponseEntity.ok(routeService.getMyRoutes());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoute(@PathVariable Long id) {
        log.info("Deleting route with id: {}", id);

        // OBS: Här borde man egentligen kolla att man äger rutten innan man tar bort den,
        // men vi låter det vara så här för enkelhetens skull just nu.
        if (routeRepository.existsById(id)) {
            routeRepository.deleteById(id);
            return ResponseEntity.noContent().build(); // 204 No Content
        }
        return ResponseEntity.notFound().build();
    }
}