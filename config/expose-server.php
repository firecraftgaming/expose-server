<?php

$authToken = getenv('auth_token');

return [
    /*
    |--------------------------------------------------------------------------
    | Maximum Allowed Memory
    |--------------------------------------------------------------------------
    |
    | The maximum memory allocated to the expose-server process.
    |
    */
    'memory_limit' => '128M',


    /*
    |--------------------------------------------------------------------------
    | Database
    |--------------------------------------------------------------------------
    |
    | The SQLite database that your expose server should use. This database
    | will hold all users that are able to authenticate with your server,
    | if you enable authentication token validation.
    |
    */
    'database' => implode(DIRECTORY_SEPARATOR, [
        $_SERVER['HOME'] ?? __DIR__,
        '.expose',
        'expose.db',
    ]),

    /*
    |--------------------------------------------------------------------------
    | Validate auth tokens
    |--------------------------------------------------------------------------
    |
    | By default, once you start an expose server, anyone is able to connect to
    | it, given that they know the server host. If you want to only allow the
    | connection from users that have valid authentication tokens, set this
    | setting to true. You can also modify this at runtime in the server
    | admin interface.
    |
    */
    'auth_token' => $authToken,

    /*
    |--------------------------------------------------------------------------
    | Subdomain
    |--------------------------------------------------------------------------
    |
    | This is the subdomain that your expose admin dashboard will be available at.
    | The given subdomain will be reserved, so no other tunnel connection can
    | request this subdomain for their own connection.
    |
    */
    'subdomain' => 'admin-tunnel',

    /*
    |--------------------------------------------------------------------------
    | Reserved Subdomain
    |--------------------------------------------------------------------------
    |
    | Specify any subdomains that you don't want to be able to register
    | on your expose server.
    |
    */
    'reserved_subdomains' => [],

    /*
    |--------------------------------------------------------------------------
    | Subdomain Generator
    |--------------------------------------------------------------------------
    |
    | This is the subdomain generator that will be used, when no specific
    | subdomain was provided. The default implementation simply generates
    | a random string for you. Feel free to change this.
    |
    */
    'subdomain_generator' => \Expose\Server\SubdomainGenerator\RandomSubdomainGenerator::class,

    /*
    |--------------------------------------------------------------------------
    | Connection Callback
    |--------------------------------------------------------------------------
    |
    | This is a callback method that will be called when a new connection is
    | established.
    | The \Expose\Server\Callbacks\WebHookConnectionCallback::class is included out of the box.
    |
    */
    'connection_callback' => null,


    'connection_callbacks' => [
        'webhook' => [
            'url' => null,
            'secret' => null,
        ],
    ],

    /*
        |--------------------------------------------------------------------------
        | Users
        |--------------------------------------------------------------------------
        |
        | The admin dashboard of expose is protected via HTTP basic authentication
        | Here you may add the user/password combinations that you want to
        | accept as valid logins for the dashboard.
        |
        */
    'users' => [
        'admin' => $authToken,
    ],

    /*
    |--------------------------------------------------------------------------
    | Messages
    |--------------------------------------------------------------------------
    |
    | The default messages that the expose server will send the clients.
    | These settings can also be changed at runtime in the expose admin
    | interface.
    |
    */
    'messages' => [
        'message_of_the_day' => 'Thank you for using expose.',

        'invalid_auth_token' => 'Authentication failed. Please check your authentication token and try again.',

        'subdomain_taken' => 'The chosen subdomain :subdomain is already taken. Please choose a different subdomain.',
    ],

    'statistics' => [
        'enable_statistics' => true,

        'interval_in_seconds' => 3600,

        'repository' => \Expose\Server\StatisticsRepository\DatabaseStatisticsRepository::class,
    ],
];
