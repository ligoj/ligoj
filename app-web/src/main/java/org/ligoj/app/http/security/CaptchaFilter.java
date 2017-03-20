package org.ligoj.app.http.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.apache.commons.lang3.StringUtils;

import lombok.extern.slf4j.Slf4j;
import nl.captcha.Captcha;

/**
 * Filter checking the CAPTCHA data provided in the "captcha" parameter.
 */
@Slf4j
public class CaptchaFilter implements Filter {
	public static final String CAPTCHA_HEADER = "captcha";

	@Override
	public void init(final FilterConfig filterConfig) throws ServletException {
		// Nothing to do
	}

	@Override
	public void doFilter(final ServletRequest request, final ServletResponse response, final FilterChain chain) throws IOException, ServletException {
		final HttpServletRequest httpServletRequest = (HttpServletRequest) request;
		final HttpSession session = httpServletRequest.getSession(false);
		final Captcha captcha = session == null ? null : (Captcha) session.getAttribute(Captcha.NAME);
		if (captcha == null) {
			// No session -> no CAPTCHA to match
			log.info("No configured for this session");
			fail(response, "session", "null");
		} else {
			session.removeAttribute(Captcha.NAME);
			if (captcha.isCorrect(StringUtils.trimToEmpty(httpServletRequest.getHeader(CAPTCHA_HEADER)))) {
				chain.doFilter(request, response);
			} else {
				// CAPTCHA does not match -> the CAPTCHA must be regenerated.
				log.info("Invalid captcha received from " + httpServletRequest.getRemoteHost() + " '" + request.getParameter(CAPTCHA_HEADER)
						+ "' instead of " + captcha.getAnswer());
				fail(response, "captcha", "invalid");
			}
		}
	}

	/**
	 * Catch security failed somewhere.
	 */
	private void fail(final ServletResponse response, final String key, final String value) throws IOException {
		final HttpServletResponse httpResponse = (HttpServletResponse) response;
		httpResponse.setStatus(HttpServletResponse.SC_BAD_REQUEST);
		httpResponse.setCharacterEncoding(StandardCharsets.UTF_8.name());
		httpResponse.setContentType("application/json");
		httpResponse.getOutputStream().write((String.format("{\"errors\":{\"%s\":\"%s\"}}", key, value)).getBytes(StandardCharsets.UTF_8));
	}

	@Override
	public void destroy() {
		// Nothing to do
	}

}