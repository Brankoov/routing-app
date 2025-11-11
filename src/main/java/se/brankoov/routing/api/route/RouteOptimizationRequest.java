package se.brankoov.routing.api.route;

import java.util.List;

public record RouteOptimizationRequest(
        String startAddress,
        String endAddress,
        List<StopRequest> stops
) {}
