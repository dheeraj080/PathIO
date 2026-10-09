package com.pt.pathio.filter;

import io.micrometer.tracing.Tracer;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

/**
 * Filter that attaches the active OpenTelemetry/Micrometer traceId to the HTTP response header
 * and ensures MDC contains the traceId for consistent structured logging.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class TraceCorrelationFilter implements Filter {

    private final Optional<Tracer> tracer;

    public static final String TRACE_HEADER = "X-Trace-Id";
    public static final String MDC_TRACE_ID = "traceId";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        if (request instanceof HttpServletRequest httpRequest && response instanceof HttpServletResponse httpResponse) {
            String traceId = getOrCreateTraceId(httpRequest);

            // Populate MDC for logging if missing
            if (MDC.get(MDC_TRACE_ID) == null) {
                MDC.put(MDC_TRACE_ID, traceId);
            }

            // Expose traceId in the response headers for client/frontend debugging
            httpResponse.setHeader(TRACE_HEADER, traceId);

            try {
                chain.doFilter(request, response);
            } finally {
                MDC.remove(MDC_TRACE_ID);
            }
        } else {
            chain.doFilter(request, response);
        }
    }

    private String getOrCreateTraceId(HttpServletRequest request) {
        // 1. Check if Tracer has an active span
        if (tracer.isPresent() && tracer.get().currentSpan() != null) {
            String currentTraceId = tracer.get().currentSpan().context().traceId();
            if (currentTraceId != null && !currentTraceId.isBlank()) {
                return currentTraceId;
            }
        }

        // 2. Check incoming header
        String headerTraceId = request.getHeader(TRACE_HEADER);
        if (headerTraceId != null && !headerTraceId.isBlank()) {
            return headerTraceId.trim();
        }

        // 3. Fallback to generated UUID
        return UUID.randomUUID().toString().replace("-", "");
    }
}
