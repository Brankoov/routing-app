package se.brankoov.routing.domain.geocode;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GeocodeCacheRepository extends JpaRepository<GeocodeCacheEntity, String> {
    // Vi behöver inga extra metoder, findById(query) räcker!
}