package org.ligoj.app.http.security.mfa;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

/**
 * Test class of {@link MfaAuthenticationSuccessHandler}.
 */
class MfaAuthenticationSuccessHandlerTest {

	private final UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken("junit", "N/A",
			List.of(new SimpleGrantedAuthority("ROLE_USER")));

	private MockHttpServletRequest request() {
		final var request = new MockHttpServletRequest("POST", "/ligoj/login");
		request.setContextPath("/ligoj");
		return request;
	}

	@Test
	void notRequiredDelegates() throws Exception {
		final var client = mock(MfaClient.class);
		when(client.state("junit")).thenReturn(new MfaClient.MfaState(false, "[]"));
		final var delegate = mock(AuthenticationSuccessHandler.class);
		final var request = request();
		new MfaAuthenticationSuccessHandler(delegate, client, true, "email").onAuthenticationSuccess(request, new MockHttpServletResponse(), authentication);
		verify(delegate).onAuthenticationSuccess(any(), any(), any());
		Assertions.assertNull(request.getSession(false));
	}

	@Test
	void requiredRestStyle() throws Exception {
		final var client = mock(MfaClient.class);
		when(client.state("junit")).thenReturn(new MfaClient.MfaState(true, "[{\"id\":1}]"));
		final var delegate = mock(AuthenticationSuccessHandler.class);
		final var request = request();
		final var response = new MockHttpServletResponse();
		new MfaAuthenticationSuccessHandler(delegate, client, true, "email").onAuthenticationSuccess(request, response, authentication);
		verify(delegate, never()).onAuthenticationSuccess(any(), any(), any());
		Assertions.assertEquals(Boolean.TRUE, request.getSession().getAttribute(MfaSupport.ATTRIBUTE_PENDING));
		Assertions.assertEquals("[{\"id\":1}]", request.getSession().getAttribute(MfaSupport.ATTRIBUTE_DEVICES));
		// JSON payload read by the login page: success + the redirection to the MFA page
		Assertions.assertEquals(200, response.getStatus());
		Assertions.assertEquals("/ligoj/mfa.html", response.getHeader("x-redirect"));
		Assertions.assertTrue(response.getContentAsString().contains("\"success\":true"));
		Assertions.assertTrue(response.getContentAsString().contains("/ligoj/mfa.html"));
	}

	@Test
	void requiredRedirectStyleWithOidcName() throws Exception {
		final var client = mock(MfaClient.class);
		when(client.state("john@sample.com")).thenReturn(new MfaClient.MfaState(true, "[]"));
		final var delegate = mock(AuthenticationSuccessHandler.class);
		final var request = request();
		final var response = new MockHttpServletResponse();
		final var user = new DefaultOAuth2User(List.of(new SimpleGrantedAuthority("ROLE_USER")), Map.of("sub", "abc", "email", "john@sample.com"), "sub");
		final var oidc = new OAuth2AuthenticationToken(user, user.getAuthorities(), "keycloak");
		new MfaAuthenticationSuccessHandler(delegate, client, false, "email").onAuthenticationSuccess(request, response, oidc);
		Assertions.assertEquals("/ligoj/mfa.html", response.getRedirectedUrl());
		Assertions.assertEquals(Boolean.TRUE, request.getSession().getAttribute(MfaSupport.ATTRIBUTE_PENDING));
		// Without the attribute, the token name is used
		Assertions.assertEquals("abc", MfaSupport.userName(oidc, "missing"));
		Assertions.assertEquals("abc", MfaSupport.userName(oidc, ""));
	}

	@AfterEach
	void clean() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void notRequiredClearsStalePendingState() throws Exception {
		final var client = mock(MfaClient.class);
		when(client.state("junit")).thenReturn(new MfaClient.MfaState(false, "[]"));
		final var delegate = mock(AuthenticationSuccessHandler.class);
		final var request = request();
		// Left by a previous authentication of the same session
		final var session = request.getSession(true);
		session.setAttribute(MfaSupport.ATTRIBUTE_PENDING, Boolean.TRUE);
		session.setAttribute(MfaSupport.ATTRIBUTE_DEVICES, "[]");
		session.setAttribute(MfaSupport.ATTRIBUTE_ATTEMPTS, 2);
		new MfaAuthenticationSuccessHandler(delegate, client, false, "email").onAuthenticationSuccess(request, new MockHttpServletResponse(), authentication);
		verify(delegate).onAuthenticationSuccess(any(), any(), any());
		Assertions.assertNull(session.getAttribute(MfaSupport.ATTRIBUTE_PENDING));
		Assertions.assertNull(session.getAttribute(MfaSupport.ATTRIBUTE_DEVICES));
		Assertions.assertNull(session.getAttribute(MfaSupport.ATTRIBUTE_ATTEMPTS));
	}

	@Test
	void unavailableRedirectStyleRefusesLogin() throws Exception {
		final var client = mock(MfaClient.class);
		when(client.state("junit")).thenReturn(new MfaClient.MfaState(true, "[]", true));
		final var delegate = mock(AuthenticationSuccessHandler.class);
		final var request = request();
		request.getSession(true);
		SecurityContextHolder.getContext().setAuthentication(authentication);
		final var response = new MockHttpServletResponse();
		new MfaAuthenticationSuccessHandler(delegate, client, false, "email").onAuthenticationSuccess(request, response, authentication);
		verify(delegate, never()).onAuthenticationSuccess(any(), any(), any());
		// No MFA page without devices: the login is refused, the session is gone
		Assertions.assertEquals("/ligoj/login.html?unavailable", response.getRedirectedUrl());
		Assertions.assertNull(request.getSession(false));
		Assertions.assertNull(SecurityContextHolder.getContext().getAuthentication());
	}

	@Test
	void unavailableRestStyleRefusesLogin() throws Exception {
		final var client = mock(MfaClient.class);
		when(client.state("junit")).thenReturn(new MfaClient.MfaState(true, "[]", true));
		final var delegate = mock(AuthenticationSuccessHandler.class);
		final var request = request();
		request.getSession(true);
		final var response = new MockHttpServletResponse();
		new MfaAuthenticationSuccessHandler(delegate, client, true, "email").onAuthenticationSuccess(request, response, authentication);
		verify(delegate, never()).onAuthenticationSuccess(any(), any(), any());
		Assertions.assertEquals("/ligoj/login.html?unavailable", response.getHeader("x-redirect"));
		Assertions.assertTrue(response.getContentAsString().contains("/ligoj/login.html?unavailable"));
		Assertions.assertNull(request.getSession(false));
	}
}
