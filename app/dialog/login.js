define(['jquery-ui/jquery-ui.min'], function(require) {
    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i=0; i<ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1);
            if (c.indexOf(name) != -1) return c.substring(name.length,c.length);
        }
        return "";
    }

    var loginDialog = function(user) {
        //create buttons
        $("#login").button().on('click', function(e) {
            e.preventDefault();
            user.login($("#username").val(), $("#password").val());
        });

        $("#cantLogin").button().on('click', function(e) {
            e.preventDefault();
        }).hide();

        $("#createAccount").button().on('click', function(e) {
            e.preventDefault();
            user.create($("#ca_username").val(), $("#ca_password").val(), $("#ca_confirm").val());
        });

        $("#newAccount").button().on('click', function(e) {
            e.preventDefault();
            $("#loginBox").dialog("close");
            $("#createAccountBox").dialog("open");
        });

        //create dialogs
        $("#loginBox").dialog({
            autoOpen: false,
            closeOnEscape: false,
            title: "Login",
            dialogClass: "no-close"
        });

        $("#createAccountBox").dialog({
            autoOpen: false,
            closeOnEscape: false,
            title: "Create Account",
            dialogClass: "no-close"
        });

        //Open Login Dialog
        var oldUser, oldPw;
        if (oldUser = getCookie('username')) {
            $("#username").val(oldUser);
            if (oldPw = getCookie('password')) {
                user.login(oldUser, oldPw, true);
            }
        } else {
          $("#loginBox").dialog('open');
        }

    };

    return loginDialog;
});
