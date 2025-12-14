package se.brankoov.routing.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.core.Ordered; // NY IMPORT
import se.brankoov.routing.domain.auth.UserEntity;
import se.brankoov.routing.domain.auth.UserRepository;

@Component
// IMPLEMENTERAR Ordered för att styra körordningen
public class AdminInitializer implements CommandLineRunner, Ordered {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_PASSWORD:defaultAdmin123}")
    private String adminPassword;

    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // Logiken är oförändrad, men den körs nu vid rätt tidpunkt.
        if (userRepository.findByUsername("gud").isEmpty()) {
            UserEntity admin = new UserEntity();
            admin.setUsername("gud");
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setRole("ADMIN");
            admin.setEnabled(true);

            userRepository.save(admin);
            System.out.println("👑 ADMIN-konto skapat med lösenord från config.");
        }
    }

    @Override
    public int getOrder() {
        // Tvingar denna att köras sent i Spring Boot-processen (lågt prioritet)
        return 100;
    }
}