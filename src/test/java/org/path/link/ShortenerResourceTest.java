package org.path.link;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class ShortenerResourceTest {

    @Test
    @DisplayName("POST /api/v1/shorten - Success creates a short key")
    void testShortenUrlSuccess() {
        String payload = """
            {
                "url": "https://www.example.com/some/very/long/path"
            }
            """;

        given()
                .contentType(ContentType.JSON)
                .body(payload)
                .when()
                .post("/api/v1/shorten")
                .then()
                .statusCode(201)
                .body("key", notNullValue())
                .body("shortUrl", notNullValue());
    }

    @Test
    @DisplayName("POST /api/v1/shorten - Returns 400 for invalid URL")
    void testShortenUrlInvalidFormat() {
        String invalidPayload = """
            {
                "url": "not-a-valid-url"
            }
            """;

        given()
                .contentType(ContentType.JSON)
                .body(invalidPayload)
                .when()
                .post("/api/v1/shorten")
                .then()
                .statusCode(400);
    }

    @Test
    @DisplayName("GET /{key} - Redirects to original URL")
    void testRedirectSuccess() {
        String targetUrl = "https://quarkus.io/guides/rest";

        // 1. First, create a short link
        String key = given()
                .contentType(ContentType.JSON)
                .body("{\"url\": \"" + targetUrl + "\"}")
                .post("/api/v1/shorten")
                .then()
                .statusCode(201)
                .extract()
                .path("key");

        // 2. Perform GET and assert redirect status and Location header
        given()
                .redirects().follow(false) // Do not automatically follow the redirect
                .when()
                .get("/" + key)
                .then()
                // Match status configured in resource (301 or 302)
                .statusCode(302)
                .header("Location", equalTo(targetUrl));
    }

    @Test
    @DisplayName("GET /{key} - Returns 404 for missing key")
    void testRedirectNotFound() {
        given()
                .redirects().follow(false)
                .when()
                .get("/nonExistentKey99")
                .then()
                .statusCode(404);
    }
}