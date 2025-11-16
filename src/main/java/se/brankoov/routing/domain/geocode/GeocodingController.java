package se.brankoov.routing.api.geocode;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import se.brankoov.routing.domain.geocode.GeocodingService;

import java.util.Map;

@RestController
@RequestMapping("/api/geocode")
public class GeocodingController {

    private final GeocodingService geocoding;

    public GeocodingController(GeocodingService geocoding) {
        this.geocoding = geocoding;
    }

    @GetMapping
    public ResponseEntity<?> search(@RequestParam("q") String query) {
        return geocoding.geocodeFirst(query)
                .<ResponseEntity<?>>map(latlng ->
                        ResponseEntity.ok(Map.of(
                                "query", query,
                                "latitude", latlng.lat(),
                                "longitude", latlng.lng()
                        )))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
