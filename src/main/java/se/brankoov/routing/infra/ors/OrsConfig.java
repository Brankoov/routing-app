package se.brankoov.routing.infra.ors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class OrsConfig {

    @Value("${ors.api.url}")
    String baseUrl;

    @Value("${ors.api.key}")
    String apiKey;

    @Bean
    public WebClient orsWebClient(WebClient.Builder builder) {
        return builder
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, apiKey)
                .build();
    }
}
