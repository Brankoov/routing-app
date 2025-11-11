package se.brankoov.routing.api.route;

import jakarta.validation.constraints.NotBlank;

public record StopRequest(
        @NotBlank(message = "id must not be blank")
        String id,

        @NotBlank(message = "label must not be blank")
        String label,

        @NotBlank(message = "address must not be blank")
        String address,

        Double latitude,
        Double longitude
) {}
