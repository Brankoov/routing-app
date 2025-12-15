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
@Order(1)
public class RateLimitingFilter implements Filter {

    private final ConcurrentMap<String, RateLimiter> limiters = new ConcurrentHashMap<>();

    // ÄNDRAD: 100.0 anrop/sekund.
    // Detta är "Safe mode". Det tillåter frontend att spamma sökförslag utan att krascha,
    // men stoppar fortfarande riktiga DoS-attacker.
    private static final double REQUESTS_PER_SECOND = 100.0;

    // BEHÅLL: Max 1 optimering var 3:e sekund (för att spara din ORS-kvot)
    private static final double OPTIMIZE_RPS = 0.33;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();

        // 1. UNDANTAG: Släpp alltid igenom inloggning och hälso-checkar
        if (path.startsWith("/api/auth") || path.startsWith("/api/health")) {
            chain.doFilter(request, response);
            return;
        }

        String ip = getClientIP(httpRequest);

        // 2. Global Rate Limit (Nu 100 anrop/sek per IP)
        RateLimiter globalLimiter = limiters.computeIfAbsent(ip + ":global",
                k -> RateLimiter.create(REQUESTS_PER_SECOND)
        );

        if (!globalLimiter.tryAcquire()) {
            httpResponse.setStatus(429);
            httpResponse.setContentType("application/json");
            httpResponse.setCharacterEncoding("UTF-8");
            httpResponse.getWriter().write("{\"message\": \"För många anrop! 🚦\"}");
            return;
        }

        // 3. Specifik Rate Limit för optimering (Dyra anrop)
        if (path.contains("/api/routes/optimize")) {
            RateLimiter optimizeLimiter = limiters.computeIfAbsent(ip + ":optimize",
                    k -> RateLimiter.create(OPTIMIZE_RPS)
            );

            if (!optimizeLimiter.tryAcquire()) {
                httpResponse.setStatus(429);
                httpResponse.setContentType("application/json");
                httpResponse.setCharacterEncoding("UTF-8");
                httpResponse.getWriter().write("{\"message\": \"Vänta 3 sekunder mellan optimeringar.\"}");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    private String getClientIP(HttpServletRequest request) {
        String xForwardedForHeader = request.getHeader("X-Forwarded-For");
        if (xForwardedForHeader != null && !xForwardedForHeader.isEmpty()) {
            return xForwardedForHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}