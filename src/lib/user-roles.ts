export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const tokenResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
        client_secret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials',
        scope: 'read:users read:roles update:users',
      }),
    });

    if (!tokenResponse.ok) return ['Student'];

    const { access_token: managementToken } = await tokenResponse.json();

    const userResponse = await fetch(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${userId}`,
      { headers: { Authorization: `Bearer ${managementToken}`, 'Content-Type': 'application/json' } }
    );

    if (!userResponse.ok) return ['Student'];
    const userData = await userResponse.json();

    const rolesUrl = `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${userId}/roles`;
    const response = await fetch(rolesUrl, {
      headers: { Authorization: `Bearer ${managementToken}`, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      await assignStudentRole(userId, managementToken);
      return ['Student'];
    }

    const roles = await response.json();
    const roleNames = roles.map((role: any) => role.name);

    if (roleNames.length === 0) {
      await assignStudentRole(userId, managementToken);
      return ['Student'];
    }

    return roleNames;
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return ['Student'];
  }
}

async function assignStudentRole(userId: string, managementToken: string): Promise<void> {
  try {
    const rolesResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/roles`, {
      headers: { Authorization: `Bearer ${managementToken}`, 'Content-Type': 'application/json' },
    });

    if (!rolesResponse.ok) return;

    const rolesData = await rolesResponse.json();
    const studentRole = rolesData.find((role: any) => role.name === 'Student');
    if (!studentRole) return;

    await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users/${userId}/roles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managementToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: [studentRole.id] }),
    });
  } catch (error) {
    console.error('Error assigning Student role:', error);
  }
}
