package se.brankoov.routing.domain.route.entity;

import jakarta.persistence.*;
import se.brankoov.routing.domain.auth.UserEntity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "routes")
public class RouteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private String startAddress;
    private String endAddress;

    @Column(columnDefinition = "TEXT")
    private String geometry;

    private Long totalDuration;
    private Integer averageStopDuration;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private UserEntity owner;

    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RouteStopEntity> stops = new ArrayList<>();

    public RouteEntity() {}

    // UPPDATERAD KONSTRUKTOR (Nu med 6 argument)
    public RouteEntity(String name, String description, String startAddress, String endAddress, String geometry, Long totalDuration, Integer averageStopDuration) {
        this.name = name;
        this.description = description;
        this.startAddress = startAddress;
        this.endAddress = endAddress;
        this.geometry = geometry;
        this.totalDuration = totalDuration;
        this.averageStopDuration = averageStopDuration; // <--- NYTT
    }

    public void addStop(RouteStopEntity stop) {
        stops.add(stop);
        stop.setRoute(this);
    }

    // Getters & Setters
    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStartAddress() { return startAddress; }
    public void setStartAddress(String startAddress) { this.startAddress = startAddress; }
    public String getEndAddress() { return endAddress; }
    public void setEndAddress(String endAddress) { this.endAddress = endAddress; }
    public String getGeometry() { return geometry; }
    public void setGeometry(String geometry) { this.geometry = geometry; }
    public Long getTotalDuration() { return totalDuration; }
    public void setTotalDuration(Long totalDuration) { this.totalDuration = totalDuration; }
    public UserEntity getOwner() { return owner; }
    public void setOwner(UserEntity owner) { this.owner = owner; }
    public Instant getCreatedAt() { return createdAt; }
    public List<RouteStopEntity> getStops() { return stops; }
    public Integer getAverageStopDuration() { return averageStopDuration; }
    public void setAverageStopDuration(Integer averageStopDuration) { this.averageStopDuration = averageStopDuration; }
}