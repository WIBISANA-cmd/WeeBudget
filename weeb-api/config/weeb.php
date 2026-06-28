<?php

return [
    'allow_guest_user' => filter_var(env('WEEB_ALLOW_GUEST_USER', false), FILTER_VALIDATE_BOOL),
    'default_user_email' => env('WEEB_DEFAULT_USER_EMAIL', 'local@weeb.id'),
    'default_user_name' => env('WEEB_DEFAULT_USER_NAME', 'Teman WeeB'),
    'vapid_public_key' => env('WEEB_VAPID_PUBLIC_KEY'),
    'vapid_private_key' => env('WEEB_VAPID_PRIVATE_KEY'),
];
