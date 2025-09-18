<?php

namespace Expose\Server\SubdomainGenerator;

use Expose\Server\Contracts\SubdomainGenerator;
use Illuminate\Support\Str;

class RandomSubdomainGenerator implements SubdomainGenerator
{
    public function generateSubdomain(): string
    {
        return strtolower(Str::random(10)) . '-tunnel';
    }
}
