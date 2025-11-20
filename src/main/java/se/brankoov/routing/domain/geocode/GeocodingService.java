package se.brankoov.routing.domain.geocode;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GeocodingService {

    private final WebClient orsWebClient;

    // simple in-memory cache: normalized address -> LatLng
    private final Map<String, LatLng> cache = new ConcurrentHashMap<>();

    public record LatLng(double lat, double lng) {}

    public GeocodingService(@Qualifier("orsWebClient") WebClient orsWebClient) {
        this.orsWebClient = orsWebClient;
    }

    public Optional<LatLng> geocodeFirst(String query) {
        if (query == null || query.isBlank()) {
            return Optional.empty();
        }

        String key = normalize(query);

        // 1) check cache
        LatLng cached = cache.get(key);
        if (cached != null) {
            return Optional.of(cached);
        }

        // 2) otherwise: call ORS
        Optional<LatLng> result = callOrsGeocode(query);

        // 3) cache result if present
        result.ifPresent(latLng -> cache.put(key, latLng));

        return result;
    }

    // separated for easier testing (can be overridden in a test subclass)
    protected Optional<LatLng> callOrsGeocode(String query) {
        OrsGeocodeResponse res = orsWebClient.get()
                .uri(uri -> uri.path("/geocode/search")
                        .queryParam("text", query)
                        .queryParam("boundary.country", "SE")
                        .build())
                .retrieve()
                .bodyToMono(OrsGeocodeResponse.class)
                .onErrorResume(e -> Mono.empty())
                .block();

        if (res == null || res.features == null || res.features.length == 0) {
            return Optional.empty();
        }

        OrsFeature f = res.features[0];
        if (f.geometry == null || f.geometry.coordinates == null || f.geometry.coordinates.length < 2) {
            return Optional.empty();
        }

        double lon = f.geometry.coordinates[0];
        double lat = f.geometry.coordinates[1];
        return Optional.of(new LatLng(lat, lon));
    }

    // i GeocodingService

    // I se.brankoov.routing.domain.geocode.GeocodingService

    public List<LatLngLabel> geocodeMany(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        // ÄNDRING: Vi använder /geocode/search istället för /geocode/autocomplete
        // Search är bättre på att hantera hela adresser med gatunummer.
        OrsGeocodeResponse res = orsWebClient.get()
                .uri(uri -> uri.path("/geocode/search")
                        .queryParam("text", query)
                        .queryParam("boundary.country", "SE")
                        // Vi kan be om max 10 träffar så vi har lite att välja på
                        .queryParam("size", 10)
                        .build())
                .retrieve()
                .bodyToMono(OrsGeocodeResponse.class)
                .onErrorResume(e -> Mono.empty())
                .block();

        if (res == null || res.features == null) {
            return List.of();
        }

        // Samma logik som förut: mappa till vår snygga lista
        return Arrays.stream(res.features)
                .filter(f -> f.geometry != null
                        && f.geometry.coordinates != null
                        && f.geometry.coordinates.length >= 2
                        && f.properties != null
                        && f.properties.label != null)
                .limit(10) // Visa fler förslag om det finns
                .map(f -> new LatLngLabel(
                        f.properties.label,
                        f.geometry.coordinates[1],
                        f.geometry.coordinates[0]
                ))
                .toList();
    }


    public record LatLngLabel(String label, double lat, double lng) {}


    private String normalize(String query) {
        return query.trim().toLowerCase(Locale.ROOT);
    }

    // ===== DTOs (internal) =====
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
}
