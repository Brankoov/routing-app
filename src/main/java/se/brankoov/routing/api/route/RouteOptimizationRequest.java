package se.brankoov.routing.api.route;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record RouteOptimizationRequest(
        @NotBlank(message = "startAddress must not be blank")
        String startAddress,

        @NotBlank(message = "endAddress must not be blank")
        String endAddress,

        @NotEmpty(message = "stops must not be empty")
        @Valid
        List<StopRequest> stops,

        boolean optimize


) {}
