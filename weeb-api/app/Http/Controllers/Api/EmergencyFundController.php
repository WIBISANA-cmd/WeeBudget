<?php

namespace App\Http\Controllers\Api;

class EmergencyFundController extends SavingGoalController
{
    public function __construct()
    {
        parent::__construct('emergency_fund');
    }
}
