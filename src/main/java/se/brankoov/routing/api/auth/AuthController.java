package se.brankoov.routing.api.auth;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails; // <--- VIKTIG IMPORT
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
            return ResponseEntity.badRequest().body(Map.of("error", "Användarnamnet är upptaget"));
        }

        // 1. Skapa användare
        UserEntity user = new UserEntity(
                request.username(),
                passwordEncoder.encode(request.password()) // 2. Kryptera lösenordet!
        );

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Användare registrerad!"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );

            UserDetails userDetails = (UserDetails) auth.getPrincipal();
            String token = jwtUtil.generateToken(userDetails);

            return ResponseEntity.ok(new LoginResponse(token));

        } catch (DisabledException ex) {
            // Här hamnar bannade (enabled=false)
            return ResponseEntity.status(403).body(Map.of("error", "Du är bannad 🚫"));

        } catch (BadCredentialsException ex) {
            // Fel lösen/användarnamn
            return ResponseEntity.status(401).body(Map.of("error", "Fel användarnamn eller lösenord"));

        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of("error", "Något gick fel vid inloggning"));
        }
    }
}