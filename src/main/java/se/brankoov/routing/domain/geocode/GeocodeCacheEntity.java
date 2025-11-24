package se.brankoov.routing.domain.geocode;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "geocode_cache")
public class GeocodeCacheEntity {

    @Id
    private String query; // Söksträngen (alltid lowercase och trimmad)

    @Column(columnDefinition = "TEXT") // För att få plats med lång JSON
    private String jsonResponse;

    private Instant updatedAt = Instant.now();

    public GeocodeCacheEntity() {}

    public GeocodeCacheEntity(String query, String jsonResponse) {
        this.query = query;
        this.jsonResponse = jsonResponse;
    }

    // Getters & Setters
    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }
    public String getJsonResponse() { return jsonResponse; }
    public void setJsonResponse(String jsonResponse) { this.jsonResponse = jsonResponse; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}