package com.pt.pathio.shared.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Verifies that the {@code prod} profile refuses to start on development defaults.
 *
 * <p>Plain unit test (no Spring context, no database): the validator only reads properties from an
 * {@link MockEnvironment}.</p>
 */
class ProductionConfigurationValidatorTest {

    private static MockEnvironment validProductionEnvironment() {
        return new MockEnvironment()
                .withProperty("spring.datasource.password", "a-strong-unique-db-password")
                .withProperty("spring.security.oauth2.client.registration.google.client-id", "1234567890-abc.apps.googleusercontent.com")
                .withProperty("spring.security.oauth2.client.registration.google.client-secret", "GOCSPX-real-google-secret")
                .withProperty("spring.security.oauth2.client.registration.github.client-id", "Iv1.real-github-client-id")
                .withProperty("spring.security.oauth2.client.registration.github.client-secret", "real-github-client-secret")
                .withProperty("app.admin.email", "admin@pathio.example")
                .withProperty("app.admin.password", "a-strong-admin-password");
    }

    private static void validate(MockEnvironment environment) throws Exception {
        new ProductionConfigurationValidator(environment).afterPropertiesSet();
    }

    @Test
    void acceptsStrongProductionConfiguration() {
        assertThatCode(() -> validate(validProductionEnvironment()))
                .doesNotThrowAnyException();
    }

    @Test
    void allowsOAuthOnlyDeploymentWithoutAnAdmin() {
        MockEnvironment environment = validProductionEnvironment()
                .withProperty("app.admin.email", "")
                .withProperty("app.admin.password", "");

        assertThatCode(() -> validate(environment)).doesNotThrowAnyException();
    }

    @Test
    void rejectsDefaultDatabasePassword() {
        MockEnvironment environment = validProductionEnvironment()
                .withProperty("spring.datasource.password", "secretpassword");

        assertThatThrownBy(() -> validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.datasource.password");
    }

    @Test
    void rejectsMissingDatabasePassword() {
        MockEnvironment environment = validProductionEnvironment()
                .withProperty("spring.datasource.password", "");

        assertThatThrownBy(() -> validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.datasource.password");
    }

    @Test
    void rejectsDummyOAuthClientRegistration() {
        MockEnvironment environment = validProductionEnvironment()
                .withProperty("spring.security.oauth2.client.registration.google.client-id", "dummy-google-client-id");

        assertThatThrownBy(() -> validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("google OAuth client-id");
    }

    @Test
    void rejectsPlaceholderGitHubClientSecret() {
        MockEnvironment environment = validProductionEnvironment()
                .withProperty("spring.security.oauth2.client.registration.github.client-secret", "your-github-client-secret");

        assertThatThrownBy(() -> validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("github OAuth client-secret");
    }

    @Test
    void rejectsDefaultAdminPassword() {
        MockEnvironment environment = validProductionEnvironment()
                .withProperty("app.admin.password", "change-me");

        assertThatThrownBy(() -> validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.admin.password");
    }

    @Test
    void rejectsShortAdminPassword() {
        MockEnvironment environment = validProductionEnvironment()
                .withProperty("app.admin.password", "short");

        assertThatThrownBy(() -> validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 12 characters");
    }

    @Test
    void rejectsPartialAdminConfiguration() {
        MockEnvironment environment = validProductionEnvironment()
                .withProperty("app.admin.password", "");

        assertThatThrownBy(() -> validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.admin.password is missing");
    }

    @Test
    void aggregatesEveryViolationIntoOneMessage() {
        MockEnvironment environment = validProductionEnvironment()
                .withProperty("spring.datasource.password", "secretpassword")
                .withProperty("spring.security.oauth2.client.registration.google.client-secret", "dummy-google-client-secret")
                .withProperty("app.admin.password", "change-me");

        assertThatThrownBy(() -> validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.datasource.password")
                .hasMessageContaining("google OAuth client-secret")
                .hasMessageContaining("app.admin.password");
    }
}
