<html>
<head>
    <title>Expose</title>
    <meta charset="UTF-8">
    <script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#DE4E78',
                        gray: {
                            50: '#fafafa',
                            100: '#f4f4f5',
                            200: '#e4e4e7',
                            300: '#d4d4d8',
                            400: '#a1a1aa',
                            500: '#71717a',
                            600: '#52525b',
                            700: '#3f3f46',
                            800: '#27272a',
                            900: '#18181b',
                            950: '#09090b',
                        }
                    },
                }
            }
        }
    </script>
</head>
<body>
<div class="relative min-h-screen bg-white dark:bg-gray-800">
    <div id="stats">
        <nav>
            <div class="max-w-7xl mx-auto py-4 px-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between">
                <div class="flex space-x-8 items-center text-base">
                    <div class="inline-flex items-center self-start">
                        <img src="https://beyondco.de/apps/icons/expose.png" alt="expose.dev" class="h-8 lg:h-10">
                        <div class="ml-4"><p class="text-lg lg:text-2xl tracking-tight font-bold dark:text-white">
                                Expose</p>
                            <p class="text-xs text-gray-400">by Beyond Code</p></div>
                    </div>
                </div>
                <div class="flex space-x-4 items-center mt-4 md:mt-0">
                    <a href="/sites"
                       class="leading-5 transition duration-150 ease-in-out"
                       v-bind:class="{ 'text-primary font-bold': currentRequest === 'sites', 'text-gray-800 dark:text-gray-200 dark:hover:text-gray-100 font-medium ': currentRequest !== 'sites' }">
                        Sites
                    </a>

                    <a href="/settings"
                       class="leading-5 transition duration-150 ease-in-out"
                       v-bind:class="{ 'text-primary font-bold': currentRequest === 'settings', 'text-gray-800 dark:text-gray-200 dark:hover:text-gray-100 font-medium ': currentRequest !== 'settings' }">
                        Settings
                    </a>
                </div>

                <div class="flex items-center justify-end md:justify-start text-lg font-bold text-gray-400 dark:text-gray-600">
                    @{ serverKey }
                </div>
            </div>
        </nav>

        <div class="border-b border-gray-200 dark:border-gray-700"></div>

        <div class="max-w-7xl mx-auto grid gap-4 md:grid-cols-3 py-12 px-8">
            <div class="rounded-md bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-200 shadow">
                <div class="gap-y-1.5 p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 class="tracking-tight text-sm font-medium"> Sites </h3>
                    @include('icons.computer-desktop')
                </div>
                <div class="p-6 pt-0">
                    <div class="text-2xl text-gray-800 dark:text-gray-100 font-bold">
                        @{ siteCount }
                    </div>
                    <p class="text-xs text-muted-foreground"> Live </p>
                </div>
            </div>
            <div class="rounded-md bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-200 shadow">
                <div class="gap-y-1.5 p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 class="tracking-tight text-sm font-medium"> Unique sites </h3>
                    @include('icons.computer-desktop')
                </div>
                <div class="p-6 pt-0">
                    <div class="text-2xl text-gray-800 dark:text-gray-100 font-bold">
                        @{ statistics.unique_shared_sites }
                    </div>
                    <p class="text-xs text-muted-foreground"> This week </p>
                </div>
            </div>
            <div class="rounded-md bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-200 shadow">
                <div class="gap-y-1.5 p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 class="tracking-tight text-sm font-medium"> Total sites </h3>
                    @include('icons.computer-desktop')
                </div>
                <div class="p-6 pt-0">
                    <div class="text-2xl text-gray-800 dark:text-gray-100 font-bold">
                        @{ statistics.shared_sites }
                    </div>
                    <p class="text-xs text-muted-foreground"> This week </p>
                </div>
            </div>

            <div class="rounded-md bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-400 shadow">
                <div class="gap-y-1.5 p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 class="tracking-tight text-sm font-medium dark:text-gray-200"> Incoming requests </h3>
                    @include('icons.arrows-right-left')
                </div>
                <div class="p-6 pt-0">
                    <div class="text-2xl text-gray-800 dark:text-gray-100 font-bold">
                        @{ statistics.incoming_requests }
                    </div>
                    <p class="text-xs text-muted-foreground"> This week </p>
                </div>
            </div>

            <div class="flex justify-end items-end text-right text-xs text-gray-400">

                Interval: @{ statisticsInterval } seconds,
                Timestamp: @{ statistics.timestamp }
            </div>
        </div>
    </div>
    <div class="py-10">
        <header>
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 class="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
                    @yield('title')
                </h1>
            </div>
        </header>
        <main>
            <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 text-gray-700 dark:text-gray-100" id="app">
                @yield('content')
            </div>
        </main>
    </div>
</div>


@yield('scripts')
<script>
    new Vue({
        el: '#stats',

        delimiters: ['@{', '}'],

        data: {
            siteCount: 0,
            statistics: {},
            serverKey: '',
            statisticsInterval: 0
        },

        methods: {
            getDashboardStats() {
                fetch('/api/dashboard')
                    .then((response) => {
                        return response.json();
                    }).then((data) => {
                    this.siteCount = data.siteCount;
                    this.statistics = data.statistics[0]
                    this.serverKey = data.serverKey;
                    this.statisticsInterval = data.statisticsInterval;
                });
            },
        },

        computed: {
            currentRequest() {
                const path = window.location.pathname;
                return path.substring(path.lastIndexOf('/') + 1);
            }
        },

        mounted() {
            this.getDashboardStats()
        }
    })
</script>
</body>
</html>
