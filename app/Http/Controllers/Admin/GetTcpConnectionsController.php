<?php

namespace Expose\Server\Http\Controllers\Admin;

use Expose\Server\Configuration;
use Expose\Server\Connections\TcpControlConnection;
use Expose\Server\Contracts\ConnectionManager;
use Illuminate\Http\Request;
use Ratchet\ConnectionInterface;

class GetTcpConnectionsController extends AdminController
{
    protected $keepConnectionOpen = true;

    /** @var ConnectionManager */
    protected $connectionManager;

    /** @var Configuration */
    protected $configuration;

    public function __construct(ConnectionManager $connectionManager, Configuration $configuration)
    {
        $this->connectionManager = $connectionManager;
    }

    public function handle(Request $request, ConnectionInterface $httpConnection)
    {
        $connections = collect($this->connectionManager->getConnections())
            ->filter(function ($connection) {
                return get_class($connection) === TcpControlConnection::class;
            })
            ->map(function ($site, $siteId) use (&$authTokens) {
                $site = $site->toArray();
                $site['id'] = $siteId;

                return $site;
            })
            ->values();

        $httpConnection->send(
            respond_json([
                'tcp_connections' => $connections,
            ])
        );

        $httpConnection->close();
    }
}
