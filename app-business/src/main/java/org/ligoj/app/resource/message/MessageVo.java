package org.ligoj.app.resource.message;

import org.ligoj.app.api.NodeVo;
import org.ligoj.app.api.SimpleUser;
import org.ligoj.app.ldap.resource.ContainerLdapWithTypeVo;
import org.ligoj.app.model.Message;
import org.ligoj.app.resource.project.ProjectLightVo;
import lombok.Getter;
import lombok.Setter;

/**
 * A message to target audience and with detailed information from the source.
 */
@Getter
@Setter
public class MessageVo extends Message {

	/**
	 * SID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * Optional project targeted by this message.
	 */
	private ProjectLightVo project;

	/**
	 * Optional user details source of this message.
	 */
	private SimpleUser from;

	/**
	 * Optional user targeted by this message.
	 */
	private SimpleUser user;

	/**
	 * Optional node details targeted by this message.
	 */
	private NodeVo node;

	/**
	 * Optional group details targeted by this message.
	 */
	private ContainerLdapWithTypeVo group;

	/**
	 * Optional company details targeted by this message.
	 */
	private ContainerLdapWithTypeVo company;

	/**
	 * Message state. When <code>true</code> this message is new for a specific message.
	 */
	private boolean unread;

}
