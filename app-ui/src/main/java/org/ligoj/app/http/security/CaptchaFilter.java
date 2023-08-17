/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import cn.apiclub.captcha.Captcha;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.filter.GenericFilterBean;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Filter checking the CAPTCHA data provided in the "captcha" parameter.
 */
@Slf4j
public class CaptchaFilter extends GenericFilterBean {
	public static final String CAPTCHA_HEADER = "captcha";

	@Override
	public void doFilter(final ServletRequest request, final ServletResponse response, final FilterChain chain) throws IOException, ServletException {
		final var httpServletRequest = (HttpServletRequest) request;
		final var session = httpServletRequest.getSession(false);
		final var captcha = session == null ? null : (Captcha) session.getAttribute(Captcha.NAME);
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
				log.info("Invalid captcha received from {} '{}' instead of {}", httpServletRequest.getRemoteHost(),
						request.getParameter(CAPTCHA_HEADER), captcha.getAnswer());
				fail(response, CAPTCHA_HEADER, "invalid");
			}
		}
	}

	/**
	 * Catch security failed somewhere.
	 */
	private void fail(final ServletResponse response, final String key, final String value) throws IOException {
		final var httpResponse = (HttpServletResponse) response;
		httpResponse.setStatus(HttpServletResponse.SC_BAD_REQUEST);
		httpResponse.setCharacterEncoding(StandardCharsets.UTF_8.name());
		httpResponse.setContentType("application/json");
		httpResponse.getOutputStream().write((String.format("{\"errors\":{\"%s\":\"%s\"}}", key, value)).getBytes(StandardCharsets.UTF_8));
	}

}