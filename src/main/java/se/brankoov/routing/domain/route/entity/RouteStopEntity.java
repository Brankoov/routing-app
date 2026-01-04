package se.brankoov.routing.domain.route.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;

@Entity
@Table(name = "route_stops")
public class RouteStopEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String label;    // T.ex. "Stop 1"
    private String address;  // Adressen
    private Double latitude;
    private Double longitude;

    @Column(name = "stop_order") // "order" är ett reserverat ord i SQL, så vi byter namn
    private int orderIndex;

    @Column(length = 100)
    private String comment;

    @ManyToOne
    @JoinColumn(name = "route_id")
    @JsonIgnore
    private RouteEntity route;

    public RouteStopEntity() {
    }

    public RouteStopEntity(String label, String address, Double lat, Double lng, int orderIndex) {
        this.label = label;
        this.address = address;
        this.latitude = lat;
        this.longitude = lng;
        this.orderIndex = orderIndex;
    }

    // Getters & Setters
    public Long getId() { return id; }
    public String getLabel() { return label; }
    public String getAddress() { return address; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public int getOrderIndex() { return orderIndex; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public void setRoute(RouteEntity route) { this.route = route; }
}