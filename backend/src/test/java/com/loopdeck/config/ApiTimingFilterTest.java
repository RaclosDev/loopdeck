package com.loopdeck.config;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;
import static org.junit.jupiter.api.Assertions.*;

class ApiTimingFilterTest {
    @Test void logsOnlyTheRouteTemplateAndAlwaysRemovesTheCorrelationContext() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(ApiTimingFilter.class);
        ListAppender<ILoggingEvent> events = new ListAppender<>(); events.start(); logger.addAppender(events);
        try {
            var request = new MockHttpServletRequest("GET", "/api/decks/private-deck/notes/page");
            request.setQueryString("search=private-content");
            request.addHeader("Authorization", "Bearer private-token");
            var response = new MockHttpServletResponse();
            new ApiTimingFilter(0).doFilter(request, response, (req, res) ->
                req.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/decks/{deckId}/notes/page"));
            String event = events.list.get(0).getFormattedMessage();
            assertTrue(event.contains("route=/api/decks/{deckId}/notes/page"));
            assertFalse(event.contains("private-"));
            assertNotNull(response.getHeader("X-Request-ID"));
            assertNull(MDC.get("requestId"));
        } finally { logger.detachAppender(events); events.stop(); }
    }
}
