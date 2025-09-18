<?php

namespace Expose\Server\Http\Controllers\Admin;

use Expose\Server\Contracts\ConnectionManager;
use Expose\Server\Contracts\StatisticsRepository;
use Illuminate\Http\Request;
use Ratchet\ConnectionInterface;
use function React\Promise\all;

class GetDashboardStatsController extends AdminController
{
    protected $keepConnectionOpen = true;

    protected ConnectionManager $connectionManager;

    protected StatisticsRepository $statisticsRepository;

    public function __construct(ConnectionManager $connectionManager, StatisticsRepository $statisticsRepository)
    {
        $this->connectionManager = $connectionManager;
        $this->statisticsRepository = $statisticsRepository;
    }

    public function handle(Request $request, ConnectionInterface $httpConnection)
    {

        all([
            'serverKey'=> config('expose-server.subdomain'),
            'siteCount' => \React\Promise\resolve(count($this->connectionManager->getConnections())),
            'statistics' => $this->statisticsRepository->getStatistics(today()->subWeek()->toDateString(), today()->toDateString()),
            'statisticsInterval' => config('expose-server.statistics.interval_in_seconds')
        ])->then(function ($results) use ($httpConnection) {
            $httpConnection->send(
                respond_json($results)
            );

            $httpConnection->close();
        });
    }
}
