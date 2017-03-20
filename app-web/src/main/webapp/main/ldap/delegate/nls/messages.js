define({
	root: {
		'title': 'LDAP Delegate',
		'delegate': 'Delegate',
		'resourceType': 'Resource type',
		'resource': 'Resource',
		'receiverType' : 'Receiver type',
		'receiver' : 'Receiver',
		'tree': 'Tree',
		'delegate-audience': {
			'receiver-user' : 'User {{{[0]}} will be able to ',
			'receiver-group' : 'Members of group {{{[0]}} and its sub-groups (currently {{[1]}}) will be able to ',
			'receiver-company' : 'Users within the company {{{[0]}}} and its sub-companies (currently {{[1]}} companies and {{[2]}} users) will be able to ',
			'to-see' : 'see the ',
			'to-write' : 'see and update the ',
			'to-admin' : ' share this right, and ',
			'to-admin-write' : ' share this right, ',
			'resource-group' : ' members of the group {{[0]}} and its sub-groups, currently {{[1]}} groups',
			'resource-company' : ' users within the company {{[0]}} and its sub-companies, currently {{[1]}} companies and {{[2]}} users',
			'resource-tree' : ' users and groups within the tree {{[0]}}, currently {{[1]}} groups, {{[2]}} companies and {{[3]}} users'
		}
	},
	fr: true
});
