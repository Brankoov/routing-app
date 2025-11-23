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

    private final Map<String, LatLng> cache = new ConcurrentHashMap<>();

    // --- KONFIGURATION FÖR STOCKHOLM ---
    // Fokuspunkt (Center)
    private static final String FOCUS_LAT = "59.3293";
    private static final String FOCUS_LON = "18.0686";

    // Bounding Box (Staket runt Storstockholm)
    // Detta tvingar sökningen att hålla sig inom detta område.
    // Täcker ungefär: Södertälje (Sydväst) till Åkersberga/Värmdö (Nordost)
    private static final String MIN_LON = "17.50";
    private static final String MIN_LAT = "59.00";
    private static final String MAX_LON = "18.60";
    private static final String MAX_LAT = "59.60";
    // -----------------------------------

    public record LatLng(double lat, double lng) {}
    public record LatLngLabel(String label, double lat, double lng) {}

    public GeocodingService(@Qualifier("orsWebClient") WebClient orsWebClient) {
        this.orsWebClient = orsWebClient;
    }

    public Optional<LatLng> geocodeFirst(String query) {
        if (query == null || query.isBlank()) return Optional.empty();

        String key = normalize(query);
        LatLng cached = cache.get(key);
        if (cached != null) return Optional.of(cached);

        Optional<LatLng> result = callOrsGeocode(query);
        result.ifPresent(latLng -> cache.put(key, latLng));
        return result;
    }

    protected Optional<LatLng> callOrsGeocode(String query) {
        OrsGeocodeResponse res = orsWebClient.get()
                .uri(uri -> uri.path("/geocode/search")
                        .queryParam("text", query)
                        // Vi tar bort boundary.country="SE" och kör stenhårt på rect istället
                        .queryParam("boundary.rect.min_lon", MIN_LON)
                        .queryParam("boundary.rect.min_lat", MIN_LAT)
                        .queryParam("boundary.rect.max_lon", MAX_LON)
                        .queryParam("boundary.rect.max_lat", MAX_LAT)
                        // Behåll focus också för att sortera bra inuti rutan
                        .queryParam("focus.point.lat", FOCUS_LAT)
                        .queryParam("focus.point.lon", FOCUS_LON)
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

    public List<LatLngLabel> geocodeMany(String query) {
        if (query == null || query.isBlank()) return List.of();

        OrsGeocodeResponse res = orsWebClient.get()
                .uri(uri -> uri.path("/geocode/search")
                        .queryParam("text", query)
                        .queryParam("size", 10)
                        // HÄR LÄGGER VI TILL STAKETET FÖR FÖRSLAGEN OCKSÅ:
                        .queryParam("boundary.rect.min_lon", MIN_LON)
                        .queryParam("boundary.rect.min_lat", MIN_LAT)
                        .queryParam("boundary.rect.max_lon", MAX_LON)
                        .queryParam("boundary.rect.max_lat", MAX_LAT)
                        .queryParam("focus.point.lat", FOCUS_LAT)
                        .queryParam("focus.point.lon", FOCUS_LON)
                        .build())
                .retrieve()
                .bodyToMono(OrsGeocodeResponse.class)
                .onErrorResume(e -> Mono.empty())
                .block();

        if (res == null || res.features == null) return List.of();

        return Arrays.stream(res.features)
                .filter(f -> f.geometry != null
                        && f.geometry.coordinates != null
                        && f.geometry.coordinates.length >= 2
                        && f.properties != null
                        && f.properties.label != null)
                .limit(10)
                .map(f -> new LatLngLabel(
                        f.properties.label,
                        f.geometry.coordinates[1],
                        f.geometry.coordinates[0]
                ))
                .toList();
    }

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
        public double[] coordinates;
    }

    public static final class OrsProps {
        public String label;
    }
}