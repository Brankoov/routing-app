package se.brankoov.routing.infra.ors;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;

@Service
public class OrsMatrixService {

    private final WebClient orsWebClient;

    public OrsMatrixService(@Qualifier("orsWebClient") WebClient orsWebClient) {
        this.orsWebClient = orsWebClient;
    }

    /**
     * Hämtar en matris med körtider (i sekunder) mellan alla punkter.
     * @param locations En lista med koordinater [longitud, latitud] OBS: ORS vill ha Longitud FÖRST!
     * @return En 2D-array där duration[0][1] är tiden från punkt 0 till punkt 1.
     */
    public double[][] getDurations(List<List<Double>> locations) {
        if (locations == null || locations.size() < 2) {
            return new double[0][0];
        }

        MatrixRequest requestBody = new MatrixRequest(locations, List.of("duration"));

        MatrixResponse response = orsWebClient.post()
                .uri("/v2/matrix/driving-car")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(MatrixResponse.class)
                .block();
        System.out.println("✅ ORS Matrix svarade! Fick en tabell med storlek: "
                + response.durations().length + "x" + response.durations()[0].length);

        if (response == null || response.durations() == null) {
            throw new RuntimeException("Failed to fetch matrix from ORS");
        }

        return response.durations();
    }

    // --- DTOs för JSON-kommunikation ---

    // Request: Vad vi skickar till ORS
    public record MatrixRequest(
            List<List<Double>> locations, // [[lon, lat], [lon, lat]...]
            List<String> metrics          // ["duration"]
    ) {}

    // Response: Vad vi får tillbaka
    public record MatrixResponse(
            double[][] durations // Tider i sekunder. durations[frånIndex][tillIndex]
            // Vi struntar i "distances" just nu, tid är viktigast för optimering
    ) {}
}