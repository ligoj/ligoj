/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.web.client.RestTemplate;

/**
 * Test class of {@link ApiKeyLoginFilter}
 */
class ApiKeyLoginFilterTest {

    private ApiKeyLoginFilter filter;
    private AuthenticationManager authenticationManager;
    private RestTemplate restTemplate;

    @Test
    void authenticateWithParameters() {
        final var request = newRequest("myApiKey", "myUser", null, null);
        mockSessionResponse(HttpStatus.OK, "myUser");

        final var result = filter.attemptAuthentication(request, null);

        Assertions.assertNotNull(result);
        Assertions.assertEquals("myUser", result.getPrincipal());
        Assertions.assertEquals("myApiKey", result.getCredentials());
        Assertions.assertTrue(result.isAuthenticated());
    }

    @Test
    void authenticateWithHeaders() {
        final var request = newRequest(null, null, "myApiKey", "myUser");
        mockSessionResponse(HttpStatus.OK, "myUser");

        final var result = filter.attemptAuthentication(request, null);

        Assertions.assertNotNull(result);
        Assertions.assertEquals("myUser", result.getPrincipal());
        Assertions.assertEquals("myApiKey", result.getCredentials());
        Assertions.assertTrue(result.isAuthenticated());
    }

    @Test
    void authenticateMissingApiKey() {
        final var request = newRequest(null, "myUser", null, null);
        Assertions.assertNull(filter.attemptAuthentication(request, null));
    }

    @Test
    void authenticateMissingApiUser() {
        final var request = newRequest("myApiKey", null, null, null);
        Assertions.assertNull(filter.attemptAuthentication(request, null));
    }

    @Test
    void authenticateMissingBoth() {
        final var request = newRequest(null, null, null, null);
        Assertions.assertNull(filter.attemptAuthentication(request, null));
    }

    @Test
    void authenticateFailure() {
        final var request = newRequest("myApiKey", "myUser", null, null);
        mockSessionResponse(HttpStatus.UNAUTHORIZED, null);
        Assertions.assertNull(filter.attemptAuthentication(request, null));
    }

    @Test
    void authenticateWithMixedParametersAndHeaders() {
        // Parameter takes precedence over header
        final var request = newRequest("paramApiKey", "paramUser", "headerApiKey", "headerUser");
        mockSessionResponse(HttpStatus.OK, "paramUser");

        final var result = filter.attemptAuthentication(request, null);

        Assertions.assertNotNull(result);
        Assertions.assertEquals("paramUser", result.getPrincipal());
        Assertions.assertEquals("paramApiKey", result.getCredentials());
        Assertions.assertTrue(result.isAuthenticated());
    }

    @Test
    void authenticateDisabled() {
        filter = new ApiKeyLoginFilter("/login-by-api-key", false);
        final var request = newRequest("myApiKey", "myUser", null, null);
        Assertions.assertNull(filter.attemptAuthentication(request, null));
    }

    /**
     * Generate a mock request with api-key and api-user
     */
    private HttpServletRequest newRequest(String apiKeyParam, String apiUserParam, String apiKeyHeader, String apiUserHeader) {
        final var request = Mockito.mock(HttpServletRequest.class);
        Mockito.when(request.getParameter("api-key")).thenReturn(apiKeyParam);
        Mockito.when(request.getParameter("api-user")).thenReturn(apiUserParam);
        Mockito.when(request.getHeader("x-api-key")).thenReturn(apiKeyHeader);
        Mockito.when(request.getHeader("x-api-user")).thenReturn(apiUserHeader);
        Mockito.when(request.getRequestURI()).thenReturn("/login-by-api-key");
        return request;
    }

    private void mockSessionResponse(HttpStatus status, String realUser) {
        String body = null;
        if (realUser != null) {
            body = "{\"user\": \"" + realUser + "\"}";
        }
        final var responseEntity = new ResponseEntity<String>(body, status);
        Mockito.when(restTemplate.exchange(Mockito.anyString(), Mockito.eq(HttpMethod.GET), Mockito.any(), Mockito.eq(String.class)))
                .thenReturn(responseEntity);
    }

    /**
     * Initialize the test.
     */
    @BeforeEach
    void init() {
        filter = new ApiKeyLoginFilter("/login-by-api-key", true);
        authenticationManager = Mockito.mock(AuthenticationManager.class);
        restTemplate = Mockito.mock(RestTemplate.class);
        filter.setAuthenticationManager(authenticationManager);
        filter.setRestTemplate(restTemplate);
    }
}
