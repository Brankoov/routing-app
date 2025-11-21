package se.brankoov.routing.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    // Hjälpmetod för att hitta användare via namn (för inloggning senare)
    Optional<UserEntity> findByUsername(String username);

    // För att kolla om namnet är upptaget vid registrering
    boolean existsByUsername(String username);
}