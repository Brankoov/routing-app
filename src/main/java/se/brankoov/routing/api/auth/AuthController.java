package se.brankoov.routing.api.auth;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import se.brankoov.routing.domain.auth.UserEntity;
import se.brankoov.routing.domain.auth.UserRepository;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already exists"));
        }

        // 1. Skapa användare
        UserEntity user = new UserEntity(
                request.username(),
                passwordEncoder.encode(request.password()) // 2. Kryptera lösenordet!
        );

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
    }
}