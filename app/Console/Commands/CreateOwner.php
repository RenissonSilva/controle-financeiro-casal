<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules;

/**
 * Cria a conta principal. Não existe cadastro público: o dono nasce aqui, no servidor,
 * e as outras contas entram pelo link de convite.
 */
class CreateOwner extends Command
{
    protected $signature = 'user:create-owner
        {--name= : Nome (pergunta se faltar)}
        {--email= : E-mail de login (pergunta se faltar)}';

    protected $description = 'Cria a conta principal do sistema (a senha é pedida no terminal)';

    public function handle(): int
    {
        if ($owner = User::owner()) {
            $this->error("A conta principal já existe ({$owner->email}).");

            return self::FAILURE;
        }

        $data = [
            'name' => $this->option('name') ?: $this->ask('Nome'),
            'email' => mb_strtolower(trim((string) ($this->option('email') ?: $this->ask('E-mail')))),
            'password' => $this->secret('Senha'),
        ];
        $data['password_confirmation'] = $this->secret('Confirme a senha');

        $validator = Validator::make($data, [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);
        $user->forceFill(['role' => User::ROLE_OWNER, 'linked_at' => now()])->save();

        $this->info("Conta principal criada: {$user->email}");

        return self::SUCCESS;
    }
}
