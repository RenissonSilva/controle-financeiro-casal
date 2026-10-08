<?php

namespace App\Providers;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(Setting::CONTAINER_KEY, fn () => Setting::resolveCurrent());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // "expenses.edit", "goals.delete"...: o dono pode tudo; a conta vinculada, o que ele liberou.
        foreach (User::permissionKeys() as $permission) {
            Gate::define($permission, fn (User $user) => $user->hasPermission($permission));
        }

        Gate::define('owner', fn (User $user) => $user->isOwner());
    }
}
