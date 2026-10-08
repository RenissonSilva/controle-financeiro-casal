<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Invite;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(Request $request): Response
    {
        $invite = Invite::findValid($request->session()->get(Invite::SESSION_KEY));

        return Inertia::render('Auth/Register', [
            // Depois da primeira conta (a principal), só entra quem tem link de convite.
            'inviteOnly' => ! $invite && User::owner() !== null,
            'invitedBy' => $invite?->creator?->name,
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $invite = Invite::findValid($request->session()->get(Invite::SESSION_KEY));

        if (! $invite && User::owner() !== null) {
            return redirect()->route('register');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Primeira conta do sistema = conta principal; as outras entram pelo convite.
        if (User::owner() === null) {
            $user->forceFill(['role' => User::ROLE_OWNER, 'linked_at' => now()])->save();
        } else {
            $invite->accept($user);
            $request->session()->forget(Invite::SESSION_KEY);
        }

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}
