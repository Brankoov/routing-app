package se.brankoov.routing.api.route;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record SaveRouteRequest(
        @NotBlank(message = "Name is required") String name,
        String description,
        String startAddress,
        String endAddress,
        String geometry,
        Long totalDuration,
        @NotEmpty(message = "Stops cannot be empty") @Valid List<StopResponse> stops
) {}