package se.brankoov.routing.security;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import se.brankoov.routing.domain.auth.UserEntity;
import se.brankoov.routing.domain.auth.UserRepository;

import java.util.Collections;

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

        // 2. Konvertera den till Spring Securitys eget "User"-format
        return new User(
                userEntity.getUsername(),
                userEntity.getPassword(), // Det krypterade lösenordet
                Collections.emptyList()   // Vi har inga roller/behörigheter just nu
        );
    }
}