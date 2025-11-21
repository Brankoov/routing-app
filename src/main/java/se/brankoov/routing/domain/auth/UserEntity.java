package se.brankoov.routing.domain.auth;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username; // T.ex. "förare1" eller email

    @Column(nullable = false)
    private String password; // Krypterat lösenord (BCrypt)

    private String role = "USER"; // Enkel rollhantering

    // En användare kan ha många rutter (vi kopplar ihop dem senare)

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
}