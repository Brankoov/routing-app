package se.brankoov.routing.infra.ors;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

@Service
public class OrsDirectionsService {

    private final WebClient orsWebClient;

    public OrsDirectionsService(@Qualifier("orsWebClient") WebClient orsWebClient) {
        this.orsWebClient = orsWebClient;
    }

    public String getRouteGeometry(List<List<Double>> coordinates) {
        if (coordinates == null || coordinates.size() < 2) return null;

        DirectionsRequest body = new DirectionsRequest(coordinates);

        try {
            DirectionsResponse res = orsWebClient.post()
                    .uri("/v2/directions/driving-car")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(DirectionsResponse.class)
                    .block();

            if (res != null && res.routes != null && !res.routes.isEmpty()) {
                return res.routes.get(0).geometry; // Den kodade strängen
            }
        } catch (Exception e) {
            System.err.println("Failed to get directions geometry: " + e.getMessage());
        }
        return null;
    }

    // DTOs
    record DirectionsRequest(List<List<Double>> coordinates) {}
    record DirectionsResponse(List<Route> routes) {}
    record Route(String geometry) {}
}