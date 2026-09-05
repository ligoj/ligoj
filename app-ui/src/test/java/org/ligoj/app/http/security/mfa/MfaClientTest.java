package org.ligoj.app.http.security.mfa;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

/**
 * Test class of {@link MfaClient}.
 */
class MfaClientTest {

	private static final String API = "http://localhost:8081/ligoj-api/rest";

	private MfaClient client(final RestTemplate template) {
		final var client = new MfaClient(API);
		client.setRestTemplate(template);
		return client;
	}

	@Test
	@SuppressWarnings("unchecked")
	void isRequired() {
		final var template = mock(RestTemplate.class);
		final var captor = ArgumentCaptor.forClass(HttpEntity.class);
		when(template.exchange(eq(API + "/system/mfa/login"), eq(HttpMethod.POST), captor.capture(), eq(String.class)))
				.thenReturn(ResponseEntity.ok("{\"required\":true,\"devices\":[{\"id\":1,\"name\":\"phone\",\"type\":\"TOTP\",\"createdDate\":1,\"defaultDevice\":true}]}"));
		Assertions.assertTrue(client(template).isRequired("junit"));
		Assertions.assertEquals("junit", captor.getValue().getHeaders().getFirst(MfaClient.HEADER_USER));
		// The state keeps the public device fields only
		final var state = client(template).state("junit");
		Assertions.assertTrue(state.required());
		Assertions.assertTrue(state.devicesJson().contains("\"name\":\"phone\""));
		Assertions.assertTrue(state.devicesJson().contains("\"defaultDevice\":true"));
		Assertions.assertFalse(state.devicesJson().contains("createdDate"));

		when(template.exchange(eq(API + "/system/mfa/login"), eq(HttpMethod.POST), any(), eq(String.class)))
				.thenReturn(ResponseEntity.ok("{\"required\":false}"));
		Assertions.assertFalse(client(template).isRequired("junit"));
	}

	@Test
	void isRequiredFailsClosedExceptWithoutResource() {
		final var template = mock(RestTemplate.class);
		// API down: required
		when(template.exchange(eq(API + "/system/mfa/login"), eq(HttpMethod.POST), any(), eq(String.class)))
				.thenThrow(new ResourceAccessException("down"));
		Assertions.assertTrue(client(template).isRequired("junit"));
		// Forbidden: required
		when(template.exchange(eq(API + "/system/mfa/login"), eq(HttpMethod.POST), any(), eq(String.class)))
				.thenThrow(HttpClientErrorException.create(HttpStatus.FORBIDDEN, "", null, null, null));
		Assertions.assertTrue(client(template).isRequired("junit"));
		// Resource not deployed on the API: feature unavailable, not required
		when(template.exchange(eq(API + "/system/mfa/login"), eq(HttpMethod.POST), any(), eq(String.class)))
				.thenThrow(HttpClientErrorException.create(HttpStatus.NOT_FOUND, "", null, null, null));
		Assertions.assertFalse(client(template).isRequired("junit"));
	}

	@Test
	void passkey() {
		final var template = mock(RestTemplate.class);
		when(template.exchange(eq(API + "/system/mfa/passkey/challenge"), eq(HttpMethod.POST), any(), eq(String.class)))
				.thenReturn(ResponseEntity.ok("{\"challenge\":\"x\"}"));
		Assertions.assertEquals("{\"challenge\":\"x\"}", client(template).passkeyChallenge("junit"));
		when(template.exchange(eq(API + "/system/mfa/passkey/challenge"), eq(HttpMethod.POST), any(), eq(String.class)))
				.thenThrow(new ResourceAccessException("down"));
		Assertions.assertNull(client(template).passkeyChallenge("junit"));

		when(template.exchange(eq(API + "/system/mfa/passkey/verify"), eq(HttpMethod.POST), any(), eq(Void.class)))
				.thenReturn(ResponseEntity.noContent().build());
		Assertions.assertTrue(client(template).verifyPasskey("junit", "{\"id\":\"c\"}"));
		when(template.exchange(eq(API + "/system/mfa/passkey/verify"), eq(HttpMethod.POST), any(), eq(Void.class)))
				.thenThrow(HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "", null, null, null));
		Assertions.assertFalse(client(template).verifyPasskey("junit", "{\"id\":\"c\"}"));
	}

	@Test
	@SuppressWarnings("unchecked")
	void verify() {
		final var template = mock(RestTemplate.class);
		final var captor = ArgumentCaptor.forClass(HttpEntity.class);
		when(template.exchange(eq(API + "/system/mfa/verify"), eq(HttpMethod.POST), captor.capture(), eq(Void.class)))
				.thenReturn(ResponseEntity.noContent().build());
		Assertions.assertTrue(client(template).verify("junit", "123456"));
		Assertions.assertEquals("{\"code\":\"123456\"}", captor.getValue().getBody());
		Assertions.assertTrue(client(template).verify("junit", "ABCD", 7));
		Assertions.assertTrue(captor.getValue().getBody().toString().contains("\"device\":7"));
		Assertions.assertEquals("junit", captor.getValue().getHeaders().getFirst(MfaClient.HEADER_USER));

		when(template.exchange(eq(API + "/system/mfa/verify"), eq(HttpMethod.POST), any(), eq(Void.class)))
				.thenThrow(HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "", null, null, null));
		Assertions.assertFalse(client(template).verify("junit", "000000"));
	}
}
