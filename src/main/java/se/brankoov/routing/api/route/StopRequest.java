package se.brankoov.routing.api.route;

public record StopRequest(
        String id,
        String label,
        String address,
        Double latitude,
        Double longitude
) {}
