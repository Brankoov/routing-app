package se.brankoov.routing.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtRequestFilter extends OncePerRequestFilter {

    private final CustomUserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;

    public JwtRequestFilter(CustomUserDetailsService userDetailsService, JwtUtil jwtUtil) {
        this.userDetailsService = userDetailsService;
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        final String authorizationHeader = request.getHeader("Authorization");

        String username = null;
        String jwt = null;

        // 1. Hämta token från headern ("Bearer eyJhb...")
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
            try {
                // Här skulle man kunna ha en validateToken-metod i JwtUtil som extra check,
                // men vi extraherar username direkt. Om token är trasig kastar denna ett exception.
                username = jwtUtil.extractUsername(jwt);
            } catch (Exception e) {
                // Token ogiltig eller utgången
                System.out.println("JWT Token invalid: " + e.getMessage());
            }
        }

        // 2. Om vi hittade ett namn, och ingen är inloggad än i denna request...
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

            // (Här skulle man egentligen validera token mot userDetails också, men vi litar på signaturen för nu)

            // 3. Skapa autentiseringsobjektet
            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());

            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            // 4. Sätt användaren som "Inloggad" i Spring Securitys kontext
            SecurityContextHolder.getContext().setAuthentication(authToken);
        }

        // 5. Fortsätt till nästa filter (släpp igenom requesten)
        chain.doFilter(request, response);
    }
}