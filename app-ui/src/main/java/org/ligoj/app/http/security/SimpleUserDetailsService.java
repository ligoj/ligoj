/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.http.security;

import java.util.ArrayList;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Basic user details service.
 * 
 * @author Fabrice Daugan
 * 
 */
public class SimpleUserDetailsService implements org.springframework.security.core.userdetails.UserDetailsService {

	@Override
	public UserDetails loadUserByUsername(final String username) {
		return new User(username, "N/A", new ArrayList<>());
	}

}
