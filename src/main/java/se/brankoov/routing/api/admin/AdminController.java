package se.brankoov.routing.api.admin;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import se.brankoov.routing.domain.auth.UserEntity;
import se.brankoov.routing.domain.auth.UserRepository;
import se.brankoov.routing.domain.route.RouteOptimizationService; // <--- NY IMPORT
import se.brankoov.routing.domain.route.entity.RouteEntity;
import se.brankoov.routing.domain.route.entity.RouteRepository;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final RouteRepository routeRepository;
    private final RouteOptimizationService routeOptimizationService; // <--- NYTT FÄLT

    // Uppdaterad konstruktor som tar in service
    public AdminController(UserRepository userRepository,
                           RouteRepository routeRepository,
                           RouteOptimizationService routeOptimizationService) {
        this.userRepository = userRepository;
        this.routeRepository = routeRepository;
        this.routeOptimizationService = routeOptimizationService;
    }

    // 1. Hämta alla användare
    @GetMapping("/users")
    public List<UserEntity> getAllUsers() {
        return userRepository.findAll();
    }

    // 2. Banna / Av-banna
    @PutMapping("/users/{id}/ban")
    public ResponseEntity<?> toggleBan(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            boolean newState = !user.isEnabled();
            user.setEnabled(newState);
            userRepository.save(user);
            String status = newState ? "aktiv" : "bannad";
            return ResponseEntity.ok("Användare är nu " + status);
        }).orElse(ResponseEntity.notFound().build());
    }

    // 3. Se användares rutter
    @GetMapping("/users/{username}/routes")
    public List<RouteEntity> getUserRoutes(@PathVariable String username) {
        return routeRepository.findByOwnerUsername(username);
    }

    // 4. NYTT: Tilldela rutt (Dispatch)
    @PostMapping("/routes/{routeId}/assign/{username}")
    public ResponseEntity<Void> assignRoute(@PathVariable Long routeId, @PathVariable String username) {
        routeOptimizationService.assignRouteToUser(routeId, username);
        return ResponseEntity.ok().build();
    }
}