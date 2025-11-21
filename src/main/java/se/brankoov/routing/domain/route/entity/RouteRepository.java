package se.brankoov.routing.domain.route.entity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// JpaRepository ger oss automatiskt metoder som .save(), .findAll(), .findById()
public interface RouteRepository extends JpaRepository<RouteEntity, Long> {
    List<RouteEntity> findAllByOwnerUsername(String username);
}