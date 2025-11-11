package se.brankoov.routing.domain.route;

import se.brankoov.routing.api.route.RouteOptimizationRequest;
import se.brankoov.routing.api.route.RouteOptimizationResponse;

public interface RoutingEngine {

    /**
     * Optimize route based on the given request.
     * Later this can be backed by a real routing engine (e.g. ORS/OSRM).
     */
    RouteOptimizationResponse optimize(RouteOptimizationRequest request);
}
