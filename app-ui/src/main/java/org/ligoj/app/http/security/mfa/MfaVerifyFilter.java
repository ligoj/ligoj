package org.ligoj.app.http.security.mfa;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Objects;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.ObjectMapper;

/**
 * Second factor endpoint of the front-end: <code>GET /login/mfa</code> lists the devices the user can choose from
 * (recorded by the success handler), <code>GET /login/mfa/passkey</code> relays the passkey request options,
 * <code>POST /login/mfa</code> (a code and optional device, or a passkey assertion, as form parameters or a JSON
 * body) checks it against the API for the authenticated user, clears the pending state on success, counts the
 * failures and invalidates the session after too many of them.
 */
@Slf4j
@RequiredArgsConstructor
public class MfaVerifyFilter extends OncePerRequestFilter {

	/**
	 * Failed verifications ending the session.
	 */
	static final int MAX_ATTEMPTS = 5;

	private final MfaClient client;
	private final String usernameOAuth2Attribute;
	private final ObjectMapper mapper = new ObjectMapper();

	@Override
	protected boolean shouldNotFilter(final HttpServletRequest request) {
		final var path = MfaSupport.path(request);
		final var method = request.getMethod();
		return !(("POST".equalsIgnoreCase(method) || "GET".equalsIgnoreCase(method)) && MfaSupport.VERIFY_PATH.equals(path)
				|| "GET".equalsIgnoreCase(method) && MfaSupport.PASSKEY_PATH.equals(path));
	}

	@Override
	protected void doFilterInternal(final HttpServletRequest request, final HttpServletResponse response,
			final FilterChain filterChain) throws ServletException, IOException {
		final var authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !authentication.isAuthenticated()
				|| authentication instanceof AnonymousAuthenticationToken) {
			write(response, HttpServletResponse.SC_UNAUTHORIZED, "{\"code\":\"unauthorized\"}");
			return;
		}
		final var session = request.getSession(false);
		final var user = MfaSupport.userName(authentication, usernameOAuth2Attribute);
		if (MfaSupport.PASSKEY_PATH.equals(MfaSupport.path(request))) {
			// Passkey request options, only while pending
			if (session == null || !MfaSupport.isPending(request)) {
				response.setStatus(HttpServletResponse.SC_NO_CONTENT);
				return;
			}
			final var options = client.passkeyChallenge(user);
			if (options == null) {
				write(response, HttpServletResponse.SC_SERVICE_UNAVAILABLE, "{\"code\":\"mfa-unavailable\"}");
			} else {
				write(response, HttpServletResponse.SC_OK, options);
			}
			return;
		}
		if ("GET".equalsIgnoreCase(request.getMethod())) {
			// The devices to choose from, for the MFA page
			final var devices = session == null ? null : (String) session.getAttribute(MfaSupport.ATTRIBUTE_DEVICES);
			write(response, HttpServletResponse.SC_OK, "{\"pending\":" + MfaSupport.isPending(request) + ",\"devices\":"
					+ Objects.requireNonNullElse(devices, "[]") + "}");
			return;
		}
		if (session == null || !MfaSupport.isPending(request)) {
			// Nothing pending: already verified, or not required
			response.setStatus(HttpServletResponse.SC_NO_CONTENT);
			return;
		}
		final var input = readInput(request);
		final var code = Objects.toString(input.get("code"), null);
		final var passkey = input.get("passkey");
		if (StringUtils.isBlank(code) && !(passkey instanceof Map)) {
			write(response, HttpServletResponse.SC_BAD_REQUEST, "{\"code\":\"mfa-code-required\"}");
			return;
		}
		final var verified = passkey instanceof Map<?, ?> assertion ? client.verifyPasskey(user, mapper.writeValueAsString(assertion))
				: client.verify(user, code, toDevice(input.get("device")));
		if (verified) {
			session.removeAttribute(MfaSupport.ATTRIBUTE_PENDING);
			session.removeAttribute(MfaSupport.ATTRIBUTE_ATTEMPTS);
			session.removeAttribute(MfaSupport.ATTRIBUTE_DEVICES);
			log.info("Second factor verified for {}", user);
			response.setStatus(HttpServletResponse.SC_NO_CONTENT);
			return;
		}
		final var attempts = Objects.requireNonNullElse((Integer) session.getAttribute(MfaSupport.ATTRIBUTE_ATTEMPTS), 0) + 1;
		if (attempts >= MAX_ATTEMPTS) {
			log.warn("Second factor failed {} times for {}, session ended", attempts, user);
			session.invalidate();
			SecurityContextHolder.clearContext();
			write(response, HttpServletResponse.SC_UNAUTHORIZED, "{\"code\":\"mfa-locked\"}");
			return;
		}
		session.setAttribute(MfaSupport.ATTRIBUTE_ATTEMPTS, attempts);
		write(response, HttpServletResponse.SC_UNAUTHORIZED,
				"{\"code\":\"mfa-invalid\",\"remaining\":" + (MAX_ATTEMPTS - attempts) + "}");
	}

	/**
	 * Read the code and the optional device: form parameters, or a JSON body.
	 */
	@SuppressWarnings("unchecked")
	private Map<String, Object> readInput(final HttpServletRequest request) throws IOException {
		if (StringUtils.isNotBlank(request.getParameter("code"))) {
			final var input = new java.util.HashMap<String, Object>();
			input.put("code", request.getParameter("code"));
			input.put("device", request.getParameter("device"));
			return input;
		}
		if (request.getContentType() != null && request.getContentType().contains(MediaType.APPLICATION_JSON_VALUE)) {
			final var body = IOUtils.toString(request.getInputStream(), StandardCharsets.UTF_8);
			if (StringUtils.isNotBlank(body)) {
				return mapper.readValue(body, Map.class);
			}
		}
		return Map.of();
	}

	private Integer toDevice(final Object value) {
		if (value == null || StringUtils.isBlank(value.toString())) {
			return null;
		}
		try {
			return Integer.valueOf(value.toString());
		} catch (final NumberFormatException e) {
			return null;
		}
	}

	private void write(final HttpServletResponse response, final int status, final String json) throws IOException {
		response.setStatus(status);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.getWriter().write(json);
	}
}
