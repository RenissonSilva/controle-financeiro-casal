<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    protected $fillable = [
        'description',
        'amount',
        'date',
        'category_id',
        'ownership',
        'status',
        'source',
        'import_hash',
    ];

    protected $casts = [
        'amount' => 'float',
        'date'   => 'date',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
