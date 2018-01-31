package org.ligoj.app.http.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import org.apache.commons.codec.binary.Base64;
import org.junit.jupiter.api.Test;

public class PasswordGeneration {

	@Test
	public void test() throws NoSuchAlgorithmException {
		final MessageDigest digest = MessageDigest.getInstance("SHA-256");
		digest.reset();

		// user
		System.out.println(Base64.encodeBase64String(digest.digest("password".getBytes(StandardCharsets.UTF_8))));

	}
}
