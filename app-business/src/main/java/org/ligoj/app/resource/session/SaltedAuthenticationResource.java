package org.ligoj.app.resource.session;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Arrays;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import javax.transaction.Transactional;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

import org.apache.commons.codec.binary.Base64;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.DateUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import org.ligoj.app.iam.IamProvider;
import lombok.extern.slf4j.Slf4j;

/**
 * Manage SSO token for VigiReport.
 */
@Slf4j
@Path("/security/sso")
@Service
@Transactional
@Produces(MediaType.APPLICATION_JSON)
public class SaltedAuthenticationResource {

	/**
	 * Amount of digest iterations applied to original message to produce the target hash.
	 */
	@Value("${sso.iterations:1000}")
	private int ssoIterations;

	/**
	 * Cipher implementation.
	 */
	@Value("${sso.crypt:DESede}")
	private String ssoCrypt;

	/**
	 * Secret key of DES algorithm used to generated the SSO token.
	 */
	@Value("${sso.secret:K%ë£/L@_§z3-Àçñ?}")
	private String ssoKey;

	/**
	 * SSO digest algorithm used for password. This
	 */
	@Value("${sso.digest:SHA-1}")
	private String ssoDigest;
	
	@Autowired
	private IamProvider iamProvider;

	/**
	 * Authenticates the user with a given login and password If password and/or login is null then always returns
	 * false. If the user does not exist in the database returns false.
	 * 
	 * @param token
	 *            SSO token to validate.
	 * @return the associated trusted user name or null.
	 */
	@POST
	public String checkSsoToken(final String token) throws NoSuchAlgorithmException {
		String[] fields = new String[0];
		boolean userExist = true;
		try {
			fields = StringUtils.split(StringUtils.trimToEmpty(decrypt(token, ssoKey)), "|");
		} catch (final Exception e) {
			// TIME RESISTANT ATTACK
			log.warn("Bad SSO attack attempt with token '" + token + "'");
		}
		if (fields.length != 4) {
			// TIME RESISTANT ATTACK
			userExist = false;
			fields = new String[] { "0", "000000000000000000000000000=", "00000000000=", "0" };
		}
		final String login = fields[0];
		final String digest = fields[1];
		final String salt = fields[2];

		final long expire = Base64.decodeInteger(fields[3].getBytes(StandardCharsets.UTF_8)).longValue();
		String userKey = getUserKey(login);
		if (userKey == null || expire < System.currentTimeMillis()) {
			// TIME RESISTANT ATTACK
			// Computation time is equal to the time needed for a legitimate user
			userExist = false;
			userKey = "0";
		}

		final byte[] bDigest = base64ToByte(digest);
		final byte[] bSalt = base64ToByte(salt);

		// Compute the new DIGEST
		final byte[] proposedDigest = getHash(ssoIterations, login + userKey + expire, bSalt);

		final boolean digestCompare = Arrays.equals(proposedDigest, bDigest);
		if (userExist && digestCompare) {
			// Authenticated user
			return login;
		}
		throw new AccessDeniedException("");
	}

	/**
	 * Return SSO token to use in cross site parameters valid for 30 minutes.
	 * 
	 * @param login
	 *            String The login of the user
	 * @return SSO token to use in cross site parameters.
	 */
	public String getSsoToken(final String login) throws Exception {
		final String userKey = getUserKey(login);
		if (userKey == null) {
			return null;
		}
		return getSsoToken(StringUtils.trimToEmpty(login), StringUtils.trimToEmpty(userKey));
	}

	/**
	 * Encrypt the message with the given key.
	 * 
	 * @param message
	 *            Ciphered message.
	 * @param secretKey
	 *            The secret key.
	 * @return the original message.
	 */
	protected String encrypt(final String message, final String secretKey) throws Exception {
		final MessageDigest md = MessageDigest.getInstance(ssoDigest);
		final byte[] digestOfPassword = md.digest(secretKey.getBytes(StandardCharsets.UTF_8));
		final byte[] keyBytes = Arrays.copyOf(digestOfPassword, 24);
		final SecretKey key = new SecretKeySpec(keyBytes, ssoCrypt);
		final Cipher cipher = Cipher.getInstance(ssoCrypt);
		cipher.init(Cipher.ENCRYPT_MODE, key);
		final byte[] plainTextBytes = message.getBytes(StandardCharsets.UTF_8);
		final byte[] buf = cipher.doFinal(plainTextBytes);
		final byte[] base64Bytes = Base64.encodeBase64(buf);
		return new String(base64Bytes, StandardCharsets.UTF_8);
	}

	/**
	 * Decrypt the message with the given key.
	 * 
	 * @param encryptedMessage
	 *            Encrypted message.
	 * @param secretKey
	 *            The secret key.
	 * @return the original message.
	 */
	private String decrypt(final String encryptedMessage, final String secretKey) throws Exception {
		final byte[] message = Base64.decodeBase64(encryptedMessage.getBytes(StandardCharsets.UTF_8));
		final MessageDigest md = MessageDigest.getInstance(ssoDigest);
		final byte[] digestOfPassword = md.digest(secretKey.getBytes(StandardCharsets.UTF_8));
		final byte[] keyBytes = Arrays.copyOf(digestOfPassword, 24);
		final SecretKey key = new SecretKeySpec(keyBytes, ssoCrypt);
		final Cipher decipher = Cipher.getInstance(ssoCrypt);
		decipher.init(Cipher.DECRYPT_MODE, key);
		final byte[] plainText = decipher.doFinal(message);
		return new String(plainText, StandardCharsets.UTF_8);
	}

	/**
	 * From a password, a number of iterations and a salt, returns the corresponding digest
	 * 
	 * @param iterations
	 *            The amount of iterations of the algorithm.
	 * @param password
	 *            String The password to encrypt
	 * @param salt
	 *            byte[] The salt
	 * @return byte[] The digested password
	 * @throws NoSuchAlgorithmException
	 *             If the algorithm doesn't exist
	 */
	protected byte[] getHash(final int iterations, final String password, final byte[] salt) throws NoSuchAlgorithmException {
		final MessageDigest digest = MessageDigest.getInstance(ssoDigest);
		digest.reset();
		digest.update(salt);
		byte[] input = digest.digest(password.getBytes(StandardCharsets.UTF_8));
		for (int i = 0; i < iterations; i++) {
			digest.reset();
			input = digest.digest(input);
		}
		return input;
	}

	/**
	 * From a base 64 representation, returns the corresponding byte[]
	 * 
	 * @param data
	 *            String The base64 representation
	 * @return byte[]
	 */
	protected byte[] base64ToByte(final String data) {
		return Base64.decodeBase64(data);
	}

	/**
	 * From a byte[] returns a base 64 representation
	 * 
	 * @param data
	 *            byte[]
	 * @return String
	 */
	protected String byteToBase64(final byte[] data) {
		return Base64.encodeBase64String(data);
	}

	/**
	 * Return SSO token to use in cross site parameters valid for 30 minutes.
	 * 
	 * @param login
	 *            The login of the user.
	 * @param userKey
	 *            The key of the user.
	 * @return SSO token to use as cross site parameter.
	 */
	private String getSsoToken(final String login, final String userKey) throws Exception {
		// Uses a secure Random not a simple Random
		final SecureRandom random = SecureRandom.getInstance("SHA1PRNG");
		// Salt generation 64 bits long
		final byte[] bSalt = new byte[8];
		random.nextBytes(bSalt);
		// Digest computation
		final long expire = System.currentTimeMillis() + DateUtils.MILLIS_PER_MINUTE * 30;
		final byte[] bDigest = getHash(ssoIterations, login + userKey + expire, bSalt);
		final String sDigest = byteToBase64(bDigest);
		final String sSalt = byteToBase64(bSalt);
		// Generated an encrypted key, valid for 30 minutes
		return encrypt(login + "|" + sDigest + "|" + sSalt + "|"
				+ new String(Base64.encodeInteger(new BigInteger(String.valueOf(expire))), StandardCharsets.UTF_8), ssoKey);
	}

	/**
	 * Return the key used to compare for a given login. The password (salted or not) from LDAP, will be hashed to build
	 * the final key.
	 */
	private String getUserKey(final String login) {
		return iamProvider.getConfiguration().getUserRepository().getToken(login);
	}
}