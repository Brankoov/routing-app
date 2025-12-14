package se.brankoov.routing.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails; // <--- VIKTIG IMPORT
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    // ÄNDRAD: Tar nu emot UserDetails för att kunna komma åt rollen
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();

        // 1. Hämta rollen (Spring Security sparar den ofta som "ROLE_ADMIN")
        String role = userDetails.getAuthorities().stream()
                .findFirst()
                .map(item -> item.getAuthority())
                .orElse("USER");

        // 2. Ta bort "ROLE_" om det finns, så frontend får rent "ADMIN"
        if (role.startsWith("ROLE_")) {
            role = role.substring(5);
        }

        // 3. Lägg in rollen i "claims" (det som bakas in i tokenet)
        claims.put("role", role);

        return createToken(claims, userDetails.getUsername());
    }

    // Hjälpmetod för att bygga tokenet med claims
    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .setClaims(claims) // Här stoppar vi in rollen
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(encodeSecret(secret));
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private String encodeSecret(String secret) {
        return java.util.Base64.getEncoder().encodeToString(secret.getBytes());
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}