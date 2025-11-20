package se.brankoov.routing.domain.route.entity;

import org.springframework.data.jpa.repository.JpaRepository;

// JpaRepository ger oss automatiskt metoder som .save(), .findAll(), .findById()
public interface RouteRepository extends JpaRepository<RouteEntity, Long> {
}