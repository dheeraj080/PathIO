package com.pt.pathio.shared.config;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Fail-fast guard for production deployments.
 *
 * <p>The base configuration intentionally ships with permissive local-development fallbacks: a
 * well-known database password and {@code dummy-*} OAuth client registrations. Those defaults are
 * convenient locally but must never reach a real runtime, where they would leave the database
 * weakly protected and OAuth sign-in silently broken.</p>
 *
 * <p>When the {@code prod} profile is active this component runs early in the bean lifecycle,
 * collects <em>every</em> unsafe setting, and aborts startup with a single actionable message
 * instead of failing on the first problem. The JWT signing secret is deliberately not re-checked
 * here: {@code JwtService} already refuses to start without a strong, non-placeholder secret in
 * every non-dev profile.</p>
 */
@Component
@Profile("prod")
public class ProductionConfigurationValidator implements InitializingBean {

    private static final Set<String> INSECURE_DATABASE_PASSWORDS =
            Set.of("secretpassword", "password", "postgres", "changeme", "change-me");

    private static final Set<String> INSECURE_ADMIN_PASSWORDS =
            Set.of("change-me", "changeme", "admin", "password", "admin12345");

    private static final int MIN_ADMIN_PASSWORD_LENGTH = 12;

    private final Environment environment;

    public ProductionConfigurationValidator(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void afterPropertiesSet() {
        List<String> violations = new ArrayList<>();

        validateDatabasePassword(violations);
        validateOAuthRegistration(violations, "google");
        validateOAuthRegistration(violations, "github");
        validateAdminAccount(violations);

        if (!violations.isEmpty()) {
            throw new IllegalStateException(
                    "Refusing to start with the 'prod' profile because the configuration is unsafe for "
                            + "production. Fix the following and restart:\n - "
                            + String.join("\n - ", violations));
        }
    }

    private void validateDatabasePassword(List<String> violations) {
        String password = environment.getProperty("spring.datasource.password");
        if (password == null || password.isBlank()) {
            violations.add("spring.datasource.password (DB_PASSWORD) is missing; set a strong database password.");
        } else if (INSECURE_DATABASE_PASSWORDS.contains(password.trim().toLowerCase(Locale.ROOT))) {
            violations.add("spring.datasource.password (DB_PASSWORD) is a known development default; "
                    + "set a strong, unique database password.");
        }
    }

    private void validateOAuthRegistration(List<String> violations, String provider) {
        String base = "spring.security.oauth2.client.registration." + provider + ".";
        if (isPlaceholder(environment.getProperty(base + "client-id"))) {
            violations.add(provider + " OAuth client-id is missing or still a placeholder value; "
                    + "register a real OAuth application.");
        }
        if (isPlaceholder(environment.getProperty(base + "client-secret"))) {
            violations.add(provider + " OAuth client-secret is missing or still a placeholder value; "
                    + "register a real OAuth application.");
        }
    }

    private void validateAdminAccount(List<String> violations) {
        String email = environment.getProperty("app.admin.email");
        String password = environment.getProperty("app.admin.password");

        boolean emailSet = email != null && !email.isBlank();
        boolean passwordSet = password != null && !password.isBlank();

        if (!emailSet && !passwordSet) {
            // No local administrator is provisioned; OAuth-only operation is a valid deployment.
            return;
        }
        if (!emailSet) {
            violations.add("app.admin.password is set but app.admin.email is missing; "
                    + "set both to provision the administrator or neither to skip it.");
            return;
        }
        if (!passwordSet) {
            violations.add("app.admin.email is set but app.admin.password is missing; "
                    + "set both to provision the administrator or neither to skip it.");
            return;
        }
        if (INSECURE_ADMIN_PASSWORDS.contains(password.trim().toLowerCase(Locale.ROOT))) {
            violations.add("app.admin.password is a known development default; choose a strong, unique password.");
        } else if (password.length() < MIN_ADMIN_PASSWORD_LENGTH) {
            violations.add("app.admin.password must be at least " + MIN_ADMIN_PASSWORD_LENGTH + " characters.");
        }
    }

    private static boolean isPlaceholder(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.startsWith("dummy") || normalized.startsWith("your-") || normalized.startsWith("change");
    }
}
