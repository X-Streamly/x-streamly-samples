// Sound check
if (typeof soundManager !== "undefined") {
    soundManager.url = "/soundmanager/swf/";
    soundManager.debugMode = document.location.hash === "#debug";
    soundManager.onready(function() {
        if (soundManager.supported()) {
            soundManager.createSound({
                id: "click",
                url: "/whirr.mp3"
            });
        }
    });
    soundManager.onerror = function() {
    };
}

jQuery(function() {
    // Automatic updates (evil)
    if (jQuery('.update_me_automatically').length > 0) {
        setInterval(function() {
            jQuery.get(window.location.href, function(data) {
                jQuery('.update_me_automatically').each(function() {
                    var html = jQuery(data).find('#' + this.id).html();
                    jQuery(this).html(html);
                });
            });
        }, 15000);
    }

    // Channel search form
    jQuery(".js-channel-redirect").submit(function(event) {
        event.preventDefault();
        var channelName = jQuery(this).find("#channel").val();
        channelName = channelName.replace(/^#/, "");
        window.location = channelName;
    });

    jQuery.ajaxSetup({ timeout: 2000 });

    var autocomplete = false;
    var resetAutocomplete = function() {
        // Fetch all participant names
        var data = jQuery('#participants_list ul li a').map(function() {
            var name = jQuery(this).text();
            if (name !== "" && name !== window.currentUserName) {
                return '@' + name;
            }
        });

        var messageInput = jQuery("#message_content");
        if (data.length > 0) {
            // Initialize or repopulate autocomplete
            if (autocomplete) {
                autocomplete.setOptions({
                    data: data
                });
            } else {
                autocomplete = messageInput.autocomplete(data, {
                    multiple: true,
                    multipleSeparator: " "
                });
            }
        } else {
            if (autocomplete) {
                autocomplete.flushCache();
            }
        }
    };

    // Autocomplete is not included in the iPhone version.
    if (typeof jQuery().autocomplete === "function") {
        resetAutocomplete();
        setInterval(resetAutocomplete, 10000);
    }

    $("input[placeholder]").placeholder();

    resizeChatLayout();
    jQuery(window).resize(resizeChatLayout);

    // Message form
    $("#new_message").submit(function(event) {
        var form = this,
            $form = $(form);

        var messageInput = $("#message_content");
        // TODO: ?
        if (messageInput.val()[0] === "/") {
            messageInput.val("");
            return false;
        }

        var message = $form.data("new-message").message;
        message.content = messageInput.val();
        message.type = "remark";
        message.created_at = new Date();

        messageInput.val("");

        NurphSocket.send(message);

        return false;
    });

    $("#message_content:enabled")
        .bind("keydown", function(event) {
            //Check if enter key was pressed (iPhone Safari sends 10 for enter key)
            if ((event.which == 13 || event.which == 10) && $(".ac_over").length == 0) {
                if ($.trim(this.value).length) {
                    $("#new_message").submit();
                }
                return false;
            }
        })
        .focus();

    // Flash notifications
    setTimeout(function() {
        jQuery("#notifier.fade").fadeOut();
    }, 5 * 1000);

    // Set sounds on or off
    jQuery("#sounds").click(function() {
        var self = jQuery(this);
        jQuery.post(self.attr("rel"), {
            enabled: self.attr("checked")
        });
    });

    function submitFormOnCheckbox(form) {
        var form = jQuery(form),
            input = form.find("input[type=checkbox]"),
            submit = form.find("input[type=submit]");

        submit.hide();

        input.change(function() {
            var method = form.attr('method'),
                url = form.attr('action'),
                data = form.serializeArray();

            jQuery.post(url, data, function() { }, "json");
        })
    }

    jQuery("#edit_sound_settings").each(function() {
        submitFormOnCheckbox(this);
    });

    // Announcements
    // (function($) {
    // var channel;
    // if ((channel = $("#chat").data("channel-name"))) {
    // var content = [
    // "Hi @" + window.currentUserName + ", <a href='http://twitter.com/home?status=Come%20chat%20with%20us%20in%20http%3A%2F%2F" + document.location.host + "%2F" + channel +".%20Nurph%20is%20Twitter%27s%20missing%20group%20feature%21' class='no-twitter-hovercard'>invite your followers</a> in to the channel",
    // "Try setting your Nurph Channel as your Twitter Bio URL and browser homepage",
    // "Tweet to your favorite Twitter Celebrities and tell them about Nurph",
    // "Have you subscribed to the <a href='http://blog." + document.location.host + "'>Nurph Blog</a>?"
    // ];
    // var data = {
    // type: "internal",
    // internal: true,
    // sender: {
    // display_name: "Nurph",
    // avatar_url: "http://a0.twimg.com/profile_images/1125127456/avatar_bigger_reasonably_small.png"
    // }
    // };

    // setTimeout(function () {
    // // First announcement after 5s
    // var message = new Message(_.extend(data, { content: content[0] }));
    // message.publish();

    // // Next every hour
    // var i = 1;
    // setInterval(function () {
    // var message = new Message(_.extend(data, { content: content[i] }));
    // message.publish();
    // i = (i < content.length - 1) ? i + 1 : 0;
    // }, 60 * 60 * 1000);
    // }, 5 * 1000);
    // }
    // })(jQuery);
});

var Message = function(options) {
    options = options || {};
    // Don't allow to overwrite Message.prototype properties
    _.each(_.keys(Message.prototype), function(property) {
        delete options[property];
    });

    var defaultOptions = {
        internal: false,
        sentByYou: false,
        classNames: []
    };

    _.extend(this, defaultOptions, options);

    this.parse();
};

Message.prototype.formatContent = function() {
    function escapeHTML(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function linkify(text) {
        return text.replace(/[a-z]+:\/\/[a-z0-9-_]+\.[a-z0-9-_:~%&\?\+#\/.=]+[^:\.,\)\s*$]/ig, function(m) {
            return '<a href="' + m + '">' + ((m.length > 100) ? m.substr(0, 24) + '...' : m) + '</a>';
        });
    }

    function blankify(text) {
        var hostWithProtocol = document.location.protocol + "//" + document.location.host;
        return jQuery("<div>").html(text).find("a:not([href^=" + hostWithProtocol + "])").each(function() {
            this.target = "_blank";
        }).end().html();
    }

    function twitterize(text) {
        return text.replace(/(^|[^\w]+)\@([a-zA-Z0-9_]{1,15}(\/[a-zA-Z0-9-_]+)*)/g, function(m, m1, m2) {
            return m1 + '@<a class="brash twitter-anywhere-user" target="_blank" href="http://twitter.com/' + m2 + '">' + m2 + '</a>';
        });
    }

    function channelize(text) {
        return text.replace(/(^|[^\w]+)#([a-zA-Z0-9_]{1,15}(\/[a-zA-Z0-9-_]+)*)/g, function(m, m1, m2) {
            return m1 + '#<a class="brash" href="/' + m2 + '">' + m2 + '</a>';
        });
    }

    if (!this.internal) this.content = linkify(escapeHTML(this.content));
    this.content = channelize(twitterize(blankify(this.content)));
};

Message.prototype.parse = function() {
    function pad(n) { return n < 10 ? '0' + n : n; }
    var created_at = this.created_at ? new Date(Date.parse(this.created_at)) : new Date();
    this.time = pad(created_at.getHours()) + ":" + pad(created_at.getMinutes());

    if (this.sentByYou) this.classNames.push("you");
    if (this.internal) this.classNames.push("internal");


    // Setup template based on message type
    switch (this.type) {
        case "internal":
            this.template = internal_template;
            this.display_name = this.sender.display_name;
            this.avatar = this.sender.avatar_url;
            break;
        case "remark":
            this.template = remark_template;
            this.display_name = this.sender.display_name;
            this.avatar = this.sender.avatar_url;
            break;
        case "event":
            this.template = event_template;
            this.display_name = this.generated_by.display_name;
            break;
        case "tweet":
            this.template = tweet_template;
            this.content = this.text;
            this.display_name = this.screenname;
            this.avatar = this.profile_pic;
            // Update the 'latest tweet' box
            // TODO: do it when "after_publish.message" event is fired
            jQuery('#channel_title p').html(this.content);
            break;
    }
    this.formatContent();

    // Mark message as a response if it contains current user name
    var strippedContent = jQuery("<div>").html(this.content).text();
    if (window.currentUserName && strippedContent.toLowerCase().indexOf(window.currentUserName.toLowerCase()) > 0) {
        this.classNames.push("response");
    }
};

Message.prototype.publish = function() {
    // No blank messages please
    if (!this.content) {
        log("log discarding blank message");
        return false;
    }
    // Just add the message if it's internal or it was just posted by the current user
    if (!this.id) {
        this.append();
    } else if (!jQuery('#message_' + this.id).length) {
        // Don't insert the message if it was posted by the current user, just update its DOM ID
        var original = jQuery("#messages tr.you:first");
        var originalSenderName = original.find("p a.brash:first").text();
        if (this.display_name === originalSenderName) {
            original.removeClass("you");
            original.attr("id", "message_" + this.id);
            // We don't have message with such ID yet, so add it
        } else {
            this.append();
        }
    }
};

Message.prototype.append = function() {
    var chat = jQuery("#chat");
    var isNearBottom = chat.isNearBottom();

    jQuery(document).trigger("before_publish.message.nurph", this);
    this.classNames = this.classNames.join(" ");
    jQuery("#messages").append(this.template, this);
    jQuery(document).trigger("after_publish.message.nurph", this);

    // Scroll chat container to the bottom if it was near it before appending the message
    if (isNearBottom) chat.get(0).scrollTop = chat.get(0).scrollHeight;

    // TODO: do it when "after_publish.message" event is fired
    // Play sound if message was posted by other user
    if (this.display_name !== window.currentUserName) {
        window.new_message_count += 1;
        var playSound = jQuery("#sounds").attr("checked");
        try {
            if (this.type === "remark" && playSound) {
                soundManager.play("click");
            }
        } catch (e) {
            log("There was an error playing the sound effects.");
        }
    }
};

// Templates for messages
var user_template = jQuery.template(
    '<li class="${participation} participant ${display_name}">' +
    '<img style="width:20px; height:20px" src="${avatar_url}" /> ' +
    '<a class="brash twitter-anywhere-user" target="_blank" href="http://twitter.com/${display_name}">${display_name}</a>' +
    '</li>'
);

var tweet_template = jQuery.template(
    '<tr id="message_${id}" class="message-record tweet ${classNames} remark">' +
    ' <td class="avatar"><a class="brash twitter-anywhere-user" target="_blank" href="http://twitter.com/${display_name}"><img width="20px" height="20px" src="${avatar}" /></a></td>' +
    ' <td class="message">' +
    ' <div class="readable">' +
    ' <p><a class="brash twitter-anywhere-user" target="_blank" href="http://twitter.com/${display_name}">${display_name}</a>: ${content}</p>' +
    ' </div>' +
    ' </td>' +
    ' <td class="time">' +
    ' ${time}' +
    ' </td>' +
    '</tr>'
);

var event_template = jQuery.template(
    '<tr id="message_${id}" class="message-record ${classNames} event">' +
    ' <td class="avatar"></td><td class="message"><div class="readable"><p>' +
    ' <a class="brash twitter-anywhere-user" target="_blank" href="http://twitter.com/${display_name}">${display_name}</a> ${content}</p></div></td>' +
    ' <td class="time">' +
    ' ${time}' +
    ' </td>' +
    '</tr>'
);

var remark_template = jQuery.template(
    '<tr id="message_${id}" class="message-record ${classNames} remark">' +
    ' <td class="avatar"><a class="brash twitter-anywhere-user" target="_blank" href="http://twitter.com/${display_name}"><img width="22px" height="22px" src="${avatar}" /></a></td>' +
    ' <td class="message">' +
    ' <div class="readable">' +
    ' <p><a class="brash twitter-anywhere-user" target="_blank" href="http://twitter.com/${display_name}">${display_name}</a>: ${content}</p>' +
    ' </div>' +
    ' </td>' +
    ' <td class="time">' +
    ' ${time}' +
    ' </td>' +
    '</tr>'
);

var internal_template = jQuery.template(
    '<tr class="message-record ${classNames}">' +
    ' <td class="avatar"><a class="brash twitter-anywhere-user" target="_blank" href="http://twitter.com/${display_name}"><img width="22px" height="22px" src="${avatar}" /></a></td>' +
    ' <td class="message">' +
    ' <div class="readable">' +
    ' <p><a class="brash twitter-anywhere-user" target="_blank" href="http://twitter.com/${display_name}">${display_name}</a>: ${content}</p>' +
    ' </div>' +
    ' </td>' +
    ' <td class="time">' +
    ' ${time}' +
    ' </td>' +
    '</tr>'
);

function userLoggedOn(T) {
    console.log('T is connected')
    currentUserName = T.currentUser.data('screen_name');
    currentUserPic = T.currentUser.data('profile_image_url');
    console.log(currentUserName + ' ' + currentUserPic);
    if (NurphSocket.channel) {
        NurphSocket.channel.memberInfo({ name: currentUserName, profilePic: currentUserPic });
    }
}

//if the currentUserName variable is set via the html page
//then just use that, if it is not specified then have the user log in
if (!currentUserName) {
    twttr.anywhere(function(T) {
        console.log('got T callback')
        if (T.isConnected()) {
            userLoggedOn(T);
        } else {
            T.bind("authComplete", function(e, user) {
                userLoggedOn(T);
            });
            T("#login").connectButton();
        }
    });
}

var NurphSocket = {
    url: '',
    channelName: '',
    channel_id: '',
    user_id: false,
    xstreamly: null,
    channel: null,
    initialize: function(url, channelName, channel_id, user_id) {
        if (document.location.hash == '#debug') {
            this.showDebug();
        }

        this.channel_id = channel_id;
        this.url = url;
        this.channelName = channelName;
        this.user_id = user_id;

        init_channel();

        $(window).bind('beforeunload', function() {
            try {
                if (NurphSocket.channel.presenceChannel.members.count === 1) {
                    //we are the only one in the channel so we should send a message that we are leaving
                    NurphSocket.send({
                        content: "has left the channel",
                        type: 'event',
                        generated_by: {
                            display_name: currentUserName
                        },
                        created_at: new Date()
                    });
                }
            }
            catch (ex) {
                log(ex);
            }
        });

        // Set twitter-anywhere-user classes to Twitter links, and update the document title.
        // TODO: don't run it every 0.5s - set the class manually instead
        /*setInterval(function() {
        update_document_title_if_idle();
        jQuery("a[href^=http://twitter.com/]").not(".twitter-anywhere-user").not(".no-twitter-hovercard").addClass("twitter-anywhere-user");
        }, 500);*/

        var loaded = false;
        var initialMessages = [];
        //XStreamly.port = 444;
        this.xstreamly = new XStreamly('1183738a-fa9b-4f83-8594-407fa27c2e7b', '2176a6e7-cfe6-4e63-bee5-41d30739c438');
        this.channel = this.xstreamly.subscribe((currentEnvironment + '-' + channelName), {
            userInfo: {
                name: currentUserName,
                profilePic: currentUserPic
            },
            includePersistedMessages: true,
            subscriptionLoaded: function() {
                loaded = true;
                initialMessages.sort(function(a, b) {
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                });
                if (initialMessages.length > 10) {
                    insert_messages(initialMessages.slice(initialMessages.length - 10, initialMessages.length - 1));
                } else if (initialMessages.length > 0) {
                    insert_messages(initialMessages);
                }
                initialMessages = [];
            }
        });

        this.xstreamly.onActive(function() {
            $('.message-record').remove();
        });

        this.channel.bind('xstreamly:subscription_succeeded', function(members) {
            members.each(NurphSocket.addParticipant);
            //only send notification for users that are logged in
            if (currentUserName) {
                NurphSocket.send({
                    content: "has entered the channel",
                    type: 'event',
                    generated_by: {
                        display_name: currentUserName
                    },
                    created_at: new Date()
                });
            }
        });

        this.channel.bind('xstreamly:member_added', this.addParticipant);
        this.channel.bind('xstreamly:member_removed', this.removeParticipant);
        this.channel.bind('xstreamly:member_modified', this.participantModified);

        this.channel.bind_all(function(eventType, remark) {
            if (eventType === 'tweet') {
                remark.type = 'tweet';
            }

            if (!remark.type) {
                return;
            }

            //we want to save all the inital messages
            //so they can be layed out correctly.
            if (loaded) {
                insert_messages(remark);
            } else {
                initialMessages.push(remark);
            }
        });

    },
    addParticipant: function(participant) {
        var name = participant.memberInfo.name;
        var pic = participant.memberInfo.profilePic;
        $('#currently-online-count').text(NurphSocket.channel.presenceChannel.members.count);

        var data;

        if (name) {
            data = '<a href="http://twitter.com/' + name + '" title="' + name + '"><img alt="' + name + '" height="20" src="' + pic + '" width="20" /></a>' +
            '<a href="http://twitter.com/' + name + '" class="brash">' + name + '</a>';
        }
        else {
            data = 'Anonymous'
        }

        $('#channel_contributors').append($('<li id="participant-' + participant.id + '" class="participant">' +
            data +
            '</li>'));
    },
    participantModified: function(participant) {
        var name = participant.memberInfo.name;
        var pic = participant.memberInfo.profilePic;
        $('#participant-' + participant.id).html('<a href="http://twitter.com/' + name + '" title="' + name + '"><img alt="' + name + '" height="20" src="' + pic + '" width="20" /></a>' +
            '<a href="http://twitter.com/' + name + '" class="brash">' + name + '</a>');
    },
    removeParticipant: function(participant) {
        $("#participant-" + participant.id).remove();
        $('#currently-online-count').text(NurphSocket.channel.presenceChannel.members.count);
        if (NurphSocket.isAuthoritiveClient()) {
            //only send notifications for users that are logged in
            if (participant.memberInfo.name) {
                NurphSocket.send({
                    content: "has left the channel",
                    type: 'event',
                    generated_by: {
                        display_name: participant.memberInfo.name
                    },
                    created_at: new Date()
                });
            }
        }
    },
    //we want to only publish shared events (like out side tweets and enter exit messgages)
    //once so we nee to pick one client in the room to do it. The method is to pick
    //the client with the lowest member ID
    isAuthoritiveClient: function() {
        var myId = NurphSocket.channel.presenceChannel.memberId;
        var amAuthority = true;
        NurphSocket.channel.presenceChannel.members.each(function(member) {
            if (member.id < myId) {
                amAuthority = false;
            }
        });
        return amAuthority;
    },
    updateDebug: function() {
        var html;

        if (NurphSocket.socket && NurphSocket.socket.transport) {
            // Socket enabled
            html = 'Socket connected: ' + NurphSocket.socket.connected + ' <br />';
            html += 'Transport: ' + NurphSocket.socket.transport.type + ' <br />';
            html += 'Transport connected: ' + NurphSocket.socket.transport.connected + ' <br />';
            html += 'Unread: ' + window.new_message_count;
        } else {
            // Polling instead
            html = "Polling mode!";
        }

        jQuery('#debug').html(html);
    },

    showDebug: function() {
        var div = jQuery('<div id="debug" />').css({
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'white',
            padding: '10px'
        });
        jQuery('body').append(div);
        setInterval(NurphSocket.updateDebug, 1000);
    },
    send: function(message) {
        //put messages from me straight in the DOM
        insert_messages(message);
        this.channel.trigger(message.type, message, true);

        try {
            if (message.type === "remark") {
                this.postToNurphServer(message);
            }
        }
        catch (ex) {
            log('could not write to NURPH');
        }
    },
    postToNurphServer: function(message) {
        $.post(this.url + this.channelName + '/messages', { message: message }, function() {
            log('done sending message to nurph');
        }, "json");
    },
    disconnect: function() {
        log("Shutting down the socket");
        this.xstreamly.stop();
    }
};

// Generic logging function
window.log = function(message) {
    if (typeof console != 'undefined' && document.location.hash == '#debug') {
        console.log(message);
    }
};

function insert_messages(data) {
    // Ensure we're getting an array
    if (!_.isArray(data)) data = [data];

    jQuery.each(data, function(key, message) {
        new Message(message).publish();
    });

    update_document_title_if_idle();
    return true;
}

var resizeChatLayout = function() {
    jQuery("body:not(.iphone) #chat").css("height", jQuery(window).height() - 300);

    // Scroll chat window to bottom
    var chat = jQuery("#chat").get(0);
    if (chat) chat.scrollTop = chat.scrollHeight;

    jQuery("body:not(.iphone) #front").css("height", jQuery("#content").height());
    jQuery("body:not(.iphone) #channel_contributors").css("height", jQuery("#content").height() - 167);
};

var resizeParticipants = function() {
    jQuery("body:not(.iphone) #channel_contributors").css("height", jQuery("#content").height() - 187);
};

// Returns the ID of the most recent message on the conversation page.
function last_message_id() {
    var container = $("#messages");
    var last_id = container.find("tr:not(.you, .internal):last").attr("id");

    if (last_id) {
        return last_id.replace(/\D*/, "");
    } else {
        return container.data("last-message-id");
    }
}

// TODO
// The document.attribute methods have been duplicated on to parent.document.attributes
// to create DOM updates across both. Can we refactor this so that document and parent.document
// receive the same updates without having to specify both of them each time?
// The update_document_title_if_idle function has also been affected by this.

function init_channel() {
    document.title_was = document.title;
    window.parent.document.title_was = parent.document.title;
    window.new_message_count = 0;
    window.parent.window.new_message_count = 0;

    // Added by Elliott for jQuerification.
    jQuery(window).blur(function() {
        window.isIdle = true;
        window.new_message_count = 0;
        update_document_title_if_idle();
    }).focus(function() {
        jQuery('#message_content').focus();
        window.isIdle = false;
        window.new_message_count = 0;
        update_document_title_if_idle();
    });
}

function update_new_message_count(count) {
    window.new_message_count += count;
}

function update_document_title_if_idle() {
    if (window.isIdle && window.new_message_count > 0) {
        document.title = "(" + window.new_message_count + ") " + document.title_was;
        window.parent.document.title = "(" + window.new_message_count + ") " + parent.document.title_was;
    } else {
        document.title = document.title_was;
    }
}
(function($) {
    $.fn.isNearBottom = function() {
        var threshold = 10;
        return (this.attr("scrollTop") + this.attr("offsetHeight") + threshold) >= this.attr("scrollHeight");
    };
})(jQuery);