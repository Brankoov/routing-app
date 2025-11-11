package se.brankoov.routing.api.route;

import java.util.List;

public record RouteOptimizationResponse(
        List<StopResponse> orderedStops,
        int totalStops
) {}
