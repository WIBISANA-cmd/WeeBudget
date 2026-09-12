<?php

namespace App\Database;

use Illuminate\Database\PostgresConnection;

/**
 * Postgres with emulated prepares: one round trip per query instead of parse + execute.
 * On a remote database (~50ms RTT) that is the difference between 220ms and 85ms a query.
 *
 * Emulation inlines the bindings as literals, and Laravel casts booleans to 1/0 — which
 * Postgres refuses to compare against a boolean column. Binding them as 'true'/'false'
 * keeps them untyped literals that Postgres coerces to boolean itself.
 */
class PostgresEmulatedPrepareConnection extends PostgresConnection
{
    public function prepareBindings(array $bindings)
    {
        foreach ($bindings as $key => $value) {
            if (is_bool($value)) {
                $bindings[$key] = $value ? 'true' : 'false';
            }
        }

        return parent::prepareBindings($bindings);
    }
}
