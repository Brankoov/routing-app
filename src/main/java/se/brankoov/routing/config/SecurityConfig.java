package se.brankoov.routing.config;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import se.brankoov.routing.security.JwtRequestFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {
    private final JwtRequestFilter jwtRequestFilter; // <--- Injecta filtret

    public SecurityConfig(JwtRequestFilter jwtRequestFilter) {
        this.jwtRequestFilter = jwtRequestFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/api/health").permitAll() // Öppet
                        .requestMatchers("/api/geocode/**").permitAll() // Låt geocoding vara öppet för nu (eller lås om du vill)

                        // LÅS ALLA RUTT-ANROP:
                        .requestMatchers("/api/routes/**").authenticated()

                        .anyRequest().authenticated() // Allt annat låst som standard
                )
                // LÄGG TILL FILTRET HÄR:
                .addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 🔹 Här lägger vi till vilka origins som får anropa ditt API
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",            // Localhost
                "https://routing-app.vercel.app",   // Huvudlänken
                "https://routing-app-green.vercel.app"
        ));

        // Vilka HTTP-metoder vi släpper igenom
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // Vilka headers som är ok
        config.setAllowedHeaders(List.of("Content-Type", "Authorization"));

        // Tillåt credentials om du senare kör cookies/JWT i headers
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Gäller för alla endpoints
        source.registerCorsConfiguration("/**", config);
        return source;
    }
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}

