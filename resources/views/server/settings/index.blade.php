@extends('server.layouts.app')
@section('title')
    Settings
@endsection

@section('content')
    <div class="flex flex-col py-8" id="app">
        <form method="POST"
              class="md:grid md:grid-cols-2 md:space-x-8 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-300 shadow-sm !pt-2 px-2">

            <div class="">
                <div class="flex items-center justify-between">
                    <h2 class="font-medium text-gray-800 dark:text-white text-base font-headline mb-4 mb-0 pl-2 mt-2 ">
                        Messages
                    </h2>
                </div>
                <div class="pl-2 pt-0 space-y-6">

                    <div>
                        <label for="motd"
                               class="font-medium text-gray-800 dark:text-gray-100 text-sm font-medium dark:text-gray-100 mb-1">
                            Message of the day
                        </label>
                        <div class="">
                                            <textarea id="motd" rows="3"
                                                      v-model="configuration.messages.message_of_the_day"
                                                      class="w-full border rounded-lg block disabled:shadow-none dark:shadow-none appearance-none text-base sm:text-sm py-2 leading-[1.375rem] pl-3 pr-3 bg-white dark:bg-white/10 dark:disabled:bg-white/[7%] text-gray-700 disabled:text-gray-500 placeholder-gray-400 disabled:placeholder-gray-400/70 dark:text-gray-300 dark:disabled:text-gray-400 dark:placeholder-gray-400 dark:disabled:placeholder-gray-500 shadow-sm border-gray-200 border-b-gray-300/80 disabled:border-b-gray-200 dark:border-white/10 dark:disabled:border-white/5"
                                            ></textarea>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-200">This message will be shown when a
                                successful connection can be established.</p>
                        </div>
                    </div>

                    <div>
                        <label for="invalid_auth_token"
                               class="font-medium text-gray-800 dark:text-gray-100 text-sm font-medium dark:text-gray-100 mb-1">
                            Authentication Failed
                        </label>
                        <div class="">
                                            <textarea id="invalid_auth_token" rows="3"
                                                      v-model="configuration.messages.invalid_auth_token"
                                                      class="w-full border rounded-lg block disabled:shadow-none dark:shadow-none appearance-none text-base sm:text-sm py-2 leading-[1.375rem] pl-3 pr-3 bg-white dark:bg-white/10 dark:disabled:bg-white/[7%] text-gray-700 disabled:text-gray-500 placeholder-gray-400 disabled:placeholder-gray-400/70 dark:text-gray-300 dark:disabled:text-gray-400 dark:placeholder-gray-400 dark:disabled:placeholder-gray-500 shadow-sm border-gray-200 border-b-gray-300/80 disabled:border-b-gray-200 dark:border-white/10 dark:disabled:border-white/5"
                                            ></textarea>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-200">
                                This message will be shown when a user tries to connect with an invalid
                                authentication token.
                            </p>
                        </div>
                    </div>


                    <div>
                        <label for="subdomain_taken"
                               class="font-medium text-gray-800 dark:text-gray-100 text-sm font-medium dark:text-gray-100 mb-1">
                            Subdomain taken
                        </label>
                        <div class="">
                                            <textarea id="subdomain_taken" rows="3"
                                                      v-model="configuration.messages.subdomain_taken"
                                                      class="w-full border rounded-lg block disabled:shadow-none dark:shadow-none appearance-none text-base sm:text-sm py-2 leading-[1.375rem] pl-3 pr-3 bg-white dark:bg-white/10 dark:disabled:bg-white/[7%] text-gray-700 disabled:text-gray-500 placeholder-gray-400 disabled:placeholder-gray-400/70 dark:text-gray-300 dark:disabled:text-gray-400 dark:placeholder-gray-400 dark:disabled:placeholder-gray-500 shadow-sm border-gray-200 border-b-gray-300/80 disabled:border-b-gray-200 dark:border-white/10 dark:disabled:border-white/5"
                                            ></textarea>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-200">
                                This message will be shown when a
                                user tries to connect with an already registered subdomain. You can use
                                <code class="font-mono">:subdomain</code> as
                                a placeholder.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label for="custom_subdomain_unauthorized"
                               class="font-medium text-gray-800 dark:text-gray-100 text-sm font-medium dark:text-gray-100 mb-1">
                            Custom Subdomain Unauthorized
                        </label>
                        <div class="">
                                            <textarea id="custom_subdomain_unauthorized" rows="3"
                                                      v-model="configuration.messages.custom_subdomain_unauthorized"
                                                      class="w-full border rounded-lg block disabled:shadow-none dark:shadow-none appearance-none text-base sm:text-sm py-2 leading-[1.375rem] pl-3 pr-3 bg-white dark:bg-white/10 dark:disabled:bg-white/[7%] text-gray-700 disabled:text-gray-500 placeholder-gray-400 disabled:placeholder-gray-400/70 dark:text-gray-300 dark:disabled:text-gray-400 dark:placeholder-gray-400 dark:disabled:placeholder-gray-500 shadow-sm border-gray-200 border-b-gray-300/80 disabled:border-b-gray-200 dark:border-white/10 dark:disabled:border-white/5"
                                            ></textarea>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-200">
                                This message will be shown when a user
                                tries to use a custom subdomain, but is not allowed to.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
            <div class="mt-8 md:mt-0">
                <div class="flex items-center justify-between w-full">
                    <h2 class="font-medium text-gray-800 dark:text-white text-base font-headline mb-4 mb-0 pl-2 mt-2 ">
                        Access
                    </h2>
                </div>
                <div class="pl-2 pt-0 space-y-6">
                    <div>
                        <label for="maximum_connection_length"
                               class="font-medium text-gray-800 dark:text-gray-100 text-sm font-medium dark:text-gray-100 mb-1">
                            Maximum connection length
                        </label>
                        <div class="">
                            <input id="maximum_connection_length"
                                   type="number"
                                   v-model="configuration.maximum_connection_length"
                                   class=" border rounded-lg block disabled:shadow-none dark:shadow-none appearance-none text-base sm:text-sm py-2 h-10 leading-[1.375rem] pl-3 pr-3 bg-white dark:bg-white/10 dark:disabled:bg-white/[7%] text-gray-700 disabled:text-gray-500 placeholder-gray-400 disabled:placeholder-gray-400/70 dark:text-gray-300 dark:disabled:text-gray-400 dark:placeholder-gray-400 dark:disabled:placeholder-gray-500 shadow-sm border-gray-200 border-b-gray-300/80 disabled:border-b-gray-200 dark:border-white/10 dark:disabled:border-white/5"/>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-200">
                                The amount of minutes that clients may be connected to this expose server. 0 means there
                                is no limit.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
            <div class="flex items-end space-x-4 justify-end mt-8 -mb-2 col-span-2">
                <div>
                    <p v-if="success" class="text-xs text-gray-500 dark:text-gray-200">
                        Saved.
                    </p>
                    <p v-if="error" class="text-xs text-red-500">
                        An error occurred.
                    </p>
                </div>
                <button type="submit"
                        @click.prevent="saveSettings"
                        class="w-16 items-center font-medium justify-center gap-2 whitespace-nowrap group disabled:opacity-75 dark:disabled:opacity-75 disabled:cursor-default disabled:pointer-events-none h-10 text-sm rounded-lg px-4 inline-flex  primary-button font-medium bg-primary text-white dark:shadow-none *:transition-opacity">
                    <template v-if="!loading">
                        Save
                    </template>
                    <template v-else>
                        <div class="h-3 w-3 border-white border-b border-t border-r animate-spin rounded-full"></div>
                    </template>
                </button>
            </div>
        </form>
    </div>
@endsection
@section('scripts')
    <script>
        new Vue({
            el: '#app',

            delimiters: ['@{', '}'],

            data: {
                configuration: {{Illuminate\Support\Js::from($configuration)}},
                loading: false,
                success: false,
                error: false
            },

            methods: {
                saveSettings() {
                    this.loading = true
                    this.success = this.error = false
                    fetch('/api/settings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(this.configuration)
                    }).then((response) => {
                        this.loading = false
                        return response.json();
                    }).then((data) => {
                        this.success = true
                        this.configuration = data.configuration;

                        setTimeout(() => {
                            this.success = false
                        }, 3000)
                    })
                        .catch((e) => {
                            this.error = true
                            console.error(e)
                        })
                }
            }
        })
    </script>
@endsection
