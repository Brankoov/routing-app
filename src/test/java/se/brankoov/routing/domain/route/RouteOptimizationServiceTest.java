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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class RouteOptimizationServiceTest {

    @Test
    void addsMissingCoordinatesUsingGeocodingService() {
        // fake routing-engine som redan har bestämt ordningen
        RoutingEngine routingEngine = mock(RoutingEngine.class);
        GeocodingService geocodingService = mock(GeocodingService.class);

        RouteOptimizationService service = new RouteOptimizationService(routingEngine, geocodingService);

        // request kan vara ganska enkel – service bryr sig mest om svaret från routingEngine
        var request = new RouteOptimizationRequest(
                "Start address",
                "End address",
                List.of(
                        new StopRequest("1", "Stop 1", "Addr 1", null, null)
                )
        );

        // routingEngine svarar med en stop utan koordinater
        var stopWithoutCoords = new StopResponse("1", "Stop 1", "Addr 1", null, null, 0);
        var baseResponse = new RouteOptimizationResponse(List.of(stopWithoutCoords), 1);
        given(routingEngine.optimize(any(RouteOptimizationRequest.class)))
                .willReturn(baseResponse);

        // geokodning ger oss koordinater för "Addr 1"
        given(geocodingService.geocodeFirst("Addr 1"))
                .willReturn(Optional.of(new GeocodingService.LatLng(59.0, 18.0)));

        // act
        RouteOptimizationResponse result = service.optimize(request);

        // assert
        assertEquals(1, result.totalStops());
        var stop = result.orderedStops().get(0);
        assertEquals(59.0, stop.latitude());
        assertEquals(18.0, stop.longitude());
        assertEquals("1", stop.id());
        assertEquals(0, stop.order());
    }
}
