(function(window, document, $, undefined) {

    // Configuration
    var orgs = ['users/nesh108'];
    var blacklist = ['gh-pages-template'];

    // Variables
    var weightFunction = 'forks';
    var showAll = false;
    var repos = [];
    var retryCount = 3;

    // Fetch the list of repositories
    function fetchRepos(deferred) {

        var deferred = deferred || new $.Deferred();

        // Only run if not yet initialized
        if (repos.length) {
            deferred.resolve(repos);
            return deferred.promise();
        }

        // Collect promises for the single api calls
        var deferredCalls = [];
        for (var i = 0, iLen = orgs.length; i < iLen; i++) {
            deferredCalls.push($.getJSON('https://api.github.com/' + orgs[i] + '/repos'));
        }

        // Wait for all calls to return and store the repositories
        $.when.apply($, deferredCalls)

        // Error handling
        .fail(function() {

            // Retry
            if (retryCount--) {
                fetchRepos(deferred);
            }
            // Nothing more to do, we're lost
            else {
                deferred.reject();
            }

        })

        // Process result
        .done(function() {

            // Add all repos
            for (var i = 0, iLen = arguments.length; i < iLen; i++) {
                if (arguments[i][1] !== 'success') {
                    continue;
                }
                repos = repos.concat(arguments[i][0]);
            }

            // Filter out unwanted repos
            repos = repos.filter(function(element, index, array) {

                // Remove forks
                if (element.fork) {
                    return false;
                }

                // Remove old github pages
                if (element.name.indexOf('.github.com') > 0) {
                    return false;
                }

                // Remove new github pages
                if (element.name.indexOf('.github.io') > 0) {
                    return false;
                }

                // Remove blacklisted repos
                if (blacklist.indexOf(element.name) >= 0) {
                    return false;
                }

                return true;
            });

            deferred.resolve(repos);
        });

        return deferred.promise();
    }

    // Update the sort weight and shown score for all repos
    function updateWeight(newWeightFunction) {

        // Update weight function if given
        weightFunction = newWeightFunction || weightFunction;

        for (var i = 0, iLen = repos.length; i < iLen; i++) {

            var repo = repos[i];

            switch (weightFunction) {
                case 'forks':
                    repo.weight = repo.forks;
                    repo.leaderboardScore = repo.weight;
                    break;

                case 'watchers':
                    repo.weight = repo.watchers;
                    repo.leaderboardScore = repo.weight;
                    break;

                case 'watchfork':
                    repo.weight = repo.forks + repo.watchers;
                    repo.leaderboardScore = repo.weight;
                    break;

                case 'recent':
                    repo.weight = (new Date(repo.updated_at).getTime());
                    repo.leaderboardScore = '';
                    break;
                case 'weighted':
                default:
                    // forks * 3 + watchers - last update days * 5
                    repo.weight = (repo.forks * 3) + repo.watchers - (Math.floor((Date.now() - new Date(repo.updated_at).getTime()) / 86400000) * 5);
                    repo.leaderboardScore = repo.weight;
                    break;
            }
        }

        // Sort by new weight
        repos.sort(function(a, b) {
            return b.weight - a.weight;
        });
    }

    // Render the repos into the leaderboard
    function renderLeaderboard() {

        var container = $('#leaderboard');
        container.empty();

        for (var i = 0, iLen = (showAll ? repos.length : (repos.length > 10 ? 10 : repos.length)); i < iLen; i++) {
            var repo = repos[i];
            var elem = $(
                '<li class="' + (repo.language || '').toLowerCase() + ' place' + (i + 1) + '">' +
                    '<a href="' + (repo.homepage ? repo.homepage : repo.html_url) + '">' +
                        (i > 9 ? '' : '<span class="place place' + (i + 1) + '">' + (i + 1) + '</span>') +
                        '<span class="name">' + repo.full_name + '</span><br />' +
                        repo.description + '<br />' +
                        '<span class="details">' +
                            'Forks: ' + repo.forks +
                            ' &nbsp;&nbsp;&bull;&nbsp;&nbsp; Watchers: ' + repo.watchers +
                            ' &nbsp;&nbsp;&bull;&nbsp;&nbsp; Open Issues: ' + repo.open_issues +
                            ' &nbsp;&nbsp;&bull;&nbsp;&nbsp; Last Updated: ' + $.timeago(repo.updated_at) +
                        '</span>' +
                        (i > 9 ? '' : '<span class="score">' +
                            (i == 0 ? '<span class="trophy"></span>' : '') +
                            repo.leaderboardScore +
                        '</span>') +
                    '</a>' +
                '</li>');
            container.append(elem);
        }

        if (showAll) {
            $('#leaderboardShowAll').text('View only top ten repos');
        }
        else {
            $('#leaderboardShowAll').text('View all ' + repos.length + ' repos');
        }

    }

    $(document).ready(function() {

        fetchRepos().done(function() {

            $('#content .loading').remove();

            updateWeight();
            renderLeaderboard();

            // Bind click handlers after data is loaded, to avoid corrupt states
            $('#leaderboardShowAll').click(function() {
                showAll = !showAll;
                renderLeaderboard();
            });

            $('#leaderboardNav li').click(function() {
                updateWeight(this.getAttribute('data-filter'));
                renderLeaderboard();
                $('#leaderboardNav li').removeClass('active');
                $(this).addClass('active');
            });

        }).fail(function() {
            $('#content .loading').text('Loading failed, please try again later.');
        });

    });

})(window, document, jQuery);
