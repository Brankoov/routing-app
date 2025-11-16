package se.brankoov.routing.api.route;

public record OrderedStop(
        String id,
        String label,
        String address,
        Double latitude,   // kan vara null tills vi har geokodning
        Double longitude,  // kan vara null tills vi har geokodning
        int order
) {
}
