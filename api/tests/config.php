<?php
// Throwaway config for the local test stack. Keys: dev-family-key, dev-deploy-key, dev-mcp-key.
return [
    'db' => ['host' => 'db', 'name' => 'brush', 'user' => 'brush', 'password' => 'brush-dev'],
    'family_key_hash' => 'd90faa86aa7a7055a5024e8b6b9f2587944231b7482368e45251ac9cd0312f01',
    'deploy_key_hash' => '633b59a55d2ef01eda10dab2f1281f7b73990d0c12d5f35561c52f11f78fb668',
    'mcp_key_hash' => 'b2759dc80a6487f5ce6db8247b5b3ba85ea6b70f60254ea4ff952bf799318620',
    'mcp_allow_write' => true,
    'commit' => 'dev',
];
