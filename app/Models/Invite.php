<?php

namespace App\Models;

use App\Support\Activity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Link de convite da conta principal. Uso único: quem abre o link e entra (ou cria a conta)
 * fica vinculado só com visualização; o dono libera o resto depois.
 */
class Invite extends Model
{
    public const VALID_DAYS = 7;

    // Guardado na sessão entre abrir o link e terminar o cadastro/login.
    public const SESSION_KEY = 'invite_token';

    protected $fillable = ['token', 'created_by', 'expires_at'];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->whereNull('accepted_at')->where('expires_at', '>', now());
    }

    // Um convite por vez: gerar outro invalida o anterior.
    public static function generate(User $owner): self
    {
        static::whereNull('accepted_at')->delete();

        return static::create([
            'token' => Str::random(48),
            'created_by' => $owner->id,
            'expires_at' => now()->addDays(self::VALID_DAYS),
        ]);
    }

    public static function findValid(?string $token): ?self
    {
        return $token ? static::pending()->where('token', $token)->first() : null;
    }

    public function url(): string
    {
        return route('invites.show', $this->token);
    }

    // Vincula a conta (só contas ainda sem vínculo). Devolve false se não deu.
    public function accept(User $user): bool
    {
        if ($user->isLinked() || $this->accepted_at || $this->expires_at->isPast()) {
            return false;
        }

        DB::transaction(function () use ($user) {
            $user->linkAsMember();
            $this->forceFill(['accepted_by' => $user->id, 'accepted_at' => now()])->save();
        });

        Activity::record('access', 'linked', 'entrou pelo link de convite', $user->name, $user, user: $user);

        return true;
    }
}
