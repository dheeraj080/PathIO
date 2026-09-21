package com.path.pathio.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class CloudflareSyncService {

    private static final Logger log = LoggerFactory.getLogger(CloudflareSyncService.class);

    private final RestClient restClient;
    private final String accountId;
    private final String namespaceId;
    private final String apiToken;

    public CloudflareSyncService(
            @Value("${cloudflare.account-id}") String accountId,
            @Value("${cloudflare.kv-namespace-id}") String namespaceId,
            @Value("${cloudflare.api-token}") String apiToken) {
        this.accountId = accountId;
        this.namespaceId = namespaceId;
        this.apiToken = apiToken;
        this.restClient = RestClient.builder().build();
    }

    /**
     * Asynchronously pushes new short keys to Cloudflare KV.
     */
    @Async
    public void syncToEdgeKv(String shortCode, String originalUrl) {
        String url = String.format(
                "https://api.cloudflare.com/client/v4/accounts/%s/storage/kv/namespaces/%s/values/%s",
                accountId, namespaceId, shortCode
        );

        try {
            restClient.put()
                    .uri(url)
                    .header("Authorization", "Bearer " + apiToken)
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(originalUrl)
                    .retrieve()
                    .toBodilessEntity();

            log.info("Successfully synced shortCode '{}' to Cloudflare KV Edge.", shortCode);
        } catch (Exception e) {
            log.error("Failed to sync shortCode '{}' to Cloudflare KV", shortCode, e);
        }
    }
}
