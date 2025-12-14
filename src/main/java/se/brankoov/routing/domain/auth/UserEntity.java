package se.brankoov.routing.domain.auth;

import jakarta.persistence.*;
import java.time.Instant; // ÄNDRAT: Bättre för databas tidsstämplar

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    // INGEN ÄNDRING HÄR
    private String role = "USER"; // "USER" eller "ADMIN"

    // ÄNDRAT: Tvinga NOT NULL och default i DB för att matcha Java-fältet
    @Column(nullable = false)
    private boolean enabled = true;

    // ÄNDRAT: Tvinga NOT NULL och sätt standardvärde (CURRENT_TIMESTAMP) på databasnivå
    @Column(nullable = false, updatable = false, columnDefinition = "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")
    private Instant createdAt = Instant.now();

    public UserEntity() {}

    public UserEntity(String username, String password) {
        this.username = username;
        this.password = password;
    }

    // Getters & Setters
    public Long getId() { return id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    // ÄNDRAT: Returnerar Instant
    public Instant getCreatedAt() { return createdAt; }
}