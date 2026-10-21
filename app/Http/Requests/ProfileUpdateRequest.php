<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Services\Chat\WhatsApp;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    // "(71) 99999-8888" → "5571999998888", o formato que o WhatsApp manda no webhook.
    protected function prepareForValidation(): void
    {
        $this->merge(['whatsapp' => WhatsApp::normalizeNumber($this->input('whatsapp'))]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'whatsapp' => [
                'nullable',
                'regex:/^\d{12,15}$/',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'whatsapp.regex' => 'Informe o número com DDD, ex: (71) 99999-8888.',
            'whatsapp.unique' => 'Esse número já está em outra conta.',
        ];
    }
}
