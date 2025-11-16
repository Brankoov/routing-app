package se.brankoov.routing.domain.geocode;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Optional;

@Service
public class GeocodingService {

    private final WebClient orsWebClient;

    public GeocodingService(@Qualifier("orsWebClient") WebClient orsWebClient) {
        this.orsWebClient = orsWebClient;
    }

    public Optional<LatLng> geocodeFirst(String query) {
        OrsGeocodeResponse res = orsWebClient.get()
                .uri(uri -> uri.path("/geocode/search")
                        .queryParam("text", query)
                        .build())
                .retrieve()
                .bodyToMono(OrsGeocodeResponse.class)
                .onErrorResume(e -> Mono.empty())
                .block();

        if (res == null || res.features == null || res.features.length == 0) return Optional.empty();
        OrsFeature f = res.features[0];
        if (f.geometry == null || f.geometry.coordinates == null || f.geometry.coordinates.length < 2) return Optional.empty();

        double lon = f.geometry.coordinates[0];
        double lat = f.geometry.coordinates[1];
        return Optional.of(new LatLng(lat, lon));
    }

    // ===== DTOs (behåll som interna, funkar fint) =====
    public static final class OrsGeocodeResponse {
        public OrsFeature[] features;
    }
    public static final class OrsFeature {
        public OrsGeometry geometry;
        public OrsProps properties;
    }
    public static final class OrsGeometry {
        public String type;
        public double[] coordinates; // [lon, lat]
    }
    public static final class OrsProps {
        public String label;
    }

    public record LatLng(double lat, double lng) {}
}
