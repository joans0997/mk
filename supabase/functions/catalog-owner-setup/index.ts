// One-time account provisioning is complete. This route is permanently disabled.
Deno.serve(() => new Response('Setup completed', {status: 410, headers: {'Cache-Control':'no-store'}}));
