package se.brankoov.routing.config;

import org.springframework.beans.factory.annotation.Value; // <--- Importera denna
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import se.brankoov.routing.domain.auth.UserEntity;
import se.brankoov.routing.domain.auth.UserRepository;

@Component
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Här hämtar vi lösenordet från inställningarna.
    // Om inget finns satt, används "defaultAdmin123" som reserv.
    @Value("${ADMIN_PASSWORD:defaultAdmin123}")
    private String adminPassword;

    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.findByUsername("gud").isEmpty()) {
            UserEntity admin = new UserEntity();
            admin.setUsername("gud");
            // Använd variabeln istället för hårdkodad text
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setRole("ADMIN");
            admin.setEnabled(true);

            userRepository.save(admin);
            System.out.println("👑 ADMIN-konto skapat med lösenord från config.");
        }
    }
}