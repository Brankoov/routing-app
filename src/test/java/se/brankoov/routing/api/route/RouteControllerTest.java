package se.brankoov.routing.api.route;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import se.brankoov.routing.domain.route.RouteOptimizationService;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RouteController.class)
@WithMockUser
class RouteControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    RouteOptimizationService routeService;

    @Test
    void returnsOptimizedRouteFromService() throws Exception {
        // arrange: mocka vad servicen ska svara
        var stop1 = new StopResponse("1", "Stop 1", "Addr 1", 59.0, 18.0, 0);
        var stop2 = new StopResponse("2", "Stop 2", "Addr 2", 59.1, 18.1, 1);
        var response = new RouteOptimizationResponse(List.of(stop1, stop2), 2);

        given(routeService.optimize(any(RouteOptimizationRequest.class)))
                .willReturn(response);

        // enkel request-body (Java 17 text block)
        String json = """
                {
                  "startAddress": "Start address",
                  "endAddress": "End address",
                  "stops": [
                    { "id": "1", "label": "Stop 1", "address": "Addr 1", "latitude": null, "longitude": null },
                    { "id": "2", "label": "Stop 2", "address": "Addr 2", "latitude": null, "longitude": null }
                  ]
                }
                """;

        // act + assert
        mockMvc.perform(post("/api/routes/optimize")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalStops").value(2))
                .andExpect(jsonPath("$.orderedStops[0].id").value("1"))
                .andExpect(jsonPath("$.orderedStops[0].order").value(0))
                .andExpect(jsonPath("$.orderedStops[1].id").value("2"))
                .andExpect(jsonPath("$.orderedStops[1].order").value(1));
    }
}
