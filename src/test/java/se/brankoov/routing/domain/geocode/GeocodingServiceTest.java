package se.brankoov.routing.domain.geocode;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GeocodingServiceTest {

    @Mock
    WebClient orsWebClient; // Mocka webclienten (vi kommer inte anropa den i cache-testet)

    @Mock
    GeocodeCacheRepository cacheRepository;

    @Mock
    ObjectMapper objectMapper; // Mocka JSON-hanteraren

    private GeocodingService geocodingService;

    @BeforeEach
    void setUp() {
        geocodingService = new GeocodingService(orsWebClient, cacheRepository, objectMapper);
    }

    @Test
    void returnsFromCacheIfExists() throws Exception {
        // Arrange
        String address = "Testgatan 1";
        String normalizedKey = "testgatan 1";

        // Förbered en fejkad cache-post
        GeocodeCacheEntity cachedEntity = new GeocodeCacheEntity();
        cachedEntity.setQuery(normalizedKey);
        cachedEntity.setJsonResponse("[{\"label\":\"Testgatan 1\",\"lat\":55.0,\"lng\":13.0}]");

        // Förbered vad cachen ska svara
        given(cacheRepository.findById(normalizedKey))
                .willReturn(Optional.of(cachedEntity));

        // Förbered vad ObjectMapper ska göra (omvandla strängen till en lista)
        List<GeocodingService.LatLngLabel> expectedList = List.of(
                new GeocodingService.LatLngLabel("Testgatan 1", 55.0, 13.0)
        );
        given(objectMapper.readValue(eq(cachedEntity.getJsonResponse()), any(TypeReference.class)))
                .willReturn(expectedList);

        // Act
        Optional<GeocodingService.LatLng> result = geocodingService.geocodeFirst(address);

        // Assert
        assertTrue(result.isPresent());
        assertEquals(55.0, result.get().lat());
        assertEquals(13.0, result.get().lng());

        // Verifiera att vi kollade cachen men INTE anropade API:t (eftersom cachen fanns)
        verify(cacheRepository, times(1)).findById(normalizedKey);
        // Vi kan inte enkelt verifiera "ingen webclient" här pga WebClient-kedjan är komplex att mocka "not called",
        // men om testet passerar utan nullpointer på webclienten så vet vi att den inte anropades.
    }
}