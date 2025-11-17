package se.brankoov.routing.domain.route;

import org.junit.jupiter.api.Test;
import se.brankoov.routing.api.route.RouteOptimizationRequest;
import se.brankoov.routing.api.route.RouteOptimizationResponse;
import se.brankoov.routing.api.route.StopRequest;
import se.brankoov.routing.api.route.StopResponse;
import se.brankoov.routing.domain.geocode.GeocodingService;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class RouteOptimizationServiceTest {

    @Test
    void addsMissingCoordinatesUsingGeocodingService() {
        RoutingEngine routingEngine = request -> {
            // routing-engine svarar med ett stop utan coords
            var stop = new StopResponse("1", "Stop 1", "Addr 1", null, null, 0);
            return new RouteOptimizationResponse(List.of(stop), 1);
        };

        GeocodingService geocodingService = mock(GeocodingService.class);
        given(geocodingService.geocodeFirst("Addr 1"))
                .willReturn(Optional.of(new GeocodingService.LatLng(59.0, 18.0)));

        RouteOptimizationService service = new RouteOptimizationService(routingEngine, geocodingService);

        var request = new RouteOptimizationRequest(
                "Start",
                "End",
                List.of(new StopRequest("1", "Stop 1", "Addr 1", null, null))
        );

        RouteOptimizationResponse result = service.optimize(request);

        var stop = result.orderedStops().get(0);
        assertEquals(59.0, stop.latitude());
        assertEquals(18.0, stop.longitude());
        assertEquals(0, stop.order());
    }

    @Test
    void ordersStopsByNearestNeighbour() {
        // routing-engine svarar med tre stops i "dum" ordning
        RoutingEngine routingEngine = request -> {
            var a = new StopResponse("A", "A", "A", 59.0, 18.0, 0);     // typ Stockholm
            var b = new StopResponse("B", "B", "B", 59.1, 18.1, 1);
            var c = new StopResponse("C", "C", "C", 57.7, 11.97, 2);    // typ Göteborg
            // medvetet konstig ordning
            return new RouteOptimizationResponse(List.of(a, c, b), 3);
        };

        GeocodingService geocodingService = mock(GeocodingService.class);
        // inga geokod-anrop här, alla har redan coords

        RouteOptimizationService service = new RouteOptimizationService(routingEngine, geocodingService);

        var request = new RouteOptimizationRequest(
                "Start",
                "End",
                List.of(
                        new StopRequest("A", "A", "A", 59.0, 18.0),
                        new StopRequest("C", "C", "C", 57.7, 11.97),
                        new StopRequest("B", "B", "B", 59.1, 18.1)
                )
        );

        RouteOptimizationResponse result = service.optimize(request);

        // Första punkten blir A (vi startar på första i listan från engine)
        assertEquals("A", result.orderedStops().get(0).id());
        // Nästa närmast A är B (inte Göteborg)
        assertEquals("B", result.orderedStops().get(1).id());
        // Sista blir C
        assertEquals("C", result.orderedStops().get(2).id());

        // kolla order-index
        assertEquals(0, result.orderedStops().get(0).order());
        assertEquals(1, result.orderedStops().get(1).order());
        assertEquals(2, result.orderedStops().get(2).order());
    }

    @Test
    void usesStartAddressCoordinatesAsStartingPointWhenAvailable() {
        // routing-engine svarar med två stops, ordning spelar ingen roll
        RoutingEngine routingEngine = request -> {
            var far = new StopResponse("FAR", "Far", "Far", 10.0, 0.0, 0);
            var near = new StopResponse("NEAR", "Near", "Near", 1.0, 0.0, 1);
            return new RouteOptimizationResponse(List.of(far, near), 2);
        };

        GeocodingService geocodingService = mock(GeocodingService.class);

        // startAddress "Depot" ligger vid (0,0)
        given(geocodingService.geocodeFirst("Depot"))
                .willReturn(Optional.of(new GeocodingService.LatLng(0.0, 0.0)));

        RouteOptimizationService service = new RouteOptimizationService(routingEngine, geocodingService);

        var request = new RouteOptimizationRequest(
                "Depot",
                "End",
                List.of(
                        new StopRequest("FAR", "Far", "Far", 10.0, 0.0),
                        new StopRequest("NEAR", "Near", "Near", 1.0, 0.0)
                )
        );

        RouteOptimizationResponse result = service.optimize(request);

        // när vi startar vid (0,0) ska NEAR vara först
        assertEquals("NEAR", result.orderedStops().get(0).id());
        assertEquals("FAR", result.orderedStops().get(1).id());
    }
    @Test
    void endAddressPullsRouteDirection() {
        // engine returnerar två stops på varsin sida om start
        RoutingEngine routingEngine = request -> {
            var north = new StopResponse("N", "North", "North", 59.5, 18.0, 0);
            var south = new StopResponse("S", "South", "South", 58.5, 18.0, 1);
            return new RouteOptimizationResponse(List.of(north, south), 2);
        };

        GeocodingService geocodingService = mock(GeocodingService.class);

        // Start vid (59.0, 18.0)
        given(geocodingService.geocodeFirst("Start"))
                .willReturn(Optional.of(new GeocodingService.LatLng(59.0, 18.0)));

        // End längre söderut -> algoritmen bör “dras” mot South
        given(geocodingService.geocodeFirst("End"))
                .willReturn(Optional.of(new GeocodingService.LatLng(57.0, 18.0)));

        RouteOptimizationService service = new RouteOptimizationService(routingEngine, geocodingService);

        var request = new RouteOptimizationRequest(
                "Start",
                "End",
                List.of(
                        new StopRequest("N", "North", "North", 59.5, 18.0),
                        new StopRequest("S", "South", "South", 58.5, 18.0)
                )
        );

        RouteOptimizationResponse result = service.optimize(request);

        assertEquals("S", result.orderedStops().get(0).id());
        assertEquals("N", result.orderedStops().get(1).id());
    }



}
