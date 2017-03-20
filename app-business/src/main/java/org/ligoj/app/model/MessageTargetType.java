package org.ligoj.app.model;

/**
 * Message target type
 */
public enum MessageTargetType {
	/**
	 * A specific user. Target data will be a user login.
	 */
	USER, 
	
	/**
	 * All members of given group. Target will be the identifier of the group.
	 */
	GROUP, 
	
	/**
	 * All users inside the given company. Target data will be the identifier of the company.
	 */
	COMPANY, 
	
	/**
	 * All members of all groups subscribed by the given project. Target data will be the identifier of the project.
	 */
	PROJECT,
	
	/**
	 * All members of all groups subscribed by all projects having at least one subscription to the given node or having this node as parent. Target data will be the identifier of the node.
	 */
	NODE 
}
