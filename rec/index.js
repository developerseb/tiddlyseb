(function() {
    // Client ID and API key from the Developer Console
// https://console.cloud.google.com/apis/api/drive.googleapis.com/credentials?project=tiddlydrive-438714
    var CLIENT_ID = '515091421041-sqvplabab68ral9tbs5igmaqho1uq476.apps.googleusercontent.com';
    var API_KEY = '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'; // disabled in the console (can be re-enabled)

    // Array of API discovery doc URLs for APIs used by the quickstart
    var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

    // Authorization scopes required by the API; multiple scopes can be
    // included, separated by spaces.
    var SCOPES = 'https://www.googleapis.com/auth/drive.file';


    /**
     *  On load, called to load the auth2 library and API client library.
     */
    window.handleClientLoad = function() {
        gapi.load('client:auth2', {
            callback: initClient
        });
    }

    /**
     *  Initializes the API client library and sets up sign-in state
     *  listeners.
     */

    function onError(e) {
        var code = "";
        try {
            code = e.error;
        } catch (er) {}

        var span = "";
        if (-1 < code.indexOf("popup")) {
            span = "Please ensure that you have allowed popups";
        }
        showWarning("Error", "<span>" + span + "</span><br><br><b>Error message:</b><pre>" + $('<div>').text(JSON
            .stringify(e, null, 2)).html() + "</pre>");
    }

    function initClient() {
        gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
        }).then(function() {
            // Listen for sign-in state changes.
            gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

            // Handle the initial sign-in state.
            updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        });
	    console.log(CLIENT_ID);
    }

    /**
     *  Called when the signed in status changes, to update the UI
     *  appropriately. After a sign-in, the API is called.
     */
    function updateSigninStatus(isSignedIn) {
        if (isSignedIn) {
            fetch_file();
        } else {
            gapi.auth2.getAuthInstance().signIn().catch(onError);
        }
    }

    // Helper functions ******
    function readCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function is_prod() {
        return "developerseb.github.io/tiddlyseb" == window.location.hostname && ["/", "", "?", "/?"].indexOf(window.location
            .pathname) != -1; // Variation for compatibility
    }

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    function needLegacySrc() {
        return getParameterByName('legacysrc') === 'true' || (typeof InstallTrigger !==
        'undefined'); //Is the browser either FireFox or are we forcing legacy support?
    }

    function showWarning(title, body) {
        $("#dlg-warning-title").text(title);
        $("#dlg-warning-body").html(body);
        $("#dlg-warning").modal("open");
    }

    // *****************

    function fetch_file() {
        var state = JSON.parse(getParameterByName('state'));
	    console.log(state);
        if (state == null) {
            $('#loader').hide();
            $('#nofile-msg').show();
            $('#content').hide();
            return;
        }
        gapi.client.drive.files.get({
            'fileId': state.ids.pop(),
            'alt': 'media'
        }).then(function(file) {
            if (needLegacySrc()) {
                $('#content')[0].contentWindow.document.open('text/html', 'replace');
                $('#content')[0].contentWindow.document.write(file.body);
                $('#content')[0].contentWindow.document.close();
            } else {
                $('#content')[0].srcdoc = file.body;
            }
            setupSaver();
            $('#loader').hide();
        }).catch(function(err) {
		alert(err);
		console.log(err);
            $('#loader').hide();
            $('#error-msg').show();
        });
    }

    function saver(text, method, callback, options) {
        if ($('#disable-save')[0].checked || !$('#enable-autosave')[0].checked && method === 'autosave') {
            return false;
        }
        var $tw = $('#content')[0].contentWindow.$tw;
        if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
            var request = gapi.client.request({
                'path': '/upload/drive/v2/files/' + JSON.parse(getParameterByName('state')).ids.pop(),
                'method': 'PUT',
                'params': {
                    'uploadType': 'multipart',
                    'alt': 'json'
                },
                'headers': {
                    'Content-Type': 'text/html'
                },
                'body': text
            });
            request.execute(function(res) {
                if (typeof res === 'object' && typeof res.error !== 'object') {
                    $tw.saverHandler.numChanges = 0;
                    $tw.saverHandler.updateDirtyStatus();
                    Materialize.toast("Saved to Drive", 2000);
                } else if (typeof res === 'object' && typeof res.error === 'object') {
                    callback(res.error.message);
                } else {
                    callback('Unknown error.');
                }
            });
            return true;
        } else {
            callback('Not authorized.');
            return false;
        }
    }


    function setupSaver() {
        try {
            var $tw = $('#content')[0].contentWindow.$tw;
        } catch (e) {
            console.log(e);
        }
        if (typeof($tw) !== "undefined" && $tw && $tw.saverHandler && $tw.saverHandler.savers) {
            $tw.saverHandler.savers.push({
                info: {
                    name: "tiddly-drive",
                    priority: 5000,
                    capabilities: ["save", "autosave"]
                },
                save: saver
            });
            //Set the title
            $('#top-title').text($('#content')[0].contentWindow.document.getElementsByTagName("title")[0]
            .innerText);

            if (!needLegacySrc()) {
                //Watch the title
                $('#content')[0].contentWindow.document.getElementsByTagName("title")[0].addEventListener(
                    "DOMSubtreeModified",
                    function(evt) {
                        $('#top-title').text(evt.target.innerText);
                    }, false);

                //Watch hash
                $(window).on("hashchange", function() {
                    console.log("Before parent->child");
                    $('#content')[0].contentWindow.location.hash = location.hash;
                    console.log("After parent->child");
                });

                $($('#content')[0].contentWindow).on("hashchange", function() {
                    console.log("Before child->parent");
                    location.hash = $('#content')[0].contentWindow.location.hash;
                    console.log("After child->parent");
                });
            }

            //Enable hotkey saving
            function save_hotkey(event) {
                if (!(event.which == 115 && event.ctrlKey) && !(event.which == 19) || !$('#enable-hotkey-save')[0]
                    .checked) return true;
                var $tw = $('#content')[0].contentWindow.$tw;
                $tw.saverHandler.saveWiki();
                event.preventDefault();
                return false;
            }

            $(window).keypress(save_hotkey);
            $($('#content')[0].contentWindow).keypress(save_hotkey);
        } else {
            setTimeout(setupSaver, 1000);
        }
    }

    function getPayfastLink(amount) {
        return ();
    }

    $(window).on('load', function() {

		  $.ajax('https://lordratte.gitlab.io/f/tiddlydrive.json').then(function(result) {
          const template = document.getElementById('news_row');
					result.forEach(function(post) {
						if (post.title) {
							var node = document.importNode(template.content, true);
							try {
								var t = node.querySelector('.card-title');
								var c  = node.querySelector('.card-content');
								var l  = node.querySelector('.card-link');
								c.innerText = post.title;
								l.href = post.url;
								// May be blank:
								t.innerText = (post.date.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)||[]).pop() || '';
							} catch (e) {
								l.innerText = 'Go';
							}
							document.getElementById('news_rows').appendChild(node);
						}
          });

				});

        $('.modal').modal({
            "ready": function() {
                $('ul.tabs').tabs('select_tab', 'options');
            }
        });
        $('#hide-fab').click(function() {
            $('#open-settings').hide();
        });
        $('#auth').click(function() {
            gapi.auth2.getAuthInstance().signIn();
        });

        //Handle checkboxes
        $('#enable-autosave')[0].checked = readCookie('enableautosave') !== 'false';
        $('#enable-autosave').change(function() {
            function createCookie(name, value, days) {
                var expires = "";
                if (days) {
                    var date = new Date();
                    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                    expires = "; expires=" + date.toUTCString();
                }
                document.cookie = name + "=" + value + expires + "; path=/";
            }
            createCookie('enableautosave', this.checked, 364);
        });

        $('#enable-hotkey-save')[0].checked = readCookie('enablehotkeysave') !== 'false';
        $('#enable-hotkey-save').change(function() {
            function createCookie(name, value, days) {
                var expires = "";
                if (days) {
                    var date = new Date();
                    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                    expires = "; expires=" + date.toUTCString();
                }
                document.cookie = name + "=" + value + expires + "; path=/";
            }
            createCookie('enablehotkeysave', this.checked, 364);
        });

        $('#disable-save')[0].checked = readCookie('disablesave') === 'true';
        $('#disable-save').change(function() {
            function createCookie(name, value, days) {
                var expires = "";
                if (days) {
                    var date = new Date();
                    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                    expires = "; expires=" + date.toUTCString();
                }
                document.cookie = name + "=" + value + expires + "; path=/";
            }
            createCookie('disablesave', this.checked, 364);
        });

        $("#donate_amount").change(function() {
            if (!$("#donate_amount").hasClass("invalid")) {
                $("#payfastlink").attr("href", getPayfastLink($("#donate_amount").val()));
            }
        });
        $("#payfastlink").attr("href", getPayfastLink($("#donate_amount").attr(
        "value"))); //Get the default amount


        if (needLegacySrc()) {
            $('.legacy-mode').show();
        }

        btcdonate();

        if (!is_prod()) {
            $('#nonprod-warning').modal('open');
            $('.dev').show();
        } else $('.prod').show();

        $('ul.tabs').tabs();
    });
})();
