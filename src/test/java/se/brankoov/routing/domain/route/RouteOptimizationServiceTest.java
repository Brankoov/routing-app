package se.brankoov.routing.domain.route;

import org.junit.jupiter.api.Test;
import se.brankoov.routing.api.route.RouteOptimizationRequest;
import se.brankoov.routing.api.route.RouteOptimizationResponse;
import se.brankoov.routing.api.route.StopRequest;
import se.brankoov.routing.domain.geocode.GeocodingService;

import static org.mockito.Mockito.mock;


import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RouteOptimizationServiceTest {

    private final RoutingEngine routingEngine = new MockRoutingEngine();
    private final GeocodingService geocodingService = mock(GeocodingService.class);
    private final RouteOptimizationService service =
            new RouteOptimizationService(routingEngine, geocodingService);


    @Test
    void optimize_shouldReturnStopsWithOrderSet() {
        // arrange
        StopRequest stop1 = new StopRequest("2", "Kund B", "Adress B", null, null);
        StopRequest stop2 = new StopRequest("1", "Kund A", "Adress A", null, null);

        RouteOptimizationRequest request = new RouteOptimizationRequest(
                "Startgatan 1",
                "Slutgatan 2",
                List.of(stop1, stop2)
        );

        // act
        RouteOptimizationResponse response = service.optimize(request);

        // assert
        assertThat(response.totalStops()).isEqualTo(2);
        assertThat(response.orderedStops()).hasSize(2);

        // just nu sorterar vi på id, så "1" bör komma före "2"
        assertThat(response.orderedStops().get(0).id()).isEqualTo("1");
        assertThat(response.orderedStops().get(0).order()).isEqualTo(0);

        assertThat(response.orderedStops().get(1).id()).isEqualTo("2");
        assertThat(response.orderedStops().get(1).order()).isEqualTo(1);
    }
}
