<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <title>Despesas</title>
    <style>
        @page { margin: 28px 32px; }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            color: #1f2937;
            font-size: 11px;
        }

        .month-page {
            page-break-after: always;
        }
        .month-page:last-child {
            page-break-after: auto;
        }

        .header {
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 8px;
            margin-bottom: 14px;
        }
        .header h1 {
            font-size: 16px;
            margin: 0 0 2px 0;
            color: #4f46e5;
        }
        .header .meta {
            font-size: 10px;
            color: #6b7280;
        }

        .month-title {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 10px 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }
        thead th {
            background: #f3f4f6;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.03em;
            color: #6b7280;
            text-align: left;
            padding: 6px 8px;
            border-bottom: 1px solid #e5e7eb;
        }
        thead th.amount { text-align: right; }
        tbody td {
            padding: 5px 8px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
        }
        tbody td.amount {
            text-align: right;
            font-weight: bold;
            white-space: nowrap;
        }
        tbody tr:nth-child(even) {
            background: #fafafa;
        }

        .badge {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 8px;
            font-size: 9px;
            font-weight: bold;
        }
        .badge-payer1 { background: #d1fae5; color: #047857; }
        .badge-payer2 { background: #ffe4e6; color: #be123c; }
        .badge-both   { background: #fef3c7; color: #92400e; }

        .total-row td {
            border-top: 2px solid #4f46e5;
            border-bottom: none;
            font-weight: bold;
            padding-top: 8px;
        }
        .total-row td.amount { color: #4f46e5; }

        .split {
            margin-top: 12px;
            font-size: 10px;
            color: #374151;
        }
        .split td { border: none; padding: 2px 8px 2px 0; }
        .muted { color: #9ca3af; }
        .refund { color: #047857; }

        .empty {
            padding: 20px 0;
            text-align: center;
            color: #9ca3af;
            font-style: italic;
        }
    </style>
</head>
<body>
    @foreach ($pages as $page)
        <div class="month-page">
            <div class="header">
                <h1>{{ config('app.name') }} — Relatório de Despesas</h1>
                <div class="meta">Escopo: {{ $scopeLabel }} &nbsp;·&nbsp; Gerado em {{ $generatedAt }}</div>
            </div>

            <p class="month-title">{{ $page['label'] }} <span class="muted" style="font-weight: normal; font-size: 10px;">· {{ $page['range'] }}</span></p>

            @if ($page['rows']->isEmpty())
                <p class="empty">Nenhuma despesa encontrada para este mês/escopo.</p>
            @else
                <table>
                    <thead>
                        <tr>
                            <th style="width: 60px;">Data</th>
                            <th>Descrição</th>
                            <th style="width: 90px;">Categoria</th>
                            <th style="width: 70px;">De quem</th>
                            <th class="amount" style="width: 80px;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($page['rows'] as $row)
                            <tr>
                                <td>{{ \Illuminate\Support\Carbon::parse($row->date)->format('d/m/Y') }}</td>
                                <td>
                                    {{ $row->custom_name ?: \App\Support\ExpensePresenter::splitDescription($row->description)[1] }}
                                    @if ($row->installment_number && ! str_contains($row->description, "{$row->installment_number}/{$row->installment_total}"))<span class="muted"> · parcela {{ $row->installment_number }}/{{ $row->installment_total }}</span>@endif
                                    @if ($row->notes)<br><span class="muted">{{ $row->notes }}</span>@endif
                                </td>
                                <td>{{ $row->category?->name ?? '—' }}</td>
                                <td><span class="badge badge-{{ $row->ownership }}">{{ $ownershipLabels[$row->ownership] }}</span></td>
                                <td class="amount {{ $row->direction === 'in' ? 'refund' : '' }}">{{ ($row->direction === 'in' ? '−R$ ' : 'R$ ') . number_format($row->amount, 2, ',', '.') }}</td>
                            </tr>
                        @endforeach
                        <tr class="total-row">
                            <td colspan="4">Total do mês ({{ $page['rows']->count() }} despesa(s))</td>
                            <td class="amount">{{ 'R$ ' . number_format($page['total'], 2, ',', '.') }}</td>
                        </tr>
                    </tbody>
                </table>

                @if ($showSplit)
                    <table class="split">
                        <tr>
                            <td><strong>{{ $settings->payer1_name }}</strong>: R$ {{ number_format($page['split']['payer1_total'], 2, ',', '.') }}</td>
                            <td class="muted">individual R$ {{ number_format($page['split']['payer1_individual'], 2, ',', '.') }} + {{ number_format($settings->payer1_percent, 1, ',', '.') }}% do compartilhado</td>
                        </tr>
                        <tr>
                            <td><strong>{{ $settings->payer2_name }}</strong>: R$ {{ number_format($page['split']['payer2_total'], 2, ',', '.') }}</td>
                            <td class="muted">individual R$ {{ number_format($page['split']['payer2_individual'], 2, ',', '.') }} + {{ number_format($settings->payer2_percent, 1, ',', '.') }}% do compartilhado</td>
                        </tr>
                        <tr>
                            <td colspan="2" class="muted">Compartilhado no mês: R$ {{ number_format($page['split']['shared_total'], 2, ',', '.') }} · estornos já abatidos</td>
                        </tr>
                    </table>
                @endif
            @endif
        </div>
    @endforeach
</body>
</html>
