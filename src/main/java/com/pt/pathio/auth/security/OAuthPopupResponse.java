package com.pt.pathio.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Shared writer for the OAuth popup's {@code postMessage} handshake. Both the success and the
 * failure handler emit the same HTML shape: an allow-list of targeted origins (never {@code '*'})
 * and a JSON message, followed by {@code window.close()}.
 */
public final class OAuthPopupResponse {

    private OAuthPopupResponse() {
    }

    public static void write(
            HttpServletResponse response,
            ObjectMapper objectMapper,
            List<String> authorizedOrigins,
            Map<String, Object> messagePayload,
            int status
    ) throws IOException {
        response.setStatus(status);
        response.setContentType("text/html");
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Pragma", "no-cache");

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