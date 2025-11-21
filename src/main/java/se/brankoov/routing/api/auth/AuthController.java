package se.brankoov.routing.api.auth;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import se.brankoov.routing.domain.auth.UserEntity;
import se.brankoov.routing.domain.auth.UserRepository;
import se.brankoov.routing.security.JwtUtil;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          AuthenticationManager authenticationManager,
                          JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
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
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // 1. Försök att autentisera (kollar lösenord automatiskt)
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        // 2. Om vi kommer hit så var lösenordet rätt! Generera token.
        String token = jwtUtil.generateToken(request.username());

        return ResponseEntity.ok(new LoginResponse(token));
    }
}