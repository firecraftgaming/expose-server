<?php

namespace Expose\Server\Http\Controllers\Admin;

use Expose\Server\Configuration;
use Expose\Server\Connections\ControlConnection;
use Expose\Server\Contracts\ConnectionManager;
use Illuminate\Http\Request;
use Ratchet\ConnectionInterface;

class GetSitesController extends AdminController
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
        $sites = collect($this->connectionManager->getConnections())
            ->filter(function ($connection) {
                return get_class($connection) === ControlConnection::class;
            })
            ->map(function ($site, $siteId) use (&$authTokens) {
                $site = $site->toArray();
                $site['id'] = $siteId;

                return $site;
            })->values();

        $httpConnection->send(
            respond_json([
                'sites' => $sites,
            ])
        );

        $httpConnection->close();
    }
}
