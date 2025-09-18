#!/bin/bash

sed -i "s|username|${username}|g" ${exposeConfigPath} && sed -i "s|password|${password}|g" ${exposeConfigPath}

if [[ $# -eq 0 ]]; then
    exec /src/expose-server serve ${domain} --port ${port}
else
    exec /src/expose-server "$@"
fi
