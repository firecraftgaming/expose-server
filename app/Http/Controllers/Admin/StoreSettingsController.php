<?php

namespace Expose\Server\Http\Controllers\Admin;

use Expose\Server\Configuration;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Ratchet\ConnectionInterface;

class StoreSettingsController extends AdminController
{
    /** @var Configuration */
    protected $configuration;

    public function __construct(Configuration $configuration)
    {
        $this->configuration = $configuration;
    }

    public function handle(Request $request, ConnectionInterface $httpConnection)
    {
        $messages = $request->get('messages');

        config()->set('expose-server.messages.invalid_auth_token', Arr::get($messages, 'invalid_auth_token'));

        config()->set('expose-server.messages.subdomain_taken', Arr::get($messages, 'subdomain_taken'));

        config()->set('expose-server.messages.message_of_the_day', Arr::get($messages, 'message_of_the_day'));

        $httpConnection->send(
            respond_json([
                'configuration' => $this->configuration,
            ])
        );
    }
}
