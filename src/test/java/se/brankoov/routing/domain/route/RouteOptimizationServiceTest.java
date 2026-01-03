package se.brankoov.routing.domain.route;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import se.brankoov.routing.api.route.RouteOptimizationRequest;
import se.brankoov.routing.api.route.RouteOptimizationResponse;
import se.brankoov.routing.api.route.StopRequest;
import se.brankoov.routing.domain.auth.UserRepository;
import se.brankoov.routing.domain.geocode.GeocodingService;
import se.brankoov.routing.domain.route.entity.RouteRepository;
import se.brankoov.routing.infra.ors.OrsDirectionsService;
import se.brankoov.routing.infra.ors.OrsMatrixService;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class RouteOptimizationServiceTest {

    @Mock RoutingEngine routingEngine;
    @Mock GeocodingService geocodingService;
    @Mock RouteRepository routeRepository;
    @Mock UserRepository userRepository;
    @Mock OrsMatrixService orsMatrixService;
    @Mock OrsDirectionsService orsDirectionsService;

    private RouteOptimizationService service;

    @BeforeEach
    void setUp() {
        service = new RouteOptimizationService(
                routingEngine,
                geocodingService,
                routeRepository,
                userRepository,
                orsMatrixService,
                orsDirectionsService
        );
    }

    @Test
    void addsMissingCoordinatesUsingGeocodingService() {
        // Arrange
        // 1. Vi måste skapa ett riktigt StopRequest-objekt först
        StopRequest stopReq = new StopRequest("1", "Stop 1", "Addr 1", null, null);

        // 2. Skapa requesten med rätt ordning på argumenten: (Start, End, STOPS, Optimize)
        var request = new RouteOptimizationRequest(
                "Start",
                "End",
                List.of(stopReq), // Här skickar vi listan
                false             // Här skickar vi optimize = false
        );

        // Mocka geokodning
        given(geocodingService.geocodeFirst("Start")).willReturn(Optional.of(new GeocodingService.LatLng(59.0, 18.0)));
        given(geocodingService.geocodeFirst("End")).willReturn(Optional.of(new GeocodingService.LatLng(59.2, 18.2)));
        given(geocodingService.geocodeFirst("Addr 1")).willReturn(Optional.of(new GeocodingService.LatLng(59.1, 18.1)));

        // Mocka Matrix (returnera tom matris då vi inte optimerar här, men koden anropar den för tidsberäkning)
        // Matrisen måste vara 3x3 eftersom vi har Start + 1 stopp + Slut
        given(orsMatrixService.getDurations(anyList())).willReturn(new double[3][3]);

        // Mocka Geometry
        given(orsDirectionsService.getRouteGeometry(anyList())).willReturn("mock_geometry_string");

        // Act
        RouteOptimizationResponse result = service.optimize(request);

        // Assert
        var stop = result.orderedStops().get(0);
        assertEquals(59.1, stop.latitude());
        assertEquals("Addr 1", stop.address());
    }

    @Test
    void optimizationReordersStopsBasedOnDistance() {
        // Arrange
        // Vi skapar två stopp: "Långt bort" och "Nära"
        StopRequest farStop = new StopRequest("1", "Far", "Far", 10.0, 10.0);
        StopRequest nearStop = new StopRequest("2", "Near", "Near", 1.0, 1.0);

        // Vi skickar in dem i "fel" ordning (Långt bort först)
        var request = new RouteOptimizationRequest(
                "Start",
                "End",
                List.of(farStop, nearStop),
                true // <--- VIKTIGT: Nu testar vi optimering!
        );

        // Mocka geokodning (Start ligger på 0,0)
        given(geocodingService.geocodeFirst("Start")).willReturn(Optional.of(new GeocodingService.LatLng(0.0, 0.0)));
        given(geocodingService.geocodeFirst("End")).willReturn(Optional.of(new GeocodingService.LatLng(20.0, 20.0)));
        // Stoppen har redan coords i requesten, så geocodeFirst anropas inte för dem

        // Mocka Matrisen (4 punkter: Start, Far, Near, End)
        // Index: 0=Start, 1=Far, 2=Near, 3=End
        double[][] durations = new double[4][4];

        // Start -> Far = 100 minuter
        durations[0][1] = 100.0;
        // Start -> Near = 10 minuter
        durations[0][2] = 10.0;

        // Near -> Far = 50 minuter
        durations[2][1] = 50.0;
        // Far -> Near = 50 minuter
        durations[1][2] = 50.0;

        // Resten kan vara 0 eller stora tal, det viktiga är att Start -> Near är snabbast.
        given(orsMatrixService.getDurations(anyList())).willReturn(durations);

        given(orsDirectionsService.getRouteGeometry(anyList())).willReturn("mock_geometry");

        // Act
        RouteOptimizationResponse result = service.optimize(request);

        // Assert
        // Vi förväntar oss att "Near" (id 2) hamnar först nu, trots att vi skickade in "Far" först.
        assertEquals("2", result.orderedStops().get(0).id()); // Första stoppet ska vara Near
        assertEquals("1", result.orderedStops().get(1).id()); // Andra stoppet ska vara Far
    }
}