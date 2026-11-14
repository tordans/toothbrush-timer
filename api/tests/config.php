<?php
// Throwaway config for the local test stack. The invite word is dev-invite.
return [
    'db' => ['host' => 'db', 'name' => 'brush', 'user' => 'brush', 'password' => 'brush-dev'],
    'invite_sha256' => '341f09c94c39b9959ed8746949a41863dee662602541f8a7bfdee7219c89cb36',
    'ip_salt_secret' => 'dev-ip-salt-secret',
    'commit' => 'dev',
];
