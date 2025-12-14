package se.brankoov.routing.security;

import com.google.common.util.concurrent.RateLimiter;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
@Order(1) // Se till att detta körs tidigt i filterkedjan
public class RateLimitingFilter implements Filter {

    // Karta för att lagra RateLimiter-instanser per IP-adress
    // En RateLimiter är trådsäker och styr tilldelningen av "tillstånd" (tokens)
    private final ConcurrentMap<String, RateLimiter> limiters = new ConcurrentHashMap<>();

    // DEFINIERA GRÄNSEN: Max 10 förfrågningar per sekund per IP
    private static final double REQUESTS_PER_SECOND = 10.0;

    // DEFINIERA GRÄNSEN FÖR OPENROUTE SERVICE (dyrare anrop)
    // Tillåter endast 1 anrop var 3:e sekund till /optimize
    private static final double OPTIMIZE_RPS = 0.33;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String ip = getClientIP(httpRequest);
        String path = httpRequest.getRequestURI();

        // --- 1. Global Rate Limit (för alla anrop) ---
        RateLimiter globalLimiter = limiters.computeIfAbsent(ip + ":global",
                k -> RateLimiter.create(REQUESTS_PER_SECOND)
        );

        if (!globalLimiter.tryAcquire()) {
            // Förfrågan avvisas
            httpResponse.setStatus(429); // 429 Too Many Requests
            httpResponse.getWriter().write("{\"message\": \"För många förfrågningar. Försök igen om en sekund.\"}");
            return;
        }

        // --- 2. Specifik Rate Limit för optimering (dyra API-anrop) ---
        if (path.contains("/api/routes/optimize")) {
            RateLimiter optimizeLimiter = limiters.computeIfAbsent(ip + ":optimize",
                    k -> RateLimiter.create(OPTIMIZE_RPS)
            );

            if (!optimizeLimiter.tryAcquire()) {
                // Förfrågan avvisas
                httpResponse.setStatus(429);
                httpResponse.getWriter().write("{\"message\": \"Ruttoptimering är begränsad till en gång var 3:e sekund.\"}");
                return;
            }
        }

        // Om gränsen inte överskreds, fortsätt till nästa filter/controller
        chain.doFilter(request, response);
    }

    // Enkel metod för att hämta klientens IP-adress
    private String getClientIP(HttpServletRequest request) {
        String xForwardedForHeader = request.getHeader("X-Forwarded-For");
        if (xForwardedForHeader != null && !xForwardedForHeader.isEmpty()) {
            // Render/Load Balancer skickar ofta en lista. Vi tar den första.
            return xForwardedForHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    // ... (init och destroy kan vara tomma i detta fall)
}