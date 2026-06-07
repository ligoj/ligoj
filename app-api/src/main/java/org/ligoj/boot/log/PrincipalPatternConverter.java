/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.boot.log;

import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.config.plugins.Plugin;
import org.apache.logging.log4j.core.pattern.ConverterKeys;
import org.apache.logging.log4j.core.pattern.LogEventPatternConverter;
import org.apache.logging.log4j.core.pattern.PatternConverter;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Log4j2 pattern converter appending the current principal identifier: the <code>%principal</code> token usable in
 * any <code>PatternLayout</code>. The principal is read lazily, at log time, from the Spring Security context
 * attached to the logging thread — no MDC plumbing is required. Unauthenticated and non-request threads (background
 * tasks, schedulers, boot sequence) are rendered as <code>-</code>.
 * <p>
 * This plugin is discovered through the <code>Log4j2Plugins.dat</code> descriptor generated at build time — no
 * configuration attribute is required.
 */
@Plugin(name = "PrincipalPatternConverter", category = PatternConverter.CATEGORY)
@ConverterKeys({ "principal" })
public final class PrincipalPatternConverter extends LogEventPatternConverter {

	/**
	 * Stateless singleton: the converter only reads the thread's security context.
	 */
	private static final PrincipalPatternConverter INSTANCE = new PrincipalPatternConverter();

	private PrincipalPatternConverter() {
		super("Principal", "principal");
	}

	/**
	 * Return the converter instance. Called by Log4j2 when the <code>%principal</code> token is used.
	 *
	 * @param options The unused converter options.
	 * @return The singleton instance.
	 */
	public static PrincipalPatternConverter newInstance(final String[] options) {
		return INSTANCE;
	}

	@Override
	public void format(final LogEvent event, final StringBuilder toAppendTo) {
		final var authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || authentication instanceof AnonymousAuthenticationToken) {
			toAppendTo.append('-');
		} else {
			toAppendTo.append(authentication.getName());
		}
	}
}
