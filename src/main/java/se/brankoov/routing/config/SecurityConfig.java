package se.brankoov.routing.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
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
}
