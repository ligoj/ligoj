/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.log;

import java.util.List;

import org.apache.logging.log4j.core.impl.Log4jLogEvent;
import org.apache.logging.log4j.core.layout.PatternLayout;
import org.apache.logging.log4j.message.SimpleMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Test class of {@link PrincipalPatternConverter}
 */
class PrincipalPatternConverterTest {

	@AfterEach
	void cleanup() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void formatNoAuthentication() {
		final var buffer = new StringBuilder();
		PrincipalPatternConverter.newInstance(null).format(null, buffer);
		Assertions.assertEquals("-", buffer.toString());
	}

	@Test
	void formatAnonymous() {
		SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken("key", "anonymousUser",
				List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
		final var buffer = new StringBuilder();
		PrincipalPatternConverter.newInstance(null).format(null, buffer);
		Assertions.assertEquals("-", buffer.toString());
	}

	@Test
	void formatAuthenticated() {
		SecurityContextHolder.getContext()
				.setAuthentication(new UsernamePasswordAuthenticationToken("jdoe", "N/A"));
		final var buffer = new StringBuilder();
		PrincipalPatternConverter.newInstance(null).format(null, buffer);
		Assertions.assertEquals("jdoe", buffer.toString());
	}

	/**
	 * End-to-end Log4j2 plugin discovery: a real {@link PatternLayout} must resolve the <code>%principal</code>
	 * token to this converter — guards the plugin descriptor generation and the <code>packages</code> declaration of
	 * <code>log4j2.json</code>.
	 */
	@Test
	void patternLayoutResolvesPrincipal() {
		SecurityContextHolder.getContext()
				.setAuthentication(new UsernamePasswordAuthenticationToken("jdoe", "N/A"));
		final var layout = PatternLayout.newBuilder().setPattern("[%principal] %msg").build();
		final var event = Log4jLogEvent.newBuilder().setMessage(new SimpleMessage("hello")).build();
		Assertions.assertEquals("[jdoe] hello", layout.toSerializable(event));
	}
}
