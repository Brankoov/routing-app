package se.brankoov.routing.domain.route;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DistanceCalculatorTest {

    @Test
    void distanceIsZeroForSamePoint() {
        double d = DistanceCalculator.distanceInKm(59.0, 18.0, 59.0, 18.0);
        assertEquals(0.0, d, 0.000001);
    }

    @Test
    void distanceBetweenTwoCitiesIsReasonable() {
        // Typ Stockholm (59.33, 18.06) till Göteborg (57.71, 11.97)
        double d = DistanceCalculator.distanceInKm(59.33, 18.06, 57.71, 11.97);

        // Riktigt avstånd är ~400 km, vi kollar bara "rimligt spann"
        assertEquals(400.0, d, 50.0); // tillåter +- 50 km
    }
}
