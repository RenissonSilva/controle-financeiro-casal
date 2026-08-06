<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Credenciais Pluggy (Open Finance)
    |--------------------------------------------------------------------------
    |
    | Geradas em https://dashboard.pluggy.ai
    */

    'client_id'     => env('PLUGGY_CLIENT_ID'),
    'client_secret' => env('PLUGGY_CLIENT_SECRET'),

    'base_url' => env('PLUGGY_BASE_URL', 'https://api.pluggy.ai'),

    // URL pública que recebe webhooks de atualização de itens (opcional).
    'webhook_url' => env('PLUGGY_WEBHOOK_URL'),

    // Exibe também os conectores de sandbox (bancos fake para teste) no widget.
    'use_sandbox' => env('PLUGGY_USE_SANDBOX', true),
];
