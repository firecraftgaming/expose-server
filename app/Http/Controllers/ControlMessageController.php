<?php

namespace Expose\Server\Http\Controllers;

use Expose\Server\Configuration;
use Expose\Server\Contracts\ConnectionManager;
use Expose\Server\Exceptions\NoFreePortAvailable;
use Expose\Common\Http\QueryParameters;
use Illuminate\Support\Arr;
use Ratchet\ConnectionInterface;
use Ratchet\WebSocket\MessageComponentInterface;
use React\Promise\Deferred;
use React\Promise\PromiseInterface;
use stdClass;
use function React\Promise\reject;

class ControlMessageController implements MessageComponentInterface
{
    /** @var ConnectionManager */
    protected $connectionManager;

    /** @var Configuration */
    protected $configuration;

    public function __construct(ConnectionManager $connectionManager, Configuration $configuration)
    {
        $this->connectionManager = $connectionManager;
        $this->configuration = $configuration;
    }

    /**
     * {@inheritdoc}
     */
    public function onOpen(ConnectionInterface $connection)
    {
    }

    /**
     * {@inheritdoc}
     */
    public function onClose(ConnectionInterface $connection)
    {
        if (isset($connection->request_id)) {
            $httpConnection = $this->connectionManager->getHttpConnectionForRequestId($connection->request_id);
            $httpConnection->close();
        }

        $this->connectionManager->removeControlConnection($connection);
    }

    /**
     * {@inheritdoc}
     */
    public function onMessage(ConnectionInterface $connection, $msg)
    {
        if (isset($connection->request_id)) {
            return $this->sendResponseToHttpConnection($connection->request_id, $msg);
        }
        if (isset($connection->tcp_request_id)) {
            $connectionInfo = $this->connectionManager->findControlConnectionForClientId($connection->tcp_client_id);
            $connectionInfo->proxyConnection->write($msg);
        }

        try {
            $payload = json_decode($msg);
            $eventName = $payload->event;

            if (method_exists($this, $eventName)) {
                return call_user_func([$this, $eventName], $connection, $payload->data ?? new stdClass());
            }
        } catch (\Throwable $exception) {
            //
        }
    }

    protected function sendResponseToHttpConnection(string $requestId, $response)
    {
        $httpConnection = $this->connectionManager->getHttpConnectionForRequestId($requestId);

        $httpConnection->send($response);
    }

    protected function authenticate(ConnectionInterface $connection, $data)
    {
        if (! isset($data->subdomain)) {
            $data->subdomain = null;
        }
        if (! isset($data->type)) {
            $data->type = 'http';
        }
        if (! isset($data->server_host) || is_null($data->server_host)) {
            $data->server_host = $this->configuration->hostname();
        }

        if (! is_null($data->subdomain)) {
            $data->subdomain .= '-tunnel';

            $controlConnection = $this->connectionManager->findControlConnectionForSubdomainAndServerHost($data->subdomain, $data->server_host);
            if (! is_null($controlConnection) || $data->subdomain === config('expose-server.subdomain')) {
                $message = config('expose-server.messages.subdomain_taken');
                $message = str_replace(':subdomain', $data->subdomain, $message);

                $connection->send(json_encode([
                    'event' => 'subdomainTaken',
                    'data' => [
                        'message' => $message,
                    ],
                ]));
                $connection->close();

                return;
            }
        }

        $this->verifyAuthToken($connection)
            ->then(function () use ($connection, $data) {
                if ($data->type === 'http') {
                    $this->handleHttpConnection($connection, $data);
                } elseif ($data->type === 'tcp') {
                    $this->handleTcpConnection($connection, $data);
                }
            }, function ($error) use ($connection) {
                $message = config('expose-server.messages.invalid_auth_token');
                if ($error instanceof \Exception) {
                    $message = $error->getMessage();
                }
                
                $connection->send(json_encode([
                    'event' => 'authenticationFailed',
                    'data' => [
                        'message' => $message,
                    ],
                ]));
                $connection->close();
            });
    }

    protected function resolveConnectionMessage($connectionInfo)
    {
        $deferred = new Deferred();

        $connectionMessageResolver = config('expose-server.messages.message_of_the_day');

        if ($connectionMessageResolver instanceof PromiseInterface) {
            $connectionMessageResolver->then(function ($connectionMessage) use ($connectionInfo, $deferred) {
                $connectionInfo->message = $connectionMessage;
                $deferred->resolve($connectionInfo);
            });
        } else {
            $connectionInfo->message = $connectionMessageResolver;

            return \React\Promise\resolve($connectionInfo);
        }

        return $deferred->promise();
    }

    protected function handleHttpConnection(ConnectionInterface $connection, $data)
    {
        $connectionInfo = $this->connectionManager->storeConnection($data->host, $data->subdomain, $data->server_host, $connection);

        $this->resolveConnectionMessage($connectionInfo)
            ->then(function ($connectionInfo) use ($connection) {
                if ($connectionInfo === null) {
                    return;
                }

                $connection->send(json_encode([
                    'event' => 'authenticated',
                    'data' => [
                        'message' => $connectionInfo->message,
                        'subdomain' => $connectionInfo->subdomain,
                        'server_host' => $connectionInfo->serverHost,
                        'user' => [
                            'id' => '',
                            'name' => '', 
                            'can_specify_subdomains' => true, 
                            'can_specify_domains' => true, 
                            'can_share_tcp_ports' => true
                        ],
                        'client_id' => $connectionInfo->client_id,
                    ],
                ]));
            });
    }

    protected function handleTcpConnection(ConnectionInterface $connection, $data)
    {
        if (! $this->canShareTcpPorts($connection, $data)) {
            return;
        }

        try {
            $connectionInfo = $this->connectionManager->storeTcpConnection($data->port, $connection);
        } catch (NoFreePortAvailable $exception) {
            $connection->send(json_encode([
                'event' => 'authenticationFailed',
                'data' => [
                    'message' => config('expose-server.messages.no_free_tcp_port_available'),
                ],
            ]));
            $connection->close();

            return;
        }

        $this->resolveConnectionMessage($connectionInfo)
            ->then(function ($connectionInfo) use ($connection) {
                $connection->send(json_encode([
                    'event' => 'authenticated',
                    'data' => [
                        'message' => $connectionInfo->message,
                        'user' => [
                            'id' => '',
                            'name' => '', 
                            'can_specify_subdomains' => true, 
                            'can_specify_domains' => true, 
                            'can_share_tcp_ports' => true
                        ],
                        'port' => $connectionInfo->port,
                        'shared_port' => $connectionInfo->shared_port,
                        'client_id' => $connectionInfo->client_id,
                    ],
                ]));
            });
    }

    protected function registerProxy(ConnectionInterface $connection, $data)
    {
        $connection->request_id = $data->request_id;

        $connectionInfo = $this->connectionManager->findControlConnectionForClientId($data->client_id);

        $connectionInfo->emit('proxy_ready_'.$data->request_id, [
            $connection,
        ]);
    }

    protected function registerTcpProxy(ConnectionInterface $connection, $data)
    {
        $connection->tcp_client_id = $data->client_id;
        $connection->tcp_request_id = $data->tcp_request_id;

        $connectionInfo = $this->connectionManager->findControlConnectionForClientId($data->client_id);

        $connectionInfo->emit('tcp_proxy_ready_'.$data->tcp_request_id, [
            $connection,
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        //
    }

    protected function verifyAuthToken(ConnectionInterface $connection): PromiseInterface
    {
        $serverToken = config('expose-server.auth_token', '');
        if ($serverToken === '') {
            return \React\Promise\resolve(null);
        }

        $authToken = QueryParameters::create($connection->httpRequest)->get('authToken');
        if ($serverToken === $authToken) {
            return \React\Promise\resolve(null);
        }

        return \React\Promise\reject(new \Exception('Failed authentication'));
    }
    protected function canShareTcpPorts(ConnectionInterface $connection, $data)
    {
        if (! config('expose-server.allow_tcp_port_sharing', false)) {
            $connection->send(json_encode([
                'event' => 'authenticationFailed',
                'data' => [
                    'message' => config('expose-server.messages.tcp_port_sharing_disabled'),
                ],
            ]));
            $connection->close();

            return false;
        }

        return true;
    }
}
