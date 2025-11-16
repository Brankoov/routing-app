package se.brankoov.routing.api.geocode;

public record GeocodeResponse(
        String query,
        Double latitude,
        Double longitude
) {}
