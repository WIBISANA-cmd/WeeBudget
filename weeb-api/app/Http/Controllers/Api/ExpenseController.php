<?php

namespace App\Http\Controllers\Api;

class ExpenseController extends TransactionController
{
    public function __construct()
    {
        parent::__construct('expense');
    }
}
