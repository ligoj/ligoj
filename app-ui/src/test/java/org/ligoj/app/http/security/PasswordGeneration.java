/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import org.apache.commons.codec.binary.Base64;
import org.junit.jupiter.api.Test;

class PasswordGeneration {

	@Test
	void test() throws NoSuchAlgorithmException {
		final MessageDigest digest = MessageDigest.getInstance("SHA-256");
		digest.reset();

		// user
		System.out.println(Base64.encodeBase64String(digest.digest("password".getBytes(StandardCharsets.UTF_8))));

	}
}
