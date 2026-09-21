# PathIO — Spring Boot Security & Architecture Audit Report

**Date:** 2026-09-21 | **Auditor:** Senior Java & Spring Boot Security Architect
**Spring Boot Version:** 4.1.1 | **Java Target:** 27 | **Application:** URL Shortener Monolith

---

## Executive Summary

The PathIO application is a well-structured URL shortener with a thoughtful multi-level caching architecture (L1 Caffeine → L2 Redis → PostgreSQL). The core business logic is solid, but the audit uncovered **4 Critical**, **5 High**, **6 Medium**, and **4 Low** severity issues across security, architecture, and performance domains. The most urgent issues involve plaintext credentials in tracked config files, missing Spring Security entirely, and unvalidated open-redirect exposure.

---

## Issue Summary Table

| Severity | Count | Categories |
|----------|-------|------------|
| 🔴 Critical | 4 | Credentials, Open Redirect, Missing Auth, DDL-Auto |
| 🟠 High | 5 | IP Spoofing, CORS, No Error Handler, Timing Attack, @Async broken |
| 🟡 Medium | 6 | Redis Stream growth, WAL path traversal, H2 scope, DevTools, Consumer name, Logging |
| 🟢 Low | 4 | ShortCode log leak, Nginx config, Missing Kafka, Zero test coverage |

---

## 🔴 CRITICAL

---

### CRIT-01 — Plaintext Credentials Committed to Source Control

**Files:**
- [`application.properties` L13](file:///d:/Projeckt/path/PathIO/src/main/resources/application.properties#L13)
- [`application.properties` L30](file:///d:/Projeckt/path/PathIO/src/main/resources/application.properties#L30)
- [`application.properties` L44](file:///d:/Projeckt/path/PathIO/src/main/resources/application.properties#L44)
- [`application.properties` L54](file:///d:/Projeckt/path/PathIO/src/main/resources/application.properties#L54)
- [`docker-compose.yml` L9](file:///d:/Projeckt/path/PathIO/docker-compose.yml#L9)

**Evidence:**
```properties
spring.datasource.password=shortener_pass               # L13 — DB password
clickhouse.datasource.password=clickhouse               # L30 — ClickHouse password
app.keygen.secret-key=9876543210987654                  # L44 — Feistel cipher master key
cloudflare.edge-secret-token=super-secure-edge-shared-secret-key-2026  # L54 — Edge auth token
```
```yaml
POSTGRES_PASSWORD: shortener_pass    # docker-compose.yml L9
```

**Impact:** All secrets are likely committed to Git history. The `app.keygen.secret-key` directly controls the Feistel cipher — anyone with this key can reconstruct any `shortCode` from a sequential ID, fully breaking the obfuscation scheme. The Cloudflare edge token allows arbitrary telemetry injection.

**Fix — Use environment variable substitution:**
```properties
# application.properties (safe baseline — no real secrets)
spring.datasource.password=${DB_PASSWORD}
clickhouse.datasource.password=${CLICKHOUSE_PASSWORD}
app.keygen.secret-key=${KEYGEN_SECRET}
cloudflare.edge-secret-token=${CF_EDGE_SECRET}
```
```yaml
# docker-compose.yml — source from .env (add .env to .gitignore)
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```
Consider adopting **Spring Cloud Vault** or **AWS Secrets Manager** for production.

---

### CRIT-02 — No Spring Security — Zero Authentication or Authorization

**File:** No `SecurityConfig.java` exists anywhere in the project. No `spring-boot-starter-security` in [`pom.xml`](file:///d:/Projeckt/path/PathIO/pom.xml).

**Impact:**
- `POST /api/v1/urls/shorten` — creates short links for anyone, no auth
- `POST /api/v1/telemetry` — protected only by a hardcoded header token (see CRIT-01)
- Spring Boot Actuator endpoints (if added later) — fully unprotected

**Fix — Add Spring Security and a minimal `SecurityConfig`:**
```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.ignoringRequestMatchers("/api/v1/telemetry"))
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/{shortCode:[a-zA-Z0-9]{1,10}}").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/telemetry").permitAll()
                .requestMatchers("/api/v1/urls/**").authenticated()
                .anyRequest().denyAll()
            )
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .build();
    }
}
```

---

### CRIT-03 — Open Redirect Vulnerability

**File:** [`RedirectController.java` L58](file:///d:/Projeckt/path/PathIO/src/main/java/com/path/pathio/controller/RedirectController.java#L58)

**Evidence:**
```java
return ResponseEntity.status(HttpStatus.FOUND)
    .location(URI.create(targetUrlOpt.get()))  // raw DB value passed directly to Location header
    .build();
```

An unauthenticated user can store `javascript:alert(1)`, `data:text/html,...`, or a phishing URL. Browsers will blindly follow the `302 Location` header.

**Fix — Validate the scheme before redirecting:**
```java
private static final Set<String> ALLOWED_SCHEMES = Set.of("http", "https");

// Inside handleRedirect():
String targetUrl = targetUrlOpt.get();
try {
    URI uri = URI.create(targetUrl);
    if (uri.getScheme() == null || !ALLOWED_SCHEMES.contains(uri.getScheme().toLowerCase())) {
        return ResponseEntity.badRequest().build();
    }
} catch (IllegalArgumentException e) {
    return ResponseEntity.badRequest().build();
}
// ... proceed with redirect
```

---

### CRIT-04 — `spring.jpa.hibernate.ddl-auto=update` in Production Config

**File:** [`application.properties` L21](file:///d:/Projeckt/path/PathIO/src/main/resources/application.properties#L21)

**Evidence:**
```properties
spring.jpa.hibernate.ddl-auto=update
```

`update` allows Hibernate to silently alter production table schemas at startup — adding/dropping columns, widening types. This can cause **irreversible data loss** and **outages**.

**Fix — Use `validate` + Flyway for controlled migrations:**
```properties
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
```
```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
```

---

## 🟠 HIGH

---

### HIGH-01 — IP Spoofing via Unauthenticated `X-Forwarded-For` Header

**File:** [`RateLimitingFilter.java` L70–L74](file:///d:/Projeckt/path/PathIO/src/main/java/com/path/pathio/gateway/RateLimitingFilter.java#L70)

**Evidence:**
```java
String xfHeader = request.getHeader("X-Forwarded-For");
if (xfHeader != null && !xfHeader.isEmpty()) {
    return xfHeader.split(",")[0].trim();  // attacker-controlled
}
```

Any client can send `X-Forwarded-For: 1.2.3.4` to bypass per-IP rate limiting entirely, nullifying both the write limit (10 req/min) and read limit (1000 req/s).

**Fix — Only trust the header from known proxy IPs:**
```java
private static final Set<String> TRUSTED_PROXIES = Set.of("10.0.0.1", "172.16.0.1");

private String extractClientIp(HttpServletRequest request) {
    String remoteAddr = request.getRemoteAddr();
    if (TRUSTED_PROXIES.contains(remoteAddr)) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isEmpty()) {
            return xfHeader.split(",")[0].trim();
        }
    }
    return remoteAddr;
}
```
Or configure `server.forward-headers-strategy=NATIVE` with Spring's `ForwardedHeaderFilter`.

---

### HIGH-02 — Missing CORS Configuration

**File:** No `CorsConfigurationSource` bean exists anywhere in the project.

**Impact:** Without an explicit CORS policy, browser-based clients are either blocked entirely or the policy is undefined — making the API unusable in a browser context and leaving door open for Cross-Site request abuse.

**Fix — Declare an explicit CORS policy in `SecurityConfig`:**
```java
@Bean
CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("https://your-frontend.example.com"));
    config.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
    config.setAllowedHeaders(List.of("Content-Type", "Authorization"));
    config.setMaxAge(3600L);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

---

### HIGH-03 — Timing Attack on Telemetry Shared Secret Comparison

**File:** [`TelemetryController.java` L34](file:///d:/Projeckt/path/PathIO/src/main/java/com/path/pathio/controller/TelemetryController.java#L34)

**Evidence:**
```java
if (authToken == null || !authToken.equals(edgeSecretToken)) { ... }
```

`String.equals()` short-circuits on the first mismatch — an attacker can use response latency to guess the shared secret byte-by-byte.

**Fix — Use constant-time comparison:**
```java
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

private boolean isTokenValid(String provided, String expected) {
    if (provided == null) return false;
    return MessageDigest.isEqual(
        provided.getBytes(StandardCharsets.UTF_8),
        expected.getBytes(StandardCharsets.UTF_8)
    );
}
// Usage:
if (!isTokenValid(authToken, edgeSecretToken)) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
}
```

---

### HIGH-04 — No Global Exception Handler (`@ControllerAdvice`)

**File:** No `GlobalExceptionHandler.java` exists in the project.

**Impact:** Unhandled exceptions (from `FeistelCipher.obfuscate()`, Redis failures, etc.) fall through to Spring's default `BasicErrorController`, which leaks internal stack traces and class names in JSON error responses.

**Fix:**
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(new ErrorResponse("VALIDATION_ERROR", message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        // Never expose ex.getMessage() to the client
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred."));
    }

    public record ErrorResponse(String code, String message) {}
}
```

---

### HIGH-05 — `@Async` on `CloudflareSyncService` Without `@EnableAsync`

**File:** [`CloudflareSyncService.java` L34](file:///d:/Projeckt/path/PathIO/src/main/java/com/path/pathio/gateway/CloudflareSyncService.java#L34)

**Evidence:**
```java
@Async
public void syncToEdgeKv(String shortCode, String originalUrl) { ... }
```

`@Async` is silently **ignored** without `@EnableAsync`. This means `syncToEdgeKv()` runs **synchronously on the request thread** — adding the full Cloudflare API HTTP roundtrip (~100–500ms) to every `POST /shorten`. Similarly, `@Scheduled` in `AnalyticsConsumer` requires `@EnableScheduling`.

**Fix:**
```java
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class PathIoApplication { ... }
```
Also configure a dedicated executor for async tasks to avoid the SimpleAsyncTaskExecutor default:
```java
@Bean(name = "cloudflareTaskExecutor")
public Executor cloudflareTaskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(2);
    executor.setMaxPoolSize(10);
    executor.setQueueCapacity(100);
    executor.setThreadNamePrefix("cf-sync-");
    executor.initialize();
    return executor;
}
```

---

## 🟡 MEDIUM

---

### MED-01 — Unbound Redis Stream Growth (No `MAXLEN` Trim)

**File:** [`AnalyticsProducer.java` L33](file:///d:/Projeckt/path/PathIO/src/main/java/com/path/pathio/analytics/AnalyticsProducer.java#L33)

**Evidence:**
```java
redisTemplate.opsForStream().add(record);  // No MAXLEN trim
```

At 1000 req/s the stream grows unbounded, consuming all 512MB of Redis memory and triggering `allkeys-lru` eviction — which will start evicting cached URL mappings, causing cascading DB load.

**Fix — Add approximate MAXLEN trimming (O(1) cost):**
```java
// Use the XADD MAXLEN ~ 1000000 form via RedisCallback
redisTemplate.execute((RedisCallback<Object>) conn -> {
    conn.streamCommands().xAdd(
        MapRecord.create(STREAM_KEY.getBytes(), body),
        XAddOptions.maxlen(1_000_000).approximateTrimming()
    );
    return null;
});
```

---

### MED-02 — WAL Path Traversal Risk & OOM on Large Files

**File:** [`StorageEngine.java` L14, L45](file:///d:/Projeckt/path/PathIO/src/main/java/com/path/pathio/logging/StorageEngine.java#L14)

**Evidence:**
```java
public StorageEngine(String walPath) throws IOException { ... }  // walPath is caller-controlled
ByteBuffer buffer = ByteBuffer.allocate((int) channel.size()); // OOM if file > 2GB
```

The `walPath` is not validated. A traversal like `../../etc/passwd` is accepted. Additionally, reading the entire WAL file into a single `ByteBuffer` will throw `OutOfMemoryError` for large logs.

**Fix:**
```java
// Path validation
Path base = Paths.get("/var/app/wal").toAbsolutePath();
Path resolved = base.resolve(walPath).normalize();
if (!resolved.startsWith(base)) {
    throw new SecurityException("Path traversal detected: " + walPath);
}

// Chunked read instead of full-file allocation
ByteBuffer buffer = ByteBuffer.allocate(64 * 1024); // 64KB chunks
while (channel.read(buffer) > 0) {
    buffer.flip();
    // process buffer...
    buffer.compact();
}
```

---

### MED-03 — H2 Database in `runtime` Scope — Present in Production JAR

**File:** [`pom.xml` L52–L55](file:///d:/Projeckt/path/PathIO/pom.xml#L52)

**Evidence:**
```xml
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>  <!-- Bundled into production fat JAR -->
</dependency>
```

Combined with `ddl-auto=update` (CRIT-04), a misconfigured datasource URL would silently fall back to H2 in-memory mode, losing all data invisibly. The H2 web console at `/h2-console` is also a potential attack surface.

**Fix:**
```xml
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>
```
```properties
spring.h2.console.enabled=false
```

---

### MED-04 — `spring-boot-devtools` in `runtime` Scope

**File:** [`pom.xml` L57–L62](file:///d:/Projeckt/path/PathIO/pom.xml#L57)

**Evidence:**
```xml
<scope>runtime</scope>   <!-- Disables caches, enables class reloading -->
```

DevTools disables template caching, triggers class restart, and exposes remote restart capabilities — all of which are dangerous in production pipelines (e.g., `mvn spring-boot:run` in CI/CD).

**Fix:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>test</scope>
    <optional>true</optional>
</dependency>
```

---

### MED-05 — Hardcoded Consumer Name Breaks Multi-Instance Deployments

**File:** [`AnalyticsConsumer.java` L22](file:///d:/Projeckt/path/PathIO/src/main/java/com/path/pathio/analytics/AnalyticsConsumer.java#L22)

**Evidence:**
```java
private static final String CONSUMER_NAME = "worker_node_1";
```

All application instances behind a load balancer register as the same Redis Stream consumer, causing double-consumption or message loss and breaking exactly-once delivery.

**Fix:**
```java
// Unique per JVM instance
private static final String CONSUMER_NAME =
    System.getenv().getOrDefault("POD_NAME", "worker_" + UUID.randomUUID().toString().substring(0, 8));
```

---

### MED-06 — Raw `System.out` / `System.err` in Production Code

**File:** [`StorageEngine.java` L62–L67](file:///d:/Projeckt/path/PathIO/src/main/java/com/path/pathio/logging/StorageEngine.java#L62)

**Evidence:**
```java
System.err.println("Truncated or partial write encountered...");
System.out.println("Recovery complete. Replayed " + recoveredCount + " records.");
```

Raw stdout/stderr bypasses SLF4J/Logback — messages won't appear in log aggregators (ELK, Splunk), won't carry MDC context, and can't be controlled by log level.

**Fix:**
```java
private static final Logger log = LoggerFactory.getLogger(StorageEngine.class);

log.warn("Truncated or partial WAL write at offset {}. Halting recovery.", buffer.position());
log.info("Recovery complete. Replayed {} records.", recoveredCount);
```

---

## 🟢 LOW

---

### LOW-01 — ShortCode Logged at INFO Level (Enumeration Risk)

**File:** [`CloudflareSyncService.java` L50](file:///d:/Projeckt/path/PathIO/src/main/java/com/path/pathio/gateway/CloudflareSyncService.java#L50)

**Evidence:**
```java
log.info("Successfully synced shortCode '{}' to Cloudflare KV Edge.", shortCode);
```

Every created short code is written to application logs, creating a machine-readable enumeration source.

**Fix:** Downgrade to `log.debug(...)` or omit the short code value entirely.

---

### LOW-02 — Nginx Config Missing `upstream` Block and HTTPS

**File:** [`ngnix.conf`](file:///d:/Projeckt/path/PathIO/ngnix.conf)

**Evidence:**
```nginx
proxy_pass http://monolith_backend;  # upstream 'monolith_backend' never defined — will fail to load
listen 80;                           # HTTP only, no TLS
```
Also missing `proxy_set_header X-Real-IP` and `X-Forwarded-For` directives (compounds HIGH-01).

**Fix:**
```nginx
upstream monolith_backend {
    server app:8080;
}
server {
    listen 443 ssl;
    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    location / {
        proxy_pass         http://monolith_backend;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   Host $host;
    }
}
```

---

### LOW-03 — Kafka Dependency in `pom.xml` Without Kafka in `docker-compose.yml`

**Files:** [`pom.xml` L89–L102](file:///d:/Projeckt/path/PathIO/pom.xml#L89), [`docker-compose.yml`](file:///d:/Projeckt/path/PathIO/docker-compose.yml)

**Evidence:** `spring-boot-starter-kafka` + `kafka-streams` are declared but no Kafka broker exists in docker-compose. The app will fail to start unless autoconfiguration is suppressed.

**Fix — Suppress if unused, or add broker:**
```java
// If Kafka is not yet used:
@SpringBootApplication(exclude = {KafkaAutoConfiguration.class, KafkaStreamAutoConfiguration.class})
```

---

### LOW-04 — Zero Test Coverage

**File:** [`PathIoApplicationTests.java`](file:///d:/Projeckt/path/PathIO/src/test/java/com/path/pathio/PathIoApplicationTests.java)

Only one auto-generated Spring context load test exists. No tests for:
- `UrlService` — cache hierarchy, expiry logic, negative lookaside
- `KeyGeneratorService` — segment exhaustion and concurrent access
- `FeistelCipher` — obfuscate/deobfuscate roundtrip correctness
- `RateLimiterService` — Lua script integration
- `RateLimitingFilter` — IP header extraction and spoofing prevention

**Recommendation:** Add `@MockBean` unit tests, `TestContainers` for Redis/Postgres integration tests, and MockMvc for controller tests. Target 70%+ line coverage.

---

## Architecture & Code Quality Summary

| Area | Status | Notes |
|------|--------|-------|
| Controller-Service-Repository Separation | ✅ Good | Clean layering throughout |
| RESTful Design | ⚠️ Partial | Missing `DELETE` and individual `GET` by short code |
| `@Transactional` Boundaries | ✅ Correct | `shortenUrl()` correctly transactional; read path non-transactional |
| `@ControllerAdvice` Error Handling | ❌ Missing | No global handler — see HIGH-04 |
| DTO / Domain Separation | ✅ Good | `UrlDtos` records used; entity not exposed in responses |
| Input Validation | ✅ Good | `@NotBlank`, `@URL`, `@Size` on `ShortenRequest` |
| N+1 Query Risk | ✅ None Found | Only single-entity lookups via `findByShortCode` |
| DB Index Coverage | ✅ Present | `@Index(unique = true)` on `short_code` column |
| HikariCP Pool Size | ⚠️ Oversized | `maximum-pool-size=50` with virtual threads — reduce to 10–20 |
| ClickHouse Connection Pool | ❌ Missing | `DataSourceBuilder` creates an unpooled `DriverManagerDataSource` |

---

## Performance Note — HikariCP Pool Size with Virtual Threads

**File:** [`application.properties` L7, L16](file:///d:/Projeckt/path/PathIO/src/main/resources/application.properties#L16)

```properties
spring.threads.virtual.enabled=true
spring.datasource.hikari.maximum-pool-size=50   # Too large for virtual threads
```

Virtual threads park when waiting for a JDBC connection, but PostgreSQL itself has a finite connection limit. The optimal HikariCP pool size for virtual-thread apps follows `(number of DB vCPUs * 2) + 1`, typically **10–20**, not 50. Over-provisioning causes lock contention inside PostgreSQL.

**Fix:**
```properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
```

Also, add HikariCP to the ClickHouse `DataSource` in [`ClickHouseConfig.java`](file:///d:/Projeckt/path/PathIO/src/main/java/com/path/pathio/config/ClickHouseConfig.java):
```java
@Bean(name = "clickHouseDataSource")
public DataSource clickHouseDataSource() {
    HikariConfig config = new HikariConfig();
    config.setJdbcUrl(url);
    config.setUsername(username);
    config.setPassword(password);
    config.setDriverClassName(driverClassName);
    config.setMaximumPoolSize(10);
    config.setPoolName("HikariCP-ClickHouse");
    return new HikariDataSource(config);
}
```

---

## Priority Remediation Roadmap

```
Week 1 — Critical (Stop the bleeding):
  [CRIT-01] Rotate ALL credentials, move to env vars / secrets manager, git-history scrub
  [CRIT-02] Add spring-boot-starter-security + SecurityConfig with stateless JWT/OAuth2
  [CRIT-03] Add scheme validation in RedirectController before issuing 302
  [CRIT-04] Switch ddl-auto to validate, adopt Flyway with versioned migrations

Week 2 — High (Harden the surface):
  [HIGH-01] Fix extractClientIp() to trust X-Forwarded-For only from known proxy IPs
  [HIGH-02] Add explicit CorsConfigurationSource with allowlist
  [HIGH-03] Replace String.equals() with MessageDigest.isEqual() in TelemetryController
  [HIGH-04] Add @RestControllerAdvice GlobalExceptionHandler
  [HIGH-05] Add @EnableAsync + @EnableScheduling to PathIoApplication

Week 3 — Medium (Correctness & stability):
  [MED-01] Add MAXLEN approximate trimming to Redis Stream producer
  [MED-02] Add path traversal check and chunked read in StorageEngine
  [MED-03] Move H2 to test scope; disable H2 console explicitly
  [MED-04] Remove or restrict devtools to test scope
  [MED-05] Use unique CONSUMER_NAME per instance (env var or UUID)
  [MED-06] Replace System.out/err with SLF4J in StorageEngine

Week 4 — Low + Testing (Build confidence):
  [LOW-02] Fix ngnix.conf upstream block, add TLS termination
  [LOW-03] Add Kafka to docker-compose or exclude KafkaAutoConfiguration
  [LOW-04] Build unit + integration test suite targeting 70%+ coverage
  Add ClickHouse HikariCP connection pool
  Tune HikariCP max-pool-size to (DB vCPUs * 2 + 1)
```
