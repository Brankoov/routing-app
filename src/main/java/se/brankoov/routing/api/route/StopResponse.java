package se.brankoov.routing.api.route;

public record StopResponse(
        String id,
        String label,
        String address,
        Double latitude,
        Double longitude,
        int order
) {}
