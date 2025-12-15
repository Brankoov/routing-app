package se.brankoov.routing.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
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

        System.out.println("--- JwtRequestFilter Start ---");
        System.out.println("Request URL: " + request.getRequestURI());

        // 1. Hämta token från headern
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
            System.out.println("Token hittad i header (första 10 tecken): " + (jwt.length() > 10 ? jwt.substring(0, 10) + "..." : jwt));
            try {
                username = jwtUtil.extractUsername(jwt);
                System.out.println("Lyckades extrahera användarnamn: " + username);
            } catch (Exception e) {
                System.out.println("❌ JWT Token invalid/expired: " + e.getMessage());
                // e.printStackTrace(); // Avkommentera om du vill se hela felet
            }
        } else {
            System.out.println("⚠️ Ingen 'Bearer' token hittades i Authorization-headern.");
        }

        // 2. Validera och sätt kontext
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
                System.out.println("Användare hittad i DB: " + userDetails.getUsername() + ", Authorities: " + userDetails.getAuthorities());

                if (!userDetails.isEnabled()) {
                    System.out.println("⛔ Användaren är inaktiverad/bannad!");
                    SecurityContextHolder.clearContext();
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("{\"error\":\"Du är bannad 🚫\"}");
                    return;
                }

                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
                System.out.println("✅ Autentisering lyckades! Användare inloggad.");

            } catch (Exception e) {
                System.out.println("❌ Kunde inte ladda användare från DB: " + e.getMessage());
            }
        }

        System.out.println("--- JwtRequestFilter Slut (fortsätter chain) ---");
        chain.doFilter(request, response);
    }
}