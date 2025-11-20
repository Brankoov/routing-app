package se.brankoov.routing.api.route;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SaveRouteRequest(
        @NotBlank(message = "Name is required")
        String name,

        String description, // Valfritt

        @NotEmpty(message = "Stops cannot be empty")
        List<StopResponse> stops // Vi återanvänder StopResponse eftersom den har allt vi behöver (lat/lng/order)
) {}