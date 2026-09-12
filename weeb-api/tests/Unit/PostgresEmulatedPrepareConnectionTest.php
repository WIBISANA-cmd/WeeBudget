<?php

namespace Tests\Unit;

use App\Database\PostgresEmulatedPrepareConnection;
use PHPUnit\Framework\TestCase;

class PostgresEmulatedPrepareConnectionTest extends TestCase
{
    public function test_booleans_bind_as_postgres_boolean_literals(): void
    {
        // With emulated prepares Laravel's 1/0 would be inlined as integers, and Postgres
        // refuses "boolean = integer" — every is_active filter in the app would 500.
        $connection = new PostgresEmulatedPrepareConnection(fn () => null, 'testing');

        $this->assertSame(
            ['true', 'false', 3, 'text', null],
            $connection->prepareBindings([true, false, 3, 'text', null]),
        );
    }
}
