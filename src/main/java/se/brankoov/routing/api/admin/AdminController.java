package se.brankoov.routing.api.admin;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import se.brankoov.routing.domain.auth.UserEntity;
import se.brankoov.routing.domain.auth.UserRepository;
import se.brankoov.routing.domain.route.entity.RouteEntity;
import se.brankoov.routing.domain.route.entity.RouteRepository;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final RouteRepository routeRepository;

    public AdminController(UserRepository userRepository, RouteRepository routeRepository) {
        this.userRepository = userRepository;
        this.routeRepository = routeRepository;
    }

    // 1. Hämta alla användare (för tabellen)
    @GetMapping("/users")
    public List<UserEntity> getAllUsers() {
        return userRepository.findAll();
    }

    // 2. Banna / Av-banna en användare
    @PutMapping("/users/{id}/ban")
    public ResponseEntity<?> toggleBan(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            // Vi byter till motsatsen. Om true -> false. Om false -> true.
            boolean newState = !user.isEnabled();
            user.setEnabled(newState);
            userRepository.save(user);

            String status = newState ? "aktiv" : "bannad";
            return ResponseEntity.ok("Användare är nu " + status);
        }).orElse(ResponseEntity.notFound().build());
    }

    // 3. Se en specifik användares rutter (Spion-läge 🕵️‍♂️)
    @GetMapping("/users/{username}/routes")
    public List<RouteEntity> getUserRoutes(@PathVariable String username) {
        return routeRepository.findByOwnerUsername(username);
    }
}