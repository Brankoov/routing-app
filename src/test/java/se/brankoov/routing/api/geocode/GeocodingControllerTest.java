package se.brankoov.routing.api.geocode;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;

import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import se.brankoov.routing.domain.geocode.GeocodingService;

import java.util.Optional;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.security.test.context.support.WithMockUser;

@WebMvcTest(GeocodingController.class)
@WithMockUser   // <--- Låtsas att alla requests är inloggade
class GeocodingControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    GeocodingService geocodingService;

    @Test
    void returnsLatLngWhenFound() throws Exception {
        given(geocodingService.geocodeFirst("Test Street 1"))
                .willReturn(Optional.of(new GeocodingService.LatLng(59.0, 18.0)));

        mockMvc.perform(get("/api/geocode").param("q", "Test Street 1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("Test Street 1"))
                .andExpect(jsonPath("$.latitude").value(59.0))
                .andExpect(jsonPath("$.longitude").value(18.0));
    }

    @Test
    void returns404WhenNotFound() throws Exception {
        given(geocodingService.geocodeFirst("Unknown"))
                .willReturn(Optional.empty());

        mockMvc.perform(get("/api/geocode").param("q", "Unknown"))
                .andExpect(status().isNotFound());
    }
}
