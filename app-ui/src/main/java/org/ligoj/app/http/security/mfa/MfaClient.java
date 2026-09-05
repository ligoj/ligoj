package org.ligoj.app.http.security.mfa;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.ObjectMapper;

/**
 * Client of the API MFA resource (<code>/system/mfa</code>), called on behalf of the authenticated user with the
 * trusted user header, as the back-end proxy does.
 */
@Slf4j
public class MfaClient {

	/**
	 * Trusted user header of the API.
	 */
	public static final String HEADER_USER = "SM_UNIVERSALID";

	private final String apiEndpoint;
	private final ObjectMapper mapper = new ObjectMapper();

	@Setter
	private RestTemplate restTemplate = new RestTemplate();

	/**
	 * @param apiEndpoint The API REST endpoint, such as <code>http://localhost:8081/ligoj-api/rest</code>.
	 */
	public MfaClient(final String apiEndpoint) {
		this.apiEndpoint = apiEndpoint;
	}

	/**
	 * MFA state of a user after the primary authentication.
	 *
	 * @param required    Whether a second factor is required.
	 * @param devicesJson JSON array of the registered devices (id, name, type, defaultDevice), for the MFA page.
	 */
	public record MfaState(boolean required, String devicesJson) {
	}

	private static final MfaState NOT_REQUIRED = new MfaState(false, "[]");
	private static final MfaState REQUIRED_UNKNOWN = new MfaState(true, "[]");

	/**
	 * Record the authentication of the user and tell whether a second factor is required. Fails closed: an API
	 * error means required. An API without the MFA resource (404/405) means the feature is not available: not
	 * required.
	 *
	 * @param user The authenticated user.
	 * @return <code>true</code> when the user registered at least one MFA device.
	 */
	public boolean isRequired(final String user) {
		return state(user).required();
	}

	/**
	 * Record the authentication of the user and return the MFA state: whether a second factor is required, and the
	 * registered devices the user can choose from. Same failure policy as {@link #isRequired(String)}.
	 *
	 * @param user The authenticated user.
	 * @return The MFA state.
	 */
	@SuppressWarnings("unchecked")
	public MfaState state(final String user) {
		try {
			final var response = restTemplate.exchange(apiEndpoint + "/system/mfa/login", HttpMethod.POST,
					new HttpEntity<>(headers(user)), String.class);
			final var body = mapper.readValue(Objects.requireNonNullElse(response.getBody(), "{}"), Map.class);
			if (!Boolean.TRUE.equals(body.get("required"))) {
				return NOT_REQUIRED;
			}
			// Keep the public fields only
			final var devices = ((List<Map<String, Object>>) body.getOrDefault("devices", List.of())).stream().map(d -> {
				final var device = new HashMap<String, Object>();
				device.put("id", d.get("id"));
				device.put("name", d.get("name"));
				device.put("type", d.get("type"));
				device.put("defaultDevice", Boolean.TRUE.equals(d.get("defaultDevice")));
				return device;
			}).toList();
			return new MfaState(true, mapper.writeValueAsString(devices));
		} catch (final HttpClientErrorException e) {
			if (e.getStatusCode() == HttpStatus.NOT_FOUND || e.getStatusCode() == HttpStatus.METHOD_NOT_ALLOWED) {
				log.warn("MFA resource is not available on the API ({}), second factor skipped for {}", e.getStatusCode(), user);
				return NOT_REQUIRED;
			}
			log.error("Unable to check the MFA state of {} ({}), considered as required", user, e.getStatusCode());
			return REQUIRED_UNKNOWN;
		} catch (final RuntimeException e) {
			log.error("Unable to check the MFA state of {}, considered as required", user, e);
			return REQUIRED_UNKNOWN;
		}
	}

	/**
	 * Passkey request options for the user: a single-use challenge and the allowed credentials, to feed
	 * <code>navigator.credentials.get</code>.
	 *
	 * @param user The authenticated user.
	 * @return The options JSON, <code>null</code> when the API cannot provide them.
	 */
	public String passkeyChallenge(final String user) {
		try {
			return restTemplate.exchange(apiEndpoint + "/system/mfa/passkey/challenge", HttpMethod.POST,
					new HttpEntity<>(headers(user)), String.class).getBody();
		} catch (final RuntimeException e) {
			log.error("Unable to get a passkey challenge for {}", user, e);
			return null;
		}
	}

	/**
	 * Verify a passkey assertion for the user.
	 *
	 * @param user          The authenticated user.
	 * @param assertionJson The assertion returned by the browser, as JSON (id, clientDataJSON, authenticatorData,
	 *                      signature).
	 * @return <code>true</code> when the assertion is valid.
	 */
	public boolean verifyPasskey(final String user, final String assertionJson) {
		try {
			restTemplate.exchange(apiEndpoint + "/system/mfa/passkey/verify", HttpMethod.POST,
					new HttpEntity<>(assertionJson, headers(user)), Void.class);
			return true;
		} catch (final HttpClientErrorException e) {
			log.info("Passkey verification of {} rejected: {}", user, e.getStatusCode());
			return false;
		}
	}

	/**
	 * Verify a code for the user against every device.
	 *
	 * @param user The authenticated user.
	 * @param code The code typed by the user.
	 * @return <code>true</code> when the code matches one of the user's devices.
	 */
	public boolean verify(final String user, final String code) {
		return verify(user, code, null);
	}

	/**
	 * Verify a code for the user against the selected device, or every device when none is selected.
	 *
	 * @param user   The authenticated user.
	 * @param code   The code typed by the user.
	 * @param device The selected device identifier, or <code>null</code>.
	 * @return <code>true</code> when the code matches.
	 */
	public boolean verify(final String user, final String code, final Integer device) {
		try {
			final var body = new HashMap<String, Object>();
			body.put("code", code);
			if (device != null) {
				body.put("device", device);
			}
			restTemplate.exchange(apiEndpoint + "/system/mfa/verify", HttpMethod.POST,
					new HttpEntity<>(mapper.writeValueAsString(body), headers(user)), Void.class);
			return true;
		} catch (final HttpClientErrorException e) {
			log.info("MFA verification of {} rejected: {}", user, e.getStatusCode());
			return false;
		}
	}

	private HttpHeaders headers(final String user) {
		final var headers = new HttpHeaders();
		headers.set(HEADER_USER, user);
		headers.setContentType(MediaType.APPLICATION_JSON);
		headers.setAccept(List.of(MediaType.APPLICATION_JSON));
		return headers;
	}
}
