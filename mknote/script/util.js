(function() {
    String.prototype.replaceTemplate = function(ary) {
        if (!ary) return this;

        var str = this;
        if (!(ary instanceof Array)) {
            ary = [ary];
        }

        for (var i = 0; i < ary.length; i++) {
            var content = ary[i];
            if (content == undefined) continue;

            var reg = new RegExp('\\{' + i + '\\}', 'g')
            str = str.replace(reg, ary[i]);
        }
        return str;
    }

    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    String.createGuid = function() {
        return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
    }



    Array.prototype.removeAt = function(index) {
        return this.slice(0, index).concat(this.slice(++index));
    }

    var MkUtil;
    window.MkUtil = MkUtil = {};
    MkUtil.parseWebDomain = function(url) {
        url = url.replace(/.*\:\/\//, '');
        var urlAry = url.split('/');

        if (urlAry.length == 0) return '';
        url = urlAry[0];

        var dotAry = url.split('.');
        if (dotAry.length == 0 || dotAry.length == 1) return '';

        url = dotAry[dotAry.length - 2] + '.' + dotAry[dotAry.length - 1];
        return url;
    }
})()