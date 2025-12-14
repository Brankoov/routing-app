package se.brankoov.routing.security;

import org.springframework.security.core.authority.SimpleGrantedAuthority; // <--- VIKTIG IMPORT
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import se.brankoov.routing.domain.auth.UserEntity;
import se.brankoov.routing.domain.auth.UserRepository;

import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // 1. Leta upp vår egen UserEntity i databasen
        UserEntity userEntity = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        // 2. Skapa rollen (Spring vill ha formatet "ROLE_ADMIN")
        var authority = new SimpleGrantedAuthority("ROLE_" + userEntity.getRole());

        // 3. Konvertera till Spring Security User
        // Vi använder konstruktorn som tar 7 argument för att få med "enabled" (bannad-status) och rollen
        return new User(
                userEntity.getUsername(),
                userEntity.getPassword(),
                userEntity.isEnabled(), // true = aktiv, false = bannad
                true, // accountNonExpired
                true, // credentialsNonExpired
                true, // accountNonLocked
                List.of(authority) // <--- HÄR SKICKAR VI MED ROLLEN NU!
        );
    }
}