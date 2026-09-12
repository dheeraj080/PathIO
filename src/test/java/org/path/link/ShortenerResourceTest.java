package org.path.link;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class ShortenerResourceTest {

    @Test
    void testShortenAndRedirectFlow() {
        String originalUrl = "https://quarkus.io/guides/cassandra";

        // 1. POST request to create short link
        String shortCode = given()
                .contentType(ContentType.JSON)
                .body("{\"url\": \"" + originalUrl + "\"}")
                .when()
                .post("/api/v1/shorten")
                .then()
                .statusCode(201)
                .body("key", notNullValue())
                .body("key.length()", is(7))
                .extract()
                .path("key");

        // 2. GET request to verify HTTP redirect (302 Found)
        given()
                .redirects().follow(false) // Do not automatically follow redirect
                .when()
                .get("/" + shortCode)
                .then()
                .statusCode(302)
                .header("Location", equalTo(originalUrl));
    }

    @Test
    void testInvalidUrlValidation() {
        // Verify Bean Validation (@URL)
        given()
                .contentType(ContentType.JSON)
                .body("{\"url\": \"not-a-valid-url\"}")
                .when()
                .post("/api/v1/shorten")
                .then()
                .statusCode(400); // Bad Request
    }
}