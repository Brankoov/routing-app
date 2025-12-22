package se.brankoov.routing.domain.auth;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp; // <--- NY IMPORT
import java.time.Instant;

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

    private String role = "USER"; // "USER" eller "ADMIN"

    @Column(nullable = false)
    private boolean enabled = true;

    // ÄNDRAT: Tog bort columnDefinition och lade till @CreationTimestamp
    @Column(nullable = false, updatable = false)
    @CreationTimestamp
    private Instant createdAt;

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

    public Instant getCreatedAt() { return createdAt; }
}