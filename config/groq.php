<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Groq API Key
    |--------------------------------------------------------------------------
    |
    | Chave de API gratuita, gerada em https://console.groq.com/keys
    */

    'api_key' => env('GROQ_API_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Groq Model
    |--------------------------------------------------------------------------
    |
    | O llama-3.3-70b-versatile foi descontinuado pelo Groq (404). Lista atual em
    | GET https://api.groq.com/openai/v1/models.
    */

    'model' => env('GROQ_MODEL', 'openai/gpt-oss-120b'),

    // Esforço de raciocínio dos modelos gpt-oss (low|medium|high). "low" basta para
    // classificar e gasta menos da cota de tokens por minuto do plano gratuito.
    'reasoning_effort' => env('GROQ_REASONING_EFFORT', 'low'),
];
