<?php

namespace App\Http\Controllers\Api;

class IncomeController extends TransactionController
{
    public function __construct()
    {
        parent::__construct('income');
    }
}
