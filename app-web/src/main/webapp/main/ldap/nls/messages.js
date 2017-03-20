define({
	root: {
		'title': 'LDAP',
		'company': 'Company',
		'delegate': 'Delegate',
		'login': 'Login',
		'mail': 'Mail',
		'groups': 'Groups',
		'group': 'Group',
		'department': 'Department',
		'localid': 'Local identifier',
		'container-type': 'Container Type',
		'user': 'User',
		'admin': 'Administration',
		'write': 'Write',
		'type': 'Type',
		'agreement': 'Usage Agreement',
		'agree': 'I\'ve read and I accept this agreement',
		'delay-message': 'A maximum delay about 1h is required by tools like JIRA to take account the changes.',
		'locked': 'Locked',
		'quarantine': 'Quarantine',
		'agreement-details': '<div>The user management and associated rights are the core of all access to tools.</div><br/><div>It\'s important to respect some usage rules :<ul><li>Created accounts must match to physical people and are personal; so, no shared nor generic accounts.</li><li>Upon departure of a person from a company, his or her account must be immediately deleted. Forgetting this action implies severe security issues for the whole information system. Since an foreign of the company would be able to access to a sensitive information.</li><li>Upon the depart from a group (BU, HUB, Project,...), he or she must be removed from this group. Forgetting this action implies security issues for the associated organizational unit (Project,...) since he or she should not access to this entity anymore.</li><li>The created mails of accounts must suit to a professional frame; no yahoo.fr, gmail.com, etc.</li></ul></div>',
		'agreement-accepted': 'You have accepted the account <a id="showAgreement">usage rules</a>.',
		'error': {
			'last-member-of-group': 'You can\'t delete user {{user}}, he is the last member of group {{group}}',
			'locked': 'This container is locked, you cannot create or delete it',
			'container-type-match': 'Expected type is {{expected}} and you provided {{type}}'
		}
	},
	fr: true
});
