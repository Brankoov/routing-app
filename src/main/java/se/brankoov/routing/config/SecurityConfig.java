package se.brankoov.routing.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        // Enable CORS so the CorsConfigurationSource bean is used
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        // Vi bygger ren JSON-API => stäng av CSRF för nu
        .csrf(csrf -> csrf.disable())
        .authorizeHttpRequests(auth -> auth
            // Öppna upp alla våra API-endpoints
            .requestMatchers("/api/**").permitAll()
            // (om du har nåt annat senare kan det kräva auth)
            .anyRequest().permitAll()
        );

        // Ingen inloggning alls just nu
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 🔹 Här lägger vi till vilka origins som får anropa ditt API
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",    // Vite dev-server (frontend)
                "http://localhost:3000"     // extra om du kör nåt annat
                // senare: lägg till din Render-frontend-URL här
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
}

