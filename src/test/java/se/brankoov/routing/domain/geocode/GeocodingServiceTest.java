package se.brankoov.routing.domain.geocode;

import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GeocodingServiceTest {

    static class TestGeocodingService extends GeocodingService {

        int orsCalls = 0;
        private final LatLng fixedResult;

        public TestGeocodingService(LatLng fixedResult) {
            super(WebClient.builder().build()); // används inte i testet
            this.fixedResult = fixedResult;
        }

        @Override
        protected Optional<LatLng> callOrsGeocode(String query) {
            orsCalls++;
            return Optional.of(fixedResult);
        }
    }

    @Test
    void secondCallUsesCacheInsteadOfCallingOrs() {
        var result = new GeocodingService.LatLng(59.0, 18.0);
        var service = new TestGeocodingService(result);

        // first call -> ska träffa "ORS"
        var r1 = service.geocodeFirst("Some Address");
        // second call med samma adress -> ska använda cache
        var r2 = service.geocodeFirst("some address"); // annan casing, ska normaliseras

        assertEquals(59.0, r1.orElseThrow().lat());
        assertEquals(59.0, r2.orElseThrow().lat());
        assertEquals(1, service.orsCalls); // ORS-anrop ska bara ha skett en gång
    }
}
