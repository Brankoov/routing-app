package se.brankoov.routing.domain.route.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "routes")
public class RouteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;        // T.ex. "Måndag Glas4"

    private String description;

    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RouteStopEntity> stops = new ArrayList<>();

    public RouteEntity() {
    }

    public RouteEntity(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public void addStop(RouteStopEntity stop) {
        stops.add(stop);
        stop.setRoute(this);
    }

    // Getters & Setters
    public Long getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    // Nya getters/setters för description
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Instant getCreatedAt() { return createdAt; }
    public List<RouteStopEntity> getStops() { return stops; }
    public void setStops(List<RouteStopEntity> stops) { this.stops = stops; }
}