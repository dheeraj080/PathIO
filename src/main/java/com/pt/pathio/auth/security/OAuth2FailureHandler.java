package com.pt.pathio.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class OAuth2FailureHandler implements AuthenticationFailureHandler {

    private final ObjectMapper objectMapper;
    private final List<String> authorizedOrigins;

    public OAuth2FailureHandler(
            ObjectMapper objectMapper,
            @Value("${app.oauth2.authorized-origins:${app.cors.allowed-origins:http://localhost:3000,http://localhost:3001}}") String authorizedOriginsStr
    ) {
        this.objectMapper = objectMapper;
        this.authorizedOrigins = Arrays.stream(authorizedOriginsStr.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException, ServletException {
        log.error("OAuth2 authentication failure: {}", exception.getMessage());

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("text/html");

        Map<String, Object> messagePayload = Map.of(
                "type", "OAUTH_AUTH_FAILURE",
                "error", "Authentication failed"
        );
        String payloadJson = objectMapper.writeValueAsString(messagePayload);
        String originsJson = objectMapper.writeValueAsString(authorizedOrigins);

        String html = "<!DOCTYPE html><html><body><script>"
                + "const allowedOrigins = " + originsJson + ";"
                + "const message = " + payloadJson + ";"
                + "if (window.opener) {"
                + "  allowedOrigins.forEach(origin => {"
                + "    try { window.opener.postMessage(message, origin); } catch (e) {}"
                + "  });"
                + "}"
                + "window.close();"
                + "</script></body></html>";

        response.getWriter().write(html);
    }
}
