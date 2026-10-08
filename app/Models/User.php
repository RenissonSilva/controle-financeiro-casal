<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Conta de acesso. Há uma conta principal (owner), que administra tudo, e contas vinculadas
 * por convite (member), que veem tudo e só criam/editam/excluem nas áreas que o dono liberar.
 * Sem papel = conta criada mas ainda não vinculada (não vê nenhum dado).
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const ROLE_OWNER = 'owner';
    public const ROLE_MEMBER = 'member';

    // Áreas do sistema que o dono libera para quem está vinculado.
    public const AREAS = [
        'expenses' => 'Lançamentos',
        'fixed' => 'Contas fixas',
        'goals' => 'Metas',
        'settings' => 'Configurações',
    ];

    public const ACTIONS = [
        'edit' => 'Criar e editar',
        'delete' => 'Excluir',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
            'linked_at' => 'datetime',
        ];
    }

    // "expenses.edit", "expenses.delete", "fixed.edit", ...
    public static function permissionKeys(): array
    {
        return collect(self::AREAS)->keys()->crossJoin(array_keys(self::ACTIONS))->map(fn (array $pair) => implode('.', $pair))->all();
    }

    public static function owner(): ?self
    {
        return static::where('role', self::ROLE_OWNER)->orderBy('id')->first();
    }

    public function isOwner(): bool
    {
        return $this->role === self::ROLE_OWNER;
    }

    public function isMember(): bool
    {
        return $this->role === self::ROLE_MEMBER;
    }

    public function isLinked(): bool
    {
        return $this->isOwner() || $this->isMember();
    }

    public function hasPermission(string $permission): bool
    {
        return $this->isOwner() || ($this->isMember() && in_array($permission, $this->permissions ?? [], true));
    }

    // Mapa para o front: { "expenses.edit": true, ..., "owner": false }.
    public function abilities(): array
    {
        return collect(self::permissionKeys())
            ->mapWithKeys(fn (string $permission) => [$permission => $this->hasPermission($permission)])
            ->put('owner', $this->isOwner())
            ->all();
    }

    public function linkAsMember(): void
    {
        $this->forceFill(['role' => self::ROLE_MEMBER, 'permissions' => [], 'linked_at' => now()])->save();
    }

    public function unlink(): void
    {
        $this->forceFill(['role' => null, 'permissions' => null, 'linked_at' => null])->save();
    }
}
