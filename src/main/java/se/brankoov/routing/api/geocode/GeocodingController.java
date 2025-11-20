package se.brankoov.routing.api.geocode;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import se.brankoov.routing.domain.geocode.GeocodingService;

import java.util.Map;

@RestController
@RequestMapping("/api/geocode")
public class GeocodingController {

    private static final Logger log = LoggerFactory.getLogger(GeocodingController.class);

    private final GeocodingService geocodingService;

    public GeocodingController(GeocodingService geocodingService) {
        this.geocodingService = geocodingService;
    }

    @GetMapping
    public ResponseEntity<GeocodeResponse> geocode(@RequestParam("q") String query) {
        log.info("Geocoding query='{}'", query);

        var maybe = geocodingService.geocodeFirst(query);

        if (maybe.isEmpty()) {
            log.info("No geocode result for '{}'", query);
            return ResponseEntity.notFound().build();
        }

        var latLng = maybe.get();
        var body = new GeocodeResponse(query, latLng.lat(), latLng.lng());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/suggest")
    public ResponseEntity<?> suggest(@RequestParam("q") String query) {
        log.info("Geocode suggest query='{}'", query);

        var results = geocodingService.geocodeMany(query);

        return ResponseEntity.ok(
                results.stream()
                        .map(r -> Map.of(
                                "label", r.label(),
                                "lat", r.lat(),
                                "lng", r.lng()
                        ))
                        .toList()
        );
    }
}
