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

//@Component
//@Order(1)
public class RateLimitingFilter implements Filter {

    private final ConcurrentMap<String, RateLimiter> limiters = new ConcurrentHashMap<>();

    // GLOBAL GRÄNS: 100 anrop/sekund (hanterar snabba kart-laddningar)
    private static final double REQUESTS_PER_SECOND = 100.0;

    // OPTIMERINGS-GRÄNS: Höjd till 2.0 anrop/sekund (tillåter dubbelklick/omförsök)
    private static final double OPTIMIZE_RPS = 2.0;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();

        // 1. VIKTIGT: Släpp alltid igenom "OPTIONS" (CORS pre-flight checks)
        // Detta var troligen problemet! Webbläsaren kollar "får jag anropa?" och blev blockad.
        if (httpRequest.getMethod().equalsIgnoreCase("OPTIONS")) {
            chain.doFilter(request, response);
            return;
        }

        // 2. Släpp alltid igenom Auth och Health
        if (path.startsWith("/api/auth") || path.startsWith("/api/health")) {
            chain.doFilter(request, response);
            return;
        }

        String ip = getClientIP(httpRequest);

        // 3. Global Rate Limit
        RateLimiter globalLimiter = limiters.computeIfAbsent(ip + ":global",
                k -> RateLimiter.create(REQUESTS_PER_SECOND)
        );

        if (!globalLimiter.tryAcquire()) {
            send429(httpResponse, "Systemet är upptaget. För många anrop.");
            return;
        }

        // 4. Specifik Rate Limit för optimering
        if (path.contains("/api/routes/optimize")) {
            RateLimiter optimizeLimiter = limiters.computeIfAbsent(ip + ":optimize",
                    k -> RateLimiter.create(OPTIMIZE_RPS)
            );

            if (!optimizeLimiter.tryAcquire()) {
                send429(httpResponse, "Vänta lite innan du optimerar igen.");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    private void send429(HttpServletResponse response, String msg) throws IOException {
        response.setStatus(429);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"message\": \"" + msg + "\"}");
    }

    private String getClientIP(HttpServletRequest request) {
        String xForwardedForHeader = request.getHeader("X-Forwarded-For");
        if (xForwardedForHeader != null && !xForwardedForHeader.isEmpty()) {
            return xForwardedForHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}