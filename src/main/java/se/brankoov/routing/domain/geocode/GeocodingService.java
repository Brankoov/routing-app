package se.brankoov.routing.domain.geocode;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.*;

@Service
public class GeocodingService {

    private static final Logger log = LoggerFactory.getLogger(GeocodingService.class);

    private final WebClient orsWebClient;
    private final GeocodeCacheRepository cacheRepository; // <--- NYTT
    private final ObjectMapper objectMapper;              // <--- NYTT (För JSON)

    // --- KONFIGURATION FÖR STOCKHOLM ---
    private static final String FOCUS_LAT = "59.3293";
    private static final String FOCUS_LON = "18.0686";
    private static final String MIN_LON = "17.50";
    private static final String MIN_LAT = "59.00";
    private static final String MAX_LON = "18.60";
    private static final String MAX_LAT = "59.60";
    // -----------------------------------

    public record LatLng(double lat, double lng) {}
    public record LatLngLabel(String label, double lat, double lng) {}

    // Uppdaterad konstruktor
    public GeocodingService(@Qualifier("orsWebClient") WebClient orsWebClient,
                            GeocodeCacheRepository cacheRepository,
                            ObjectMapper objectMapper) {
        this.orsWebClient = orsWebClient;
        this.cacheRepository = cacheRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Används av backend när vi optimerar rutt (behöver 1 koordinat).
     */
    public Optional<LatLng> geocodeFirst(String query) {
        List<LatLngLabel> results = geocodeMany(query); // Återanvänd cachen via geocodeMany
        if (results.isEmpty()) {
            return Optional.empty();
        }
        // Ta första bästa
        LatLngLabel first = results.get(0);
        return Optional.of(new LatLng(first.lat(), first.lng()));
    }

    /**
     * Används av frontend för autocomplete (ger lista).
     * NU MED DB-CACHE!
     */
    public List<LatLngLabel> geocodeMany(String query) {
        if (query == null || query.isBlank()) return List.of();

        String normalizedKey = normalize(query);

        // 1. KOLLA DATABASEN
        Optional<GeocodeCacheEntity> cached = cacheRepository.findById(normalizedKey);
        if (cached.isPresent()) {
            try {
                // Omvandla JSON-strängen tillbaka till en Java-lista
                return objectMapper.readValue(cached.get().getJsonResponse(), new TypeReference<List<LatLngLabel>>() {});
            } catch (Exception e) {
                log.error("Failed to parse cached JSON for key: {}", normalizedKey, e);
                // Om datan är trasig, fortsätt och hämta nytt från API
            }
        }

        // 2. ANROPA API (Om vi inte hittade i DB)
        List<LatLngLabel> freshResults = callOrsApi(query);

        // 3. SPARA TILL DATABASEN
        try {
            // Gör om listan till en JSON-sträng
            String json = objectMapper.writeValueAsString(freshResults);

            // Spara (överskriver om den mot förmodan fanns men var trasig)
            cacheRepository.save(new GeocodeCacheEntity(normalizedKey, json));

        } catch (Exception e) {
            log.error("Failed to cache geocoding result", e);
        }

        return freshResults;
    }

    // Flyttade ut själva API-anropet hit för renare kod
    private List<LatLngLabel> callOrsApi(String query) {
        OrsGeocodeResponse res = orsWebClient.get()
                .uri(uri -> uri.path("/geocode/search")
                        .queryParam("text", query)
                        .queryParam("size", 10)
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

    // ===== DTOs =====
    public static final class OrsGeocodeResponse {
        public OrsFeature[] features;
    }
    public static final class OrsFeature {
        public OrsGeometry geometry;
        public OrsProps properties;
    }
    public static final class OrsGeometry {
        public double[] coordinates;
    }
    public static final class OrsProps {
        public String label;
    }
}