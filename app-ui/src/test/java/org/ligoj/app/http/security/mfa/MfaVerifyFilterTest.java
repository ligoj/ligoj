package org.ligoj.app.http.security.mfa;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Test class of {@link MfaVerifyFilter}.
 */
class MfaVerifyFilterTest {

	private MfaClient client;
	private MfaVerifyFilter filter;

	@BeforeEach
	void prepare() {
		client = mock(MfaClient.class);
		filter = new MfaVerifyFilter(client, "email");
		SecurityContextHolder.getContext().setAuthentication(
				new UsernamePasswordAuthenticationToken("junit", "N/A", List.of(new SimpleGrantedAuthority("ROLE_USER"))));
	}

	@AfterEach
	void clean() {
		SecurityContextHolder.clearContext();
	}

	private MockHttpServletRequest request(final String method, final String path, final boolean pending) {
		final var request = new MockHttpServletRequest(method, "/ligoj" + path);
		request.setContextPath("/ligoj");
		if (pending) {
			request.getSession(true).setAttribute(MfaSupport.ATTRIBUTE_PENDING, Boolean.TRUE);
		}
		return request;
	}

	@Test
	void otherRequestsPassThrough() throws Exception {
		// Other methods on the endpoint, and other paths, are not handled by the filter
		final var chain = new MockFilterChain();
		final var request = request("PUT", "/login/mfa", true);
		filter.doFilter(request, new MockHttpServletResponse(), chain);
		Assertions.assertSame(request, chain.getRequest());
		final var chain2 = new MockFilterChain();
		filter.doFilter(request("POST", "/rest/session", true), new MockHttpServletResponse(), chain2);
		Assertions.assertNotNull(chain2.getRequest());
	}

	@Test
	void unauthenticated() throws Exception {
		SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken("key", "anonymous", List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
		final var response = new MockHttpServletResponse();
		filter.doFilter(request("POST", "/login/mfa", true), response, new MockFilterChain());
		Assertions.assertEquals(401, response.getStatus());
		Assertions.assertTrue(response.getContentAsString().contains("unauthorized"));
	}

	@Test
	void nothingPending() throws Exception {
		final var response = new MockHttpServletResponse();
		filter.doFilter(request("POST", "/login/mfa", false), response, new MockFilterChain());
		Assertions.assertEquals(204, response.getStatus());
	}

	@Test
	void missingCode() throws Exception {
		final var response = new MockHttpServletResponse();
		filter.doFilter(request("POST", "/login/mfa", true), response, new MockFilterChain());
		Assertions.assertEquals(400, response.getStatus());
		Assertions.assertTrue(response.getContentAsString().contains("mfa-code-required"));
	}

	@Test
	void devicesForThePage() throws Exception {
		final var request = request("GET", "/login/mfa", true);
		request.getSession().setAttribute(MfaSupport.ATTRIBUTE_DEVICES, "[{\"id\":1,\"name\":\"phone\",\"type\":\"TOTP\",\"defaultDevice\":true}]");
		final var response = new MockHttpServletResponse();
		filter.doFilter(request, response, new MockFilterChain());
		Assertions.assertEquals(200, response.getStatus());
		Assertions.assertEquals("{\"pending\":true,\"devices\":[{\"id\":1,\"name\":\"phone\",\"type\":\"TOTP\",\"defaultDevice\":true}]}", response.getContentAsString());

		// Nothing pending: empty list
		final var response2 = new MockHttpServletResponse();
		filter.doFilter(request("GET", "/login/mfa", false), response2, new MockFilterChain());
		Assertions.assertEquals("{\"pending\":false,\"devices\":[]}", response2.getContentAsString());
	}

	@Test
	void passkeyChallengeAndAssertion() throws Exception {
		when(client.passkeyChallenge("junit")).thenReturn("{\"challenge\":\"abc\",\"rpId\":\"localhost\"}");
		final var response = new MockHttpServletResponse();
		filter.doFilter(request("GET", "/login/mfa/passkey", true), response, new MockFilterChain());
		Assertions.assertEquals(200, response.getStatus());
		Assertions.assertEquals("{\"challenge\":\"abc\",\"rpId\":\"localhost\"}", response.getContentAsString());
		// Not pending: nothing to challenge
		final var response2 = new MockHttpServletResponse();
		filter.doFilter(request("GET", "/login/mfa/passkey", false), response2, new MockFilterChain());
		Assertions.assertEquals(204, response2.getStatus());
		// API unavailable
		when(client.passkeyChallenge("junit")).thenReturn(null);
		final var response3 = new MockHttpServletResponse();
		filter.doFilter(request("GET", "/login/mfa/passkey", true), response3, new MockFilterChain());
		Assertions.assertEquals(503, response3.getStatus());

		// Assertion forwarded as JSON
		when(client.verifyPasskey(org.mockito.ArgumentMatchers.eq("junit"), org.mockito.ArgumentMatchers.contains("\"signature\":\"sig\""))).thenReturn(true);
		final var request = request("POST", "/login/mfa", true);
		request.setContentType("application/json");
		request.setContent("{\"device\":3,\"passkey\":{\"id\":\"cred\",\"clientDataJSON\":\"c\",\"authenticatorData\":\"a\",\"signature\":\"sig\"}}".getBytes(StandardCharsets.UTF_8));
		final var response4 = new MockHttpServletResponse();
		filter.doFilter(request, response4, new MockFilterChain());
		Assertions.assertEquals(204, response4.getStatus());
		Assertions.assertNull(request.getSession().getAttribute(MfaSupport.ATTRIBUTE_PENDING));
	}

	@Test
	void verifiedWithSelectedDevice() throws Exception {
		when(client.verify("junit", "ABCD-EFGH", 7)).thenReturn(true);
		final var request = request("POST", "/login/mfa", true);
		request.setContentType("application/json");
		request.setContent("{\"code\":\"ABCD-EFGH\",\"device\":7}".getBytes(StandardCharsets.UTF_8));
		final var response = new MockHttpServletResponse();
		filter.doFilter(request, response, new MockFilterChain());
		Assertions.assertEquals(204, response.getStatus());
		Assertions.assertNull(request.getSession().getAttribute(MfaSupport.ATTRIBUTE_DEVICES));
	}

	@Test
	void verifiedFromParameter() throws Exception {
		when(client.verify("junit", "123456", null)).thenReturn(true);
		final var request = request("POST", "/login/mfa", true);
		request.setParameter("code", "123456");
		final var response = new MockHttpServletResponse();
		filter.doFilter(request, response, new MockFilterChain());
		Assertions.assertEquals(204, response.getStatus());
		Assertions.assertNull(request.getSession().getAttribute(MfaSupport.ATTRIBUTE_PENDING));
	}

	@Test
	void verifiedFromJson() throws Exception {
		when(client.verify("junit", "654321", null)).thenReturn(true);
		final var request = request("POST", "/login/mfa", true);
		request.setContentType("application/json");
		request.setContent("{\"code\":\"654321\"}".getBytes(StandardCharsets.UTF_8));
		final var response = new MockHttpServletResponse();
		filter.doFilter(request, response, new MockFilterChain());
		Assertions.assertEquals(204, response.getStatus());
		Assertions.assertNull(request.getSession().getAttribute(MfaSupport.ATTRIBUTE_PENDING));
	}

	@Test
	void invalidThenLocked() throws Exception {
		when(client.verify("junit", "000000", null)).thenReturn(false);
		final var request = request("POST", "/login/mfa", true);
		request.setParameter("code", "000000");
		final var session = request.getSession();
		for (var attempt = 1; attempt < MfaVerifyFilter.MAX_ATTEMPTS; attempt++) {
			final var response = new MockHttpServletResponse();
			filter.doFilter(request, response, new MockFilterChain());
			Assertions.assertEquals(401, response.getStatus());
			Assertions.assertTrue(response.getContentAsString().contains("\"mfa-invalid\",\"remaining\":" + (MfaVerifyFilter.MAX_ATTEMPTS - attempt)));
			Assertions.assertEquals(attempt, session.getAttribute(MfaSupport.ATTRIBUTE_ATTEMPTS));
			Assertions.assertEquals(Boolean.TRUE, session.getAttribute(MfaSupport.ATTRIBUTE_PENDING));
		}
		// Last attempt ends the session
		final var response = new MockHttpServletResponse();
		filter.doFilter(request, response, new MockFilterChain());
		Assertions.assertEquals(401, response.getStatus());
		Assertions.assertTrue(response.getContentAsString().contains("mfa-locked"));
		Assertions.assertTrue(((org.springframework.mock.web.MockHttpSession) session).isInvalid());
		Assertions.assertNull(SecurityContextHolder.getContext().getAuthentication());
	}
}
