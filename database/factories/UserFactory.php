<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'role' => User::ROLE_OWNER,
            'linked_at' => now(),
        ];
    }

    // Conta vinculada por convite, com as permissões informadas (ex: ['expenses.edit']).
    public function member(array $permissions = []): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => User::ROLE_MEMBER,
            'permissions' => $permissions,
        ]);
    }

    // Conta criada sem convite: ainda não vê nada.
    public function unlinked(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => null,
            'permissions' => null,
            'linked_at' => null,
        ]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
