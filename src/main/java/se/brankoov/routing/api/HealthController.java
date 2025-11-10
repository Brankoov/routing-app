package se.brankoov.routing.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public Map<String, Object> getHealth() {
        return Map.of(
                "status", "OK",
                "service", "routing-backend",
                "timestamp", Instant.now().toString()
        );
    }
}
